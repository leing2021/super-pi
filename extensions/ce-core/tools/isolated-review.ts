import { spawn as nodeSpawn } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

export type SpawnErrorCode = "cli_not_found" | "version" | "timeout" | "child_failed"

export interface ReviewChildProcess {
  stdout: { on(event: "data", cb: (chunk: string) => void): void }
  stderr: { on(event: "data", cb: (chunk: string) => void): void }
  on(event: "exit", cb: (code: number | null) => void): void
  kill(): void
  killed: boolean
}

export type SpawnFn = (
  command: string,
  args: string[],
  options: { cwd: string },
) => ReviewChildProcess

export type VersionProbe = (command: string) => Promise<string | null>

export interface IsolatedReviewInput {
  repoRoot: string
  diffBase: string
  findingsPath: string
  promptTemplate: string
  timeoutMs?: number
  incremental?: { previousFindingsPath: string }
}

export interface IsolatedReviewDeps {
  spawnFn: SpawnFn
  probeCliVersion: VersionProbe
}

export type IsolatedReviewResult =
  | {
      status: "completed"
      isolation: "isolated"
      findingsPath: string
      findingsWritten: boolean
      reviewerOutput: string
      stderrTail: string
    }
  | {
      status: "degraded"
      isolation: "degraded"
      findingsPath: string
      findingsWritten: true
      spawnError: SpawnErrorCode
    }
  | { status: "aborted"; isolation: "aborted"; findingsPath: string }

const MIN_PI_VERSION = { major: 0, minor: 85 }
const DEFAULT_TIMEOUT_MS = 600_000
const TIMEOUT_RETRIES = 1

interface ParsedVersion {
  major: number
  minor: number
}

function parseVersion(raw: string): ParsedVersion | null {
  const match = /^(\d+)\.(\d+)\./.exec(raw.trim())
  if (!match) return null
  return { major: Number(match[1]), minor: Number(match[2]) }
}

function meetsMinimum(version: ParsedVersion): boolean {
  if (version.major !== MIN_PI_VERSION.major) return version.major > MIN_PI_VERSION.major
  return version.minor >= MIN_PI_VERSION.minor
}

export function extractAssistantText(lines: string[]): string | null {
  let last: string | null = null
  for (const line of lines) {
    let event: { type?: string; message?: { role?: string; content?: Array<{ type?: string; text?: string }> } }
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    if (event?.type !== "message_end" || event.message?.role !== "assistant") continue
    const text = (event.message.content ?? [])
      .filter((block) => block?.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("")
    if (text.length > 0) last = text
  }
  return last
}

export function buildReviewPrompt(input: IsolatedReviewInput): string {
  const prompt = [input.promptTemplate, `Repo root: ${input.repoRoot}`, `Diff base: ${input.diffBase}`, `Write findings to: ${input.findingsPath}`]
  if (input.incremental) {
    prompt.push(
      "This is an incremental re-review:",
      `- Previous findings: ${input.incremental.previousFindingsPath} (read first)`,
      "- Review only the fix diff against these previous findings; do not re-review the full codebase",
    )
  }
  return prompt.join("\n")
}

function degradedFindingsContent(spawnError: SpawnErrorCode, input: IsolatedReviewInput, detail?: string): string {
  return [
    "---",
    "isolation: degraded",
    `spawn_error: ${spawnError}`,
    "---",
    "",
    "# Review findings (degraded)",
    "",
    `Isolated review could not run (spawn_error: ${spawnError}${detail ? `: ${detail}` : ""}).`,
    "The main session must execute the 04-review workflow in-session instead,",
    "and keep the degraded marking in its findings output.",
    "",
    `Repo root: ${input.repoRoot}`,
    `Diff base: ${input.diffBase}`,
  ].join("\n")
}

async function waitForExit(child: ReviewChildProcess, timeoutMs: number): Promise<{ timedOut: boolean; code: number | null }> {
  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill()
      resolve({ timedOut: true, code: null })
    }, timeoutMs)
    child.on("exit", (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ timedOut: false, code })
    })
  })
}

const STDERR_TAIL_BYTES = 2048

function collectStderrTail(child: ReviewChildProcess): { tail: () => string } {
  let tail = ""
  child.stderr.on("data", (chunk) => {
    tail = (tail + chunk).slice(-STDERR_TAIL_BYTES)
  })
  return { tail: () => tail }
}

