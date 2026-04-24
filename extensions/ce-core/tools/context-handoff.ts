import { mkdir, readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { normalizeSlug } from "../utils/name-utils"

export type ContextHealth = "good" | "watch" | "heavy" | "critical"

export interface ContextHandoffInput {
  operation: "save" | "load" | "latest" | "status"
  repoRoot: string
  currentStage?: string
  nextStage?: string
  contextHealth?: ContextHealth
  activeFiles?: string[]
  blocker?: string
  verification?: string
  artifacts?: Record<string, string | undefined>
  handoffMarkdown?: string
  handoffPath?: string
}

export interface ContextStateEntry {
  currentStage: string
  nextStage?: string
  contextHealth: ContextHealth
  latestHandoffPath?: string
  latestDatedHandoffPath?: string
  activeFiles: string[]
  blocker?: string
  verification?: string
  artifacts: Record<string, string | undefined>
  recommendNewSession: boolean
  updatedAt: string
}

export interface ContextHandoffResult {
  operation: string
  found?: boolean
  path?: string
  latestPath?: string
  currentStage?: string
  nextStage?: string
  contextHealth?: ContextHealth
  activeFiles?: string[]
  blocker?: string
  verification?: string
  artifacts?: Record<string, string | undefined>
  recommendNewSession?: boolean
  handoffMarkdown?: string
  updatedAt?: string
}

function ceDir(repoRoot: string): string {
  return path.join(repoRoot, ".context", "compound-engineering")
}

function handoffDir(repoRoot: string): string {
  return path.join(ceDir(repoRoot), "handoffs")
}

function stateFilePath(repoRoot: string): string {
  return path.join(ceDir(repoRoot), "context-state.json")
}

function latestHandoffPath(repoRoot: string): string {
  return path.join(handoffDir(repoRoot), "latest.md")
}

function toRepoRelative(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath)
}

function resolveRepoPath(repoRoot: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath)
}

function stageSlug(value?: string): string {
  if (!value || value.trim().length === 0) return "unknown"
  return normalizeSlug(value)
}

function buildDatedHandoffPath(repoRoot: string, currentStage?: string, nextStage?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const fileName = `${timestamp}-${stageSlug(currentStage)}-to-${stageSlug(nextStage)}.md`
  return path.join(handoffDir(repoRoot), fileName)
}

function computeRecommendNewSession(currentStage?: string, nextStage?: string, contextHealth: ContextHealth = "watch"): boolean {
  const isCrossPhase = Boolean(currentStage && nextStage && currentStage !== nextStage)
  const isHeavy = contextHealth === "heavy" || contextHealth === "critical"
  return isCrossPhase && isHeavy
}

function formatBullets(items: string[]): string {
  if (items.length === 0) return "- N/A"
  return items.map(item => `- ${item}`).join("\n")
}

function formatArtifacts(artifacts: Record<string, string | undefined>): string {
  const lines = Object.entries(artifacts)
    .filter(([, value]) => Boolean(value && value.trim().length > 0))
    .map(([key, value]) => `- ${key}: ${value}`)

  if (lines.length === 0) return "- N/A"
  return lines.join("\n")
}

function buildDefaultHandoffMarkdown(input: {
  currentStage: string
  nextStage?: string
  activeFiles: string[]
  artifacts: Record<string, string | undefined>
  blocker?: string
  verification?: string
}): string {
  const currentTask = input.nextStage
    ? `Continue from ${input.currentStage} to ${input.nextStage}.`
    : `Continue ${input.currentStage}.`

  const hotContext = formatBullets(input.activeFiles.slice(0, 5))

  const verifiedFacts = formatBullets([
    `Current stage: ${input.currentStage}`,
    `Next stage: ${input.nextStage ?? "N/A"}`,
  ])

  const activeFiles = formatBullets(input.activeFiles.slice(0, 5))
  const artifacts = formatArtifacts(input.artifacts)
  const blocker = input.blocker ?? "N/A"
  const verification = input.verification ?? "Not run"
  const nextMinimalStep = input.nextStage ? `/skill:${input.nextStage}` : "N/A"

  return [
    "## Current Task",
    currentTask,
    "",
    "## Hot Context",
    hotContext,
    "",
    "## Verified Facts",
    verifiedFacts,
    "",
    "## Active Files",
    activeFiles,
    "",
    "## Artifacts",
    artifacts,
    "",
    "## Current Blocker",
    `- ${blocker}`,
    "",
    "## Verification",
    `- ${verification}`,
    "",
    "## Do Not Repeat",
    "- Do not reload full history unless the handoff lacks required evidence.",
    "",
    "## Next Minimal Step",
    `- ${nextMinimalStep}`,
    "",
  ].join("\n")
}

async function readState(repoRoot: string): Promise<ContextStateEntry | null> {
  const filePath = stateFilePath(repoRoot)
  if (!existsSync(filePath)) return null

  try {
    const content = await readFile(filePath, "utf8")
    return JSON.parse(content) as ContextStateEntry
  } catch {
    return null
  }
}

async function writeState(repoRoot: string, state: ContextStateEntry): Promise<void> {
  const filePath = stateFilePath(repoRoot)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8")
}

