/**
 * CE subagent tool — runs a single CE skill-based subagent or a serial chain.
 *
 * Features:
 *   - Recursion depth guard (PI_SUBAGENT_DEPTH / PI_SUBAGENT_MAX_DEPTH)
 *   - Optional context slimming via --no-skills flag
 *   - Live TUI updates via onUpdate callback + SingleResult details
 */

import {
  checkSubagentDepth,
  getChildDepthEnv,
} from "./subagent-depth-guard"
import {
  type SingleResult,
  getFinalOutput,
  invokeRunner,
} from "./subagent-events"

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SubagentTask {
  agent: string
  task: string
}

export interface SubagentInput {
  agent?: string
  task?: string
  chain?: SubagentTask[]
  /** Whether the subagent should inherit skills. Default: true */
  inheritSkills?: boolean
}

export interface SubagentLiveDetails {
  mode: "single" | "chain" | "parallel"
  results: SingleResult[]
}

/** @deprecated Use SubagentLiveRunner instead */
export type SubagentRunner = (
  prompt: string,
  options?: SubagentExecOptions,
) => Promise<string>

export interface SubagentExecOptions {
  /** Extra CLI flags to pass to the child pi process */
  extraFlags?: string[]
  /** Environment variables to inject into the child process */
  extraEnv?: Record<string, string>
  /** Callback for live TUI partial updates */
  onUpdate?: (partial: SingleResult) => void
}

/**
 * Live runner that returns a structured SingleResult and supports
 * onUpdate for partial progress.
 */
export type SubagentLiveRunner = (
  prompt: string,
  options?: SubagentLiveExecOptions,
) => Promise<SingleResult>

export type SubagentLiveExecOptions = SubagentExecOptions

export interface SubagentLiveResult {
  mode: "single" | "chain"
  results: SingleResult[]
  /** @deprecated Backward compat: final text output per step */
  outputs?: string[]
}

// ---------------------------------------------------------------------------
// Pipeline stage guard
// ---------------------------------------------------------------------------

const PIPELINE_STAGE_SKILLS = new Set([
  "01-brainstorm",
  "02-plan",
  "03-work",
  "04-review",
  "05-learn",
])

export function assertNonPipelineStageSkill(agent: string, toolName: string): void {
  if (PIPELINE_STAGE_SKILLS.has(agent)) {
    throw new Error(
      `Pipeline-stage skill "${agent}" cannot run through ${toolName}. ` +
      `Run it directly with /skill:${agent} instead.`,
    )
  }
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export function createSubagentTool() {
  return {
    name: "ce_subagent" as const,

    /**
     * Execute the subagent tool.
     *
     * Supports two runner signatures:
     *   - SubagentLiveRunner (preferred): returns SingleResult, supports onUpdate
     *   - SubagentRunner (legacy): returns string, no onUpdate
     */
    async execute(
      input: SubagentInput,
      runner: SubagentLiveRunner | SubagentRunner,
      toolCtx?: { onUpdate?: (details: SubagentLiveDetails) => void },
    ): Promise<SubagentLiveResult> {
      // Recursion depth guard
      const depthCheck = checkSubagentDepth()
      if (!depthCheck.allowed) {
        throw new Error(depthCheck.reason!)
      }

      const hasSingle = Boolean(input.agent && input.task)
      const hasChain = Boolean(input.chain && input.chain.length > 0)

      if (Number(hasSingle) + Number(hasChain) !== 1) {
        throw new Error("Provide exactly one mode: single or chain")
      }

      const execOptions = buildExecOptions(input.inheritSkills)

      if (hasSingle) {
        assertNonPipelineStageSkill(input.agent!, "ce_subagent")
        const prompt = buildPrompt(input.agent!, input.task!)

        const liveOptions: SubagentLiveExecOptions = {
          ...execOptions,
          onUpdate: (partial: SingleResult) => {
            if (toolCtx?.onUpdate) {
              toolCtx.onUpdate({ mode: "single", results: [partial] })
            }
          },
        }

        const result = await invokeRunner(runner, prompt, liveOptions)
        result.agent = input.agent!
        result.task = input.task!
        return {
          mode: "single",
          results: [result],
          outputs: [getFinalOutput(result.messages)],
        }
      }

      // Chain mode
      const results: SingleResult[] = []
      let previous = ""

      for (const task of input.chain ?? []) {
        assertNonPipelineStageSkill(task.agent, "ce_subagent")
        const prompt = buildPrompt(task.agent, task.task.replace(/\{previous\}/g, previous))

        const liveOptions: SubagentLiveExecOptions = {
          ...execOptions,
          onUpdate: (partial: SingleResult) => {
            if (toolCtx?.onUpdate) {
              toolCtx.onUpdate({ mode: "chain", results: [...results, partial] })
            }
          },
        }

        const result = await invokeRunner(runner, prompt, liveOptions)
        result.agent = task.agent
        result.task = task.task
        results.push(result)
        previous = getFinalOutput(result.messages)
      }

      return {
        mode: "chain",
        results,
        outputs: results.map(r => getFinalOutput(r.messages)),
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildExecOptions(inheritSkills?: boolean): { extraFlags?: string[]; extraEnv: Record<string, string> } {
  const flags: string[] = []
  const env: Record<string, string> = {}

  if (inheritSkills === false) {
    flags.push("--no-skills")
  }

  Object.assign(env, getChildDepthEnv())

  return {
    extraFlags: flags.length > 0 ? flags : undefined,
    extraEnv: env,
  }
}

function buildPrompt(agent: string, task: string): string {
  return `/skill:${agent} ${task}`
}
