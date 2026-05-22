import { describe, expect, test } from "bun:test"
import { createParallelSubagentTool } from "../extensions/ce-core/tools/parallel-subagent"
import type { SingleResult } from "../extensions/ce-core/tools/subagent-events"
import type { SubagentLiveExecOptions, SubagentLiveRunner } from "../extensions/ce-core/tools/subagent"

function makeStubResult(agent: string, task: string, text: string): SingleResult {
  return {
    agent,
    task,
    exitCode: 0,
    messages: [{ role: "assistant", content: [{ type: "text", text }] }],
    stderr: "",
    usage: { input: 100, output: 50, cacheRead: 0, cacheWrite: 0, cost: 0.01, contextTokens: 0, turns: 1 },
    stopReason: "end",
  }
}

function makeFailedResult(agent: string, task: string, error: string): SingleResult {
  return {
    agent,
    task,
    exitCode: 1,
    messages: [],
    stderr: error,
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 },
    errorMessage: error,
    stopReason: "error",
  }
}

describe("ce_parallel_subagent live updates: basic", () => {
  test("returns results for all tasks with status and details", async () => {
    const tool = createParallelSubagentTool()

    const runner: SubagentLiveRunner = async (prompt: string) => {
      if (prompt.includes("task-a")) return makeStubResult("s1", "task-a", "result-a")
      if (prompt.includes("task-b")) return makeStubResult("s2", "task-b", "result-b")
      return makeStubResult("s3", "task-c", "result-c")
    }

    const result = await tool.execute(
      {
        tasks: [
          { agent: "s1", task: "task-a" },
          { agent: "s2", task: "task-b" },
          { agent: "s3", task: "task-c" },
        ],
      },
      runner,
    )

    expect(result.mode).toBe("parallel")
    expect(result.results.length).toBe(3)
    // All succeeded
    expect(result.results.every(r => r.exitCode === 0)).toBe(true)
  })

  test("handles individual task failures while continuing others", async () => {
    const tool = createParallelSubagentTool()

    const runner: SubagentLiveRunner = async (prompt: string) => {
      if (prompt.includes("fail")) return makeFailedResult("s", "fail", "Task failed")
      return makeStubResult("s", "ok", "done")
    }

    const result = await tool.execute(
      {
        tasks: [
          { agent: "s", task: "good task" },
          { agent: "s", task: "fail task" },
          { agent: "s", task: "another good" },
        ],
      },
      runner,
    )

    expect(result.results.length).toBe(3)
    expect(result.results[0].exitCode).toBe(0)
    expect(result.results[1].exitCode).toBe(1)
    expect(result.results[1].errorMessage).toContain("Task failed")
    expect(result.results[2].exitCode).toBe(0)
  })

  test("rejects empty task array", async () => {
    const tool = createParallelSubagentTool()
    await expect(
      tool.execute({ tasks: [] }, async () => makeStubResult("a", "t", "ok")),
    ).rejects.toThrow("at least one task")
  })

  test("rejects pipeline-stage skills", async () => {
    const tool = createParallelSubagentTool()
    await expect(
      tool.execute(
        { tasks: [{ agent: "04-review", task: "Review changes" }] },
        async () => makeStubResult("a", "t", "ok"),
      ),
    ).rejects.toThrow("Pipeline-stage skill")
  })
})