export function createContextHandoffTool() {
  return {
    name: "context_handoff",
    async execute(input: ContextHandoffInput): Promise<ContextHandoffResult> {
      switch (input.operation) {
        case "save":
          return save(input)
        case "load":
          return load(input)
        case "latest":
          return latest(input)
        case "status":
          return status(input)
        default:
          throw new Error(`Unknown operation: ${input.operation}`)
      }
    },
  }
}

async function save(input: ContextHandoffInput): Promise<ContextHandoffResult> {
  const currentStage = input.currentStage ?? "unknown"
  const nextStage = input.nextStage
  const contextHealth = input.contextHealth ?? "watch"
  const activeFiles = input.activeFiles ?? []
  const blocker = input.blocker
  const verification = input.verification
  const artifacts = input.artifacts ?? {}
  const handoffMarkdown = input.handoffMarkdown?.trim().length
    ? input.handoffMarkdown
    : buildDefaultHandoffMarkdown({
      currentStage,
      nextStage,
      activeFiles,
      artifacts,
      blocker,
      verification,
    })

  const recommendNewSession = computeRecommendNewSession(currentStage, nextStage, contextHealth)
  const latestPath = latestHandoffPath(input.repoRoot)
  const datedPath = buildDatedHandoffPath(input.repoRoot, currentStage, nextStage)
  const relativeLatestPath = toRepoRelative(input.repoRoot, latestPath)
  const relativeDatedPath = toRepoRelative(input.repoRoot, datedPath)

  await mkdir(path.dirname(latestPath), { recursive: true })
  await writeFile(latestPath, handoffMarkdown, "utf8")
  await writeFile(datedPath, handoffMarkdown, "utf8")

  const state: ContextStateEntry = {
    currentStage,
    nextStage,
    contextHealth,
    latestHandoffPath: relativeLatestPath,
    latestDatedHandoffPath: relativeDatedPath,
    activeFiles,
    blocker,
    verification,
    artifacts,
    recommendNewSession,
    updatedAt: new Date().toISOString(),
  }

  await writeState(input.repoRoot, state)

  return {
    operation: "save",
    found: true,
    path: relativeDatedPath,
    latestPath: relativeLatestPath,
    currentStage,
    nextStage,
    contextHealth,
    activeFiles,
    blocker,
    verification,
    artifacts,
    recommendNewSession,
    updatedAt: state.updatedAt,
  }
}

async function load(input: ContextHandoffInput): Promise<ContextHandoffResult> {
  const state = await readState(input.repoRoot)
  if (!state) {
    return {
      operation: "load",
      found: false,
      contextHealth: "watch",
      recommendNewSession: false,
    }
  }

  const targetPath = input.handoffPath ?? state.latestHandoffPath ?? latestHandoffPath(input.repoRoot)
  const absoluteTargetPath = resolveRepoPath(input.repoRoot, targetPath)
  let markdown = ""
  if (existsSync(absoluteTargetPath)) {
    markdown = await readFile(absoluteTargetPath, "utf8")
  }

  return {
    operation: "load",
    found: true,
    path: targetPath,
    latestPath: state.latestHandoffPath,
    currentStage: state.currentStage,
    nextStage: state.nextStage,
    contextHealth: state.contextHealth,
    activeFiles: state.activeFiles,
    blocker: state.blocker,
    verification: state.verification,
    artifacts: state.artifacts,
    recommendNewSession: state.recommendNewSession,
    handoffMarkdown: markdown,
    updatedAt: state.updatedAt,
  }
}

async function latest(input: ContextHandoffInput): Promise<ContextHandoffResult> {
  const state = await readState(input.repoRoot)
  if (!state || !state.latestHandoffPath) {
    return {
      operation: "latest",
      found: false,
      contextHealth: "watch",
      recommendNewSession: false,
    }
  }

  return {
    operation: "latest",
    found: true,
    path: state.latestDatedHandoffPath,
    latestPath: state.latestHandoffPath,
    currentStage: state.currentStage,
    nextStage: state.nextStage,
    contextHealth: state.contextHealth,
    activeFiles: state.activeFiles,
    blocker: state.blocker,
    verification: state.verification,
    artifacts: state.artifacts,
    recommendNewSession: state.recommendNewSession,
    updatedAt: state.updatedAt,
  }
}

async function status(input: ContextHandoffInput): Promise<ContextHandoffResult> {
  const state = await readState(input.repoRoot)

  if (!state) {
    return {
      operation: "status",
      found: false,
      contextHealth: "watch",
      recommendNewSession: false,
      activeFiles: [],
      artifacts: {},
    }
  }

  return {
    operation: "status",
    found: true,
    path: state.latestDatedHandoffPath,
    latestPath: state.latestHandoffPath,
    currentStage: state.currentStage,
    nextStage: state.nextStage,
    contextHealth: state.contextHealth,
    activeFiles: state.activeFiles,
    blocker: state.blocker,
    verification: state.verification,
    artifacts: state.artifacts,
    recommendNewSession: state.recommendNewSession,
    updatedAt: state.updatedAt,
  }
}
