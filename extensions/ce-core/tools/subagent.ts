/**
 * CE subagent tool — runs a single CE skill-based subagent or a serial chain.
 *
 * Features:
 *   - Recursion depth guard (PI_SUBAGENT_DEPTH / PI_SUBAGENT_MAX_DEPTH)
 *   - Optional context slimming via --no-skills flag
 */

import {
  checkSubagentDepth,
  getChildDepthEnv,
} from "./subagent-depth-guard"

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

export interface SubagentResult {
  mode: "single" | "chain"
  outputs: string[]
}

export interface SubagentExecOptions {
  /** Extra CLI flags to pass to the child pi process */
  extraFlags?: string[]
  /** Environment variables to inject into the child process */
  extraEnv?: Record<string, string>
}

export type SubagentRunner = (
  prompt: string,
  options?: SubagentExecOptions,
) => Promise<string>

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

export function createSubagentTool() {
  return {
    name: "ce_subagent",
    async execute(input: SubagentInput, runner: SubagentRunner): Promise<SubagentResult> {
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
        const output = await runner(prompt, execOptions)
        return {
          mode: "single",
          outputs: [output],
        }
      }

      const outputs: string[] = []
      let previous = ""

      for (const task of input.chain ?? []) {
        assertNonPipelineStageSkill(task.agent, "ce_subagent")
        const prompt = buildPrompt(task.agent, task.task.replace(/\{previous\}/g, previous))
        const output = await runner(prompt, execOptions)
        outputs.push(output)
        previous = output
      }

      return {
        mode: "chain",
        outputs,
      }
    },
  }
}

/**
 * Build exec options based on subagent configuration.
 * Controls context inheritance and recursion depth.
 */
function buildExecOptions(inheritSkills?: boolean): SubagentExecOptions {
  const flags: string[] = []
  const env: Record<string, string> = {}

  // Context slimming: skip skills inheritance when explicitly disabled
  if (inheritSkills === false) {
    flags.push("--no-skills")
  }

  // Recursion depth: pass incremented depth to child process
  Object.assign(env, getChildDepthEnv())

  return {
    extraFlags: flags.length > 0 ? flags : undefined,
    extraEnv: env,
  }
}

function buildPrompt(agent: string, task: string): string {
  return `/skill:${agent} ${task}`
}
