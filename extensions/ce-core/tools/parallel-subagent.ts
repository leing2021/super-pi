/**
 * CE parallel subagent tool — runs multiple CE skill-based subagent tasks concurrently.
 *
 * Features:
 *   - Recursion depth guard (PI_SUBAGENT_DEPTH / PI_SUBAGENT_MAX_DEPTH)
 *   - Optional context slimming via --no-skills flag
 */

import {
  checkSubagentDepth,
  getChildDepthEnv,
} from "./subagent-depth-guard"
import type { SubagentExecOptions, SubagentRunner } from "./subagent"

export interface ParallelSubagentTask {
  agent: string
  task: string
}

export interface ParallelSubagentInput {
  tasks: ParallelSubagentTask[]
  /** Whether subagents should inherit skills. Default: false for parallel */
  inheritSkills?: boolean
}

export interface ParallelResultItem {
  status: "fulfilled" | "rejected"
  value?: string
  reason?: string
}

export interface ParallelSubagentResult {
  mode: "parallel"
  outputs: ParallelResultItem[]
}

function buildPrompt(agent: string, task: string): string {
  return `/skill:${agent} ${task}`
}

export function createParallelSubagentTool() {
  return {
    name: "ce_parallel_subagent",
    async execute(input: ParallelSubagentInput, runner: SubagentRunner): Promise<ParallelSubagentResult> {
      // Recursion depth guard
      const depthCheck = checkSubagentDepth()
      if (!depthCheck.allowed) {
        throw new Error(depthCheck.reason!)
      }

      if (!input.tasks || input.tasks.length === 0) {
        throw new Error("ce_parallel_subagent requires at least one task")
      }

      // Default: parallel workers get a slim context (no inherited skills)
      const inheritSkills = input.inheritSkills ?? false
      const execOptions = buildParallelExecOptions(inheritSkills)

      const promises = input.tasks.map(({ agent, task }) =>
        runner(buildPrompt(agent, task), execOptions),
      )

      const settled = await Promise.allSettled(promises)

      const outputs: ParallelResultItem[] = settled.map((result) => {
        if (result.status === "fulfilled") {
          return { status: "fulfilled", value: result.value }
        }
        return { status: "rejected", reason: result.reason?.message || String(result.reason) }
      })

      return {
        mode: "parallel",
        outputs,
      }
    },
  }
}

/**
 * Build exec options for parallel subagent workers.
 * Defaults to slim context (no inherited skills).
 */
function buildParallelExecOptions(inheritSkills: boolean): SubagentExecOptions {
  const flags: string[] = []
  const env: Record<string, string> = {}

  // Context slimming
  if (!inheritSkills) {
    flags.push("--no-skills")
  }

  // Recursion depth
  Object.assign(env, getChildDepthEnv())

  return {
    extraFlags: flags.length > 0 ? flags : undefined,
    extraEnv: env,
  }
}
