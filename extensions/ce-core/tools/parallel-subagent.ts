/**
 * CE parallel subagent tool — runs multiple CE skill-based subagent tasks concurrently.
 *
 * Features:
 *   - Recursion depth guard (PI_SUBAGENT_DEPTH / PI_SUBAGENT_MAX_DEPTH)
 *   - Optional context slimming via --no-skills flag
 *   - Concurrency limit via mapWithConcurrencyLimit (from pi official example)
 *   - Live TUI updates with running placeholders and per-task status
 *   - Promise.allSettled semantics: one failure does NOT cancel others
 */

import {
  checkSubagentDepth,
  getChildDepthEnv,
} from "./subagent-depth-guard"
import {
  type SingleResult,
  makeInitialResult,
  isFailedResult,
  getFinalOutput,
  makeFailedResult,
  invokeRunner,
  type AnyRunner,
} from "./subagent-events"
import {
  assertNonPipelineStageSkill,
  type SubagentLiveRunner,
  type SubagentLiveExecOptions,
  type SubagentRunner,
} from "./subagent"

// ---------------------------------------------------------------------------
// Constants (from pi official example)
// ---------------------------------------------------------------------------

const MAX_PARALLEL_TASKS = 8
const MAX_CONCURRENCY = 4

// ---------------------------------------------------------------------------
// mapWithConcurrencyLimit (directly from pi official subagent example)
// ---------------------------------------------------------------------------

async function mapWithConcurrencyLimit<TIn, TOut>(
  items: TIn[],
  concurrency: number,
  fn: (item: TIn, index: number) => Promise<TOut>,
): Promise<TOut[]> {
  if (items.length === 0) return []
  const limit = Math.max(1, Math.min(concurrency, items.length))
  const results: TOut[] = new Array(items.length)
  let nextIndex = 0
  const workers = new Array(limit).fill(null).map(async () => {
    while (true) {
      const current = nextIndex++
      if (current >= items.length) return
      results[current] = await fn(items[current], current)
    }
  })
  await Promise.all(workers)
  return results
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ParallelSubagentTask {
  agent: string
  task: string
}

export interface ParallelSubagentInput {
  tasks: ParallelSubagentTask[]
  /** Whether subagents should inherit skills. Default: false for parallel */
  inheritSkills?: boolean
}

export interface ParallelSubagentLiveDetails {
  mode: "parallel"
  results: SingleResult[]
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export function createParallelSubagentTool() {
  return {
    name: "ce_parallel_subagent" as const,

    async execute(
      input: ParallelSubagentInput,
      runner: SubagentLiveRunner | SubagentRunner,
      toolCtx?: { onUpdate?: (details: ParallelSubagentLiveDetails) => void },
    ): Promise<ParallelSubagentLiveDetails> {
      // Recursion depth guard
      const depthCheck = checkSubagentDepth()
      if (!depthCheck.allowed) {
        throw new Error(depthCheck.reason!)
      }

      if (!input.tasks || input.tasks.length === 0) {
        throw new Error("ce_parallel_subagent requires at least one task")
      }

      if (input.tasks.length > MAX_PARALLEL_TASKS) {
        throw new Error(
          `Too many parallel tasks (${input.tasks.length}). Max is ${MAX_PARALLEL_TASKS}.`,
        )
      }

      for (const task of input.tasks) {
        assertNonPipelineStageSkill(task.agent, "ce_parallel_subagent")
      }

      const execOptions = buildParallelExecOptions(input.inheritSkills)

      // Initialize all results as running placeholders
      const allResults: SingleResult[] = input.tasks.map(({ agent, task }) =>
        makeInitialResult(agent, task),
      )

      // Emit initial state (all running)
      emitParallelUpdate(allResults, toolCtx)

      // Run tasks with concurrency limit
      await mapWithConcurrencyLimit(input.tasks, MAX_CONCURRENCY, async (t, index) => {
        const liveOptions: SubagentLiveExecOptions = {
          ...execOptions,
          onUpdate: (partial: SingleResult) => {
            allResults[index] = partial
            emitParallelUpdate(allResults, toolCtx)
          },
        }

        try {
          const result = await invokeRunner(runner, `/skill:${t.agent} ${t.task}`, liveOptions)
          allResults[index] = result
        } catch (e) {
          // Preserve allSettled semantics: one failure does not cancel others
          allResults[index] = makeFailedResult(t.agent, t.task, e instanceof Error ? e.message : String(e))
        }
        emitParallelUpdate(allResults, toolCtx)
        return allResults[index]
      })

      return { mode: "parallel", results: allResults }
    },
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emitParallelUpdate(
  results: SingleResult[],
  toolCtx?: { onUpdate?: (details: ParallelSubagentLiveDetails) => void },
) {
  if (toolCtx?.onUpdate) {
    toolCtx.onUpdate({ mode: "parallel", results: [...results] })
  }
}

function buildParallelExecOptions(inheritSkills?: boolean): { extraFlags?: string[]; extraEnv: Record<string, string> } {
  const flags: string[] = []
  const env: Record<string, string> = {}

  if (inheritSkills !== true) {
    flags.push("--no-skills")
  }

  Object.assign(env, getChildDepthEnv())

  return {
    extraFlags: flags.length > 0 ? flags : undefined,
    extraEnv: env,
  }
}

// ---------------------------------------------------------------------------
// Legacy backward-compat types and exports
// ---------------------------------------------------------------------------

/** @deprecated Use ParallelSubagentLiveDetails instead */
export interface ParallelResultItem {
  status: "fulfilled" | "rejected"
  value?: string
  reason?: string
}

/** @deprecated Use ParallelSubagentLiveDetails instead */
export interface ParallelSubagentResult {
  mode: "parallel"
  outputs: ParallelResultItem[]
}
