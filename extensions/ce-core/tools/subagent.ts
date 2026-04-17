export interface SubagentTask {
  agent: string
  task: string
}

export interface SubagentInput {
  agent?: string
  task?: string
  chain?: SubagentTask[]
}

export interface SubagentResult {
  mode: "single" | "chain"
  outputs: string[]
}

export type SubagentRunner = (prompt: string) => Promise<string>

export function createSubagentTool() {
  return {
    name: "subagent",
    async execute(input: SubagentInput, runner: SubagentRunner): Promise<SubagentResult> {
      const hasSingle = Boolean(input.agent && input.task)
      const hasChain = Boolean(input.chain && input.chain.length > 0)

      if (Number(hasSingle) + Number(hasChain) !== 1) {
        throw new Error("Provide exactly one mode: single or chain")
      }

      if (hasSingle) {
        const prompt = buildPrompt(input.agent!, input.task!)
        const output = await runner(prompt)
        return {
          mode: "single",
          outputs: [output],
        }
      }

      const outputs: string[] = []
      let previous = ""

      for (const task of input.chain ?? []) {
        const prompt = buildPrompt(task.agent, task.task.replace(/\{previous\}/g, previous))
        const output = await runner(prompt)
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

function buildPrompt(agent: string, task: string): string {
  return `/skill:${agent} ${task}`
}
