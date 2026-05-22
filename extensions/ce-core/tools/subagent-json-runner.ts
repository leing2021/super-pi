/**
 * Spawn-based JSON runner for ce_subagent / ce_parallel_subagent.
 *
 * Spawns `pi --mode json --no-session ... -p <prompt>`, parses stdout
 * JSON events in real-time, and triggers an onUpdate callback for
 * live TUI progress.
 *
 * Key design decisions:
 *   - Per-process env via spawn options, NO global process.env mutation.
 *   - Injectable spawnFactory for testing.
 *   - AbortSignal support for Ctrl+C cancellation.
 */

import { type ChildProcess, spawn } from "node:child_process"
import {
  type SingleResult,
  parseJsonEvent,
  applyEventToResult,
  makeInitialResult,
} from "./subagent-events"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpawnInput {
  cwd?: string
  env?: Record<string, string | undefined>
  stdio?: any
  shell?: boolean
}

export type SpawnFactory = (
  command: string,
  args: string[],
  options: SpawnInput,
) => ChildProcessLike

export interface ChildProcessLike {
  stdout: { on(event: string, cb: (data: Buffer) => void): void }
  stderr: { on(event: string, cb: (data: Buffer) => void): void }
  on(event: string, cb: (code: number) => void): void
  on(event: string, cb: () => void): void
  kill(signal?: string): void
  readonly killed: boolean
}

export interface JsonRunnerOptions {
  /** Override spawn for testing. Defaults to real child_process.spawn */
  spawnFactory?: SpawnFactory
}

export interface JsonRunConfig {
  prompt: string
  agent: string
  task: string
  cwd: string
  step?: number
  extraFlags?: string[]
  extraEnv?: Record<string, string>
  signal?: AbortSignal
  onUpdate?: (partial: SingleResult) => void
}

// ---------------------------------------------------------------------------
// Default spawn factory
// ---------------------------------------------------------------------------

const realSpawn: SpawnFactory = (
  command: string,
  args: string[],
  options: SpawnInput,
): ChildProcessLike => {
  return spawn(command, args, {
    cwd: options.cwd,
    env: options.env as Record<string, string>,
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    shell: options.shell ?? false,
  }) as unknown as ChildProcessLike
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export function createJsonRunner(opts: JsonRunnerOptions = {}) {
  const doSpawn = opts.spawnFactory ?? realSpawn

  async function run(config: JsonRunConfig): Promise<SingleResult> {
    const result = makeInitialResult(config.agent, config.task, config.step)

    const args = buildArgs(config.prompt, config.extraFlags)
    const env = buildEnv(config.extraEnv)

    const emitUpdate = () => {
      config.onUpdate?.(result)
    }

    let wasAborted = false

    const exitCode = await new Promise<number>((resolve) => {
      const proc = doSpawn("pi", args, {
        cwd: config.cwd,
        env,
      })

      let buffer = ""

      const processLine = (line: string) => {
        const event = parseJsonEvent(line)
        if (!event) return
        applyEventToResult(result, event)
        emitUpdate()
      }

      proc.stdout.on("data", (data: Buffer) => {
        buffer += data.toString()
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""
        for (const line of lines) processLine(line)
      })

      proc.stderr.on("data", (data: Buffer) => {
        result.stderr += data.toString()
      })

      proc.on("close", (code: number) => {
        if (buffer.trim()) processLine(buffer)
        resolve(code ?? 0)
      })

      proc.on("error", () => {
        resolve(1)
      })

      if (config.signal) {
        const killProc = () => {
          wasAborted = true
          proc.kill("SIGTERM")
          setTimeout(() => {
            if (!proc.killed) proc.kill("SIGKILL")
          }, 5000)
        }
        if (config.signal.aborted) killProc()
        else config.signal.addEventListener("abort", killProc, { once: true })
      }
    })

    result.exitCode = exitCode
    if (wasAborted) throw new Error("Subagent was aborted")
    return result
  }

  return { run }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildArgs(prompt: string, extraFlags?: string[]): string[] {
  const args: string[] = ["--mode", "json", "--no-session"]
  if (extraFlags && extraFlags.length > 0) {
    args.push(...extraFlags)
  }
  args.push("-p", prompt)
  return args
}

function buildEnv(extraEnv?: Record<string, string>): Record<string, string | undefined> {
  return {
    ...process.env,
    ...(extraEnv ?? {}),
  }
}