describe("ce_parallel_subagent live updates: onUpdate", () => {
  test("triggers aggregate onUpdate during execution", async () => {
    const tool = createParallelSubagentTool()
    const updates: any[] = []

    const runner: SubagentLiveRunner = async (prompt: string, opts?: SubagentLiveExecOptions) => {
      // Simulate partial update
      const partial: SingleResult = {
        agent: "s",
        task: "t",
        exitCode: -1,
        messages: [],
        stderr: "",
        usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 },
      }
      opts?.onUpdate?.(partial)
      return makeStubResult("s", "t", "done")
    }

    await tool.execute(
      { tasks: [{ agent: "s", task: "t1" }, { agent: "s", task: "t2" }] },
      runner,
      { onUpdate: (details) => updates.push(details) },
    )

    expect(updates.length).toBeGreaterThanOrEqual(1)
    const firstUpdate = updates[0]
    expect(firstUpdate.mode).toBe("parallel")
    expect(firstUpdate.results).toBeDefined()
    expect(firstUpdate.results.length).toBe(2)
  })

  test("initial placeholder shows all tasks as running", async () => {
    const tool = createParallelSubagentTool()
    let firstUpdate: any = null

    const runner: SubagentLiveRunner = async (_prompt: string, _opts?: any) => {
      // Delay slightly so initial placeholder is sent first
      return makeStubResult("s", "t", "done")
    }

    await tool.execute(
      { tasks: [{ agent: "s", task: "t1" }, { agent: "s", task: "t2" }] },
      runner,
      {
        onUpdate: (details) => {
          if (!firstUpdate) firstUpdate = details
        },
      },
    )

    // First update should have 2 results, both running (exitCode -1)
    expect(firstUpdate).not.toBeNull()
    expect(firstUpdate.results.length).toBe(2)
    expect(firstUpdate.results.every((r: SingleResult) => r.exitCode === -1)).toBe(true)
  })
})

describe("ce_parallel_subagent: concurrency control", () => {
  test("respects MAX_CONCURRENCY limit", async () => {
    const tool = createParallelSubagentTool()

    // Track maximum concurrent executions
    let concurrent = 0
    let maxConcurrent = 0
    const concurrencyLimit = 4

    const runner: SubagentLiveRunner = async (_prompt: string) => {
      concurrent++
      if (concurrent > maxConcurrent) maxConcurrent = concurrent
      // Small delay to ensure overlap
      await new Promise(r => setTimeout(r, 20))
      concurrent--
      return makeStubResult("s", "t", "done")
    }

    // 6 tasks with concurrency limit 4
    await tool.execute(
      {
        tasks: Array.from({ length: 6 }, (_, i) => ({ agent: "s", task: `task-${i}` })),
      },
      runner,
    )

    // Max concurrent should not exceed the limit (4)
    expect(maxConcurrent).toBeLessThanOrEqual(concurrencyLimit)
    expect(maxConcurrent).toBeGreaterThan(1)
  })

  test("returns results in input order regardless of completion order", async () => {
    const tool = createParallelSubagentTool()

    const runner: SubagentLiveRunner = async (prompt: string) => {
      // Slow task first, fast task second
      if (prompt.includes("slow")) {
        await new Promise(r => setTimeout(r, 50))
        return makeStubResult("s", "slow task", "slow-result")
      }
      return makeStubResult("s", "fast task", "fast-result")
    }

    const result = await tool.execute(
      {
        tasks: [
          { agent: "s", task: "slow task" },
          { agent: "s", task: "fast task" },
        ],
      },
      runner,
    )

    expect(result.results.length).toBe(2)
    // Order should match input order
    expect(result.results[0].task).toBe("slow task")
    expect(result.results[1].task).toBe("fast task")
  })
})

describe("ce_parallel_subagent: failure summary", () => {
  test("final content clearly marks successes and failures", async () => {
    const tool = createParallelSubagentTool()

    const runner: SubagentLiveRunner = async (prompt: string) => {
      if (prompt.includes("fail")) return makeFailedResult("s", "fail", "error reason here")
      return makeStubResult("s", "ok", "success output")
    }

    const result = await tool.execute(
      {
        tasks: [
          { agent: "s", task: "good" },
          { agent: "s", task: "fail this" },
        ],
      },
      runner,
    )

    // Results should contain success and failure info
    const successResults = result.results.filter(r => r.exitCode === 0)
    const failedResults = result.results.filter(r => r.exitCode !== 0 && r.exitCode !== -1)
    expect(successResults.length).toBe(1)
    expect(failedResults.length).toBe(1)
    expect(failedResults[0].errorMessage).toContain("error reason here")
  })
})