function collectOutput(child: ReviewChildProcess, onLine: (line: string) => void): void {
  let buffer = ""
  child.stdout.on("data", (chunk) => {
    buffer += chunk
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) onLine(line)
  })
}

export const defaultSpawnFn: SpawnFn = (command, args, options) => {
  const child = nodeSpawn(command, args, { cwd: options.cwd, stdio: ["ignore", "pipe", "pipe"] })
  const wrapped: ReviewChildProcess = {
    stdout: { on: (event, cb) => child.stdout?.on(event, cb) },
    stderr: { on: (event, cb) => child.stderr?.on(event, cb) },
    on: (event, cb) => child.on(event, cb),
    kill: () => child.kill(),
    killed: child.killed ?? false,
  }
  return wrapped
}

export const defaultVersionProbe: VersionProbe = async (command) => {
  const child = defaultSpawnFn(command, ["--version"], { cwd: process.cwd() })
  let output = ""
  child.stdout.on("data", (chunk) => {
    output += chunk
  })
  const { code } = await waitForExit(child, 5_000)
  if (code !== 0) return null
  return output.trim() || null
}

function wrapSpawnError(error: unknown): SpawnErrorCode | null {
  if (error && typeof error === "object" && (error as NodeJS.ErrnoException).code === "ENOENT") {
    return "cli_not_found"
  }
  return null
}

function promptArgs(prompt: string): string[] {
  return ["--mode", "json", "--no-session", "-p", prompt]
}

