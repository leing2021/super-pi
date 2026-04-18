export interface ParallelSubagentTask {
  agent: string
  task: string
}

export interface ParallelSubagentInput {
  tasks: ParallelSubagentTask[]
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

export type SubagentRunner = (prompt: string) => Promise<string>

function buildPrompt(agent: string, task: string): string {
  return `/skill:${agent} ${task}`
}

export function createParallelSubagentTool() {
  return {
    name: "parallel_subagent",
    async execute(input: ParallelSubagentInput, runner: SubagentRunner): Promise<ParallelSubagentResult> {
      if (!input.tasks || input.tasks.length === 0) {
        throw new Error("parallel_subagent requires at least one task")
      }

      const promises = input.tasks.map(({ agent, task }) =>
        runner(buildPrompt(agent, task)),
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