async function runOnce(
  input: IsolatedReviewInput,
  deps: IsolatedReviewDeps,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<{ outcome: "completed" | "timeout" | "enoent" | "child_failed" | "aborted"; output: string | null; stderrTail: string }> {
  const prompt = buildReviewPrompt(input)
  let child: ReviewChildProcess
  try {
    child = deps.spawnFn("pi", promptArgs(prompt), { cwd: input.repoRoot })
  } catch (error) {
    if (wrapSpawnError(error)) return { outcome: "enoent", output: null, stderrTail: "" }
    throw error
  }
  const lines: string[] = []
  const stderr = collectStderrTail(child)
  collectOutput(child, (line) => lines.push(line))
  const onAbort = () => child.kill()
  signal?.addEventListener("abort", onAbort)
  try {
    const { timedOut, code } = await waitForExit(child, timeoutMs)
    if (signal?.aborted) return { outcome: "aborted", output: null, stderrTail: stderr.tail() }
    if (timedOut) return { outcome: "timeout", output: null, stderrTail: stderr.tail() }
    if (code !== 0) return { outcome: "child_failed", output: null, stderrTail: `exited with code ${code}\n${stderr.tail()}` }
    return { outcome: "completed", output: extractAssistantText(lines), stderrTail: stderr.tail() }
  } finally {
    signal?.removeEventListener("abort", onAbort)
  }
}

export async function runIsolatedReview(
  input: IsolatedReviewInput,
  deps?: Partial<IsolatedReviewDeps>,
  signal?: AbortSignal,
): Promise<IsolatedReviewResult> {
  const resolvedDeps: IsolatedReviewDeps = {
    spawnFn: deps?.spawnFn ?? defaultSpawnFn,
    probeCliVersion: deps?.probeCliVersion ?? defaultVersionProbe,
  }
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const version = await resolvedDeps.probeCliVersion("pi")
  if (version === null) {
    writeFileSync(input.findingsPath, degradedFindingsContent("cli_not_found", input))
    return { status: "degraded", isolation: "degraded", findingsPath: input.findingsPath, findingsWritten: true, spawnError: "cli_not_found" }
  }
  const parsed = parseVersion(version)
  if (!parsed || !meetsMinimum(parsed)) {
    writeFileSync(input.findingsPath, degradedFindingsContent("version", input))
    return { status: "degraded", isolation: "degraded", findingsPath: input.findingsPath, findingsWritten: true, spawnError: "version" }
  }

  let lastStderrTail = ""
  for (let attempt = 0; attempt <= TIMEOUT_RETRIES; attempt++) {
    const { outcome, output, stderrTail } = await runOnce(input, resolvedDeps, signal, timeoutMs)
    if (outcome !== "timeout") lastStderrTail = stderrTail
    if (outcome === "aborted") {
      return { status: "aborted", isolation: "aborted", findingsPath: input.findingsPath }
    }
    if (outcome === "enoent") {
      writeFileSync(input.findingsPath, degradedFindingsContent("cli_not_found", input))
      return { status: "degraded", isolation: "degraded", findingsPath: input.findingsPath, findingsWritten: true, spawnError: "cli_not_found" }
    }
    if (outcome === "child_failed") {
      writeFileSync(input.findingsPath, degradedFindingsContent("child_failed", input, stderrTail))
      return { status: "degraded", isolation: "degraded", findingsPath: input.findingsPath, findingsWritten: true, spawnError: "child_failed" }
    }
    if (outcome === "timeout") {
      lastStderrTail = stderrTail
      continue
    }
    return {
      status: "completed",
      isolation: "isolated",
      findingsPath: input.findingsPath,
      findingsWritten: existsSync(input.findingsPath),
      reviewerOutput: output ?? "",
      stderrTail,
    }
  }

  writeFileSync(input.findingsPath, degradedFindingsContent("timeout", input, lastStderrTail || undefined))
  return { status: "degraded", isolation: "degraded", findingsPath: input.findingsPath, findingsWritten: true, spawnError: "timeout" }
}

export function degradedSummary(result: IsolatedReviewResult): string {
  if (result.status !== "degraded") return ""
  return `isolated_review degraded (${result.spawnError}); findings at ${path.resolve(result.findingsPath)}; run 04-review in-session`
}

const FALLBACK_PROMPT = [
  "You are an isolated code reviewer spawned in a fresh session.",
  "Constraints: review only — do NOT fix code; write findings to the path given below; do NOT chain into 05-learn or any other skill.",
].join("\n")

export const DEFAULT_PROMPT_ASSET_RELATIVE_PATH = "skills/04-review/assets/isolated-reviewer-prompt.md"

/** Packaged asset location resolved relative to THIS module, not repoRoot:
 * super-pi ships as an npm package, so `skills/` only exists inside the package
 * install dir. Resolving against the consumer's repoRoot would always miss and
 * silently collapse the reviewer to the 2-line fallback (review round-1 HIGH-1). */
const PACKAGED_PROMPT_ASSET = path.resolve(
  import.meta.dirname,
  "../../../",
  DEFAULT_PROMPT_ASSET_RELATIVE_PATH,
)

export interface PromptTemplate {
  template: string
  source: "asset" | "override" | "fallback"
}

export function loadPromptTemplate(repoRoot: string, promptPath?: string): PromptTemplate {
  if (promptPath) {
    // Relative prompt paths resolve against repoRoot (the review target), not cwd
    const resolved = path.isAbsolute(promptPath) ? promptPath : path.resolve(repoRoot, promptPath)
    if (existsSync(resolved)) return { template: readFileSync(resolved, "utf8"), source: "override" }
    return { template: FALLBACK_PROMPT, source: "fallback" }
  }
  if (existsSync(PACKAGED_PROMPT_ASSET)) {
    return { template: readFileSync(PACKAGED_PROMPT_ASSET, "utf8"), source: "asset" }
  }
  return { template: FALLBACK_PROMPT, source: "fallback" }
}

export interface IsolatedReviewToolInput {
  repoRoot: string
  diffBase: string
  findingsPath: string
  promptPath?: string
  incrementalPreviousFindingsPath?: string
  timeoutMs?: number
}

export function createIsolatedReviewTool() {
  return {
    name: "isolated_review" as const,
    async execute(input: IsolatedReviewToolInput, signal?: AbortSignal): Promise<IsolatedReviewResult & { summary: string; promptSource: string }> {
      const prompt = loadPromptTemplate(input.repoRoot, input.promptPath)
      const result = await runIsolatedReview(
        {
          repoRoot: input.repoRoot,
          diffBase: input.diffBase,
          findingsPath: input.findingsPath,
          promptTemplate: prompt.template,
          timeoutMs: input.timeoutMs,
          incremental: input.incrementalPreviousFindingsPath
            ? { previousFindingsPath: input.incrementalPreviousFindingsPath }
            : undefined,
        },
        undefined,
        signal,
      )
      const summary =
        result.status === "completed"
          ? `isolated review completed (prompt: ${prompt.source}); findings at ${result.findingsPath} (written: ${result.findingsWritten})`
          : result.status === "aborted"
            ? `isolated review aborted; findings path ${result.findingsPath}`
            : degradedSummary(result)
      return { ...result, summary, promptSource: prompt.source }
    },
  }
}
