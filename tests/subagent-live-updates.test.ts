import { describe, expect, test } from "bun:test"
import { createSubagentTool } from "../extensions/ce-core/tools/subagent"
import type { SingleResult } from "../extensions/ce-core/tools/subagent-events"
import type { SubagentLiveExecOptions, SubagentLiveRunner } from "../extensions/ce-core/tools/subagent"

/**
 * Fake live runner that simulates JSON event stream results
 * and triggers onUpdate callbacks.
 */
function createFakeLiveRunner(events: {
  partials?: SingleResult[]
  final: SingleResult
}): SubagentLiveRunner {
  return async (
    _prompt: string,
    options?: SubagentLiveExecOptions,
  ): Promise<SingleResult> => {
    if (options?.onUpdate && events.partials) {
      for (const partial of events.partials) {
        options.onUpdate(partial)
      }
    }
    return events.final
  }
}

describe("ce_subagent live updates: single mode", () => {
  test("returns details with SingleResult for successful single task", async () => {
    const tool = createSubagentTool()
    const finalResult: SingleResult = {
      agent: "my-skill",
      task: "do work",
      exitCode: 0,
      messages: [{ role: "assistant", content: [{ type: "text", text: "done" }] }],
      stderr: "",
      usage: { input: 500, output: 100, cacheRead: 0, cacheWrite: 0, cost: 0.01, contextTokens: 800, turns: 2 },
      stopReason: "end",
      model: "claude-3",
    }

    const result = await tool.execute(
      { agent: "my-skill", task: "do work" },
      createFakeLiveRunner({ final: finalResult }),
    )

    expect(result.mode).toBe("single")
    expect(result.results).toBeDefined()
    expect(result.results.length).toBe(1)
    expect(result.results[0].exitCode).toBe(0)
    expect(result.results[0].usage.turns).toBe(2)
  })

  test("triggers onUpdate with partial details during execution", async () => {
    const tool = createSubagentTool()
    const updates: any[] = []

    const partial: SingleResult = {
      agent: "my-skill",
      task: "do work",
      exitCode: -1,
      messages: [{ role: "assistant", content: [{ type: "text", text: "working..." }] }],
      stderr: "",
      usage: { input: 200, output: 50, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 400, turns: 1 },
    }

    const finalResult: SingleResult = {
      agent: "my-skill",
      task: "do work",
      exitCode: 0,
      messages: [{ role: "assistant", content: [{ type: "text", text: "working..." }] }, { role: "assistant", content: [{ type: "text", text: "done" }] }],
      stderr: "",
      usage: { input: 500, output: 100, cacheRead: 0, cacheWrite: 0, cost: 0.01, contextTokens: 800, turns: 2 },
      stopReason: "end",
    }

    await tool.execute(
      { agent: "my-skill", task: "do work" },
      createFakeLiveRunner({ partials: [partial], final: finalResult }),
      { onUpdate: (details) => updates.push(details) },
    )

    // Should have at least one partial update
    expect(updates.length).toBeGreaterThanOrEqual(1)
    // The partial update should contain the running state
    const firstUpdate = updates[0]
    expect(firstUpdate.results).toBeDefined()
    expect(firstUpdate.results[0].exitCode).toBe(-1)
  })
})

describe("ce_subagent live updates: chain mode", () => {
  test("chain passes previous output to next step and accumulates results", async () => {
    const tool = createSubagentTool()
    const prompts: string[] = []

    const step1Final: SingleResult = {
      agent: "step1-skill",
      task: "first step",
      exitCode: 0,
      messages: [{ role: "assistant", content: [{ type: "text", text: "step1-result" }] }],
      stderr: "",
      usage: { input: 100, output: 30, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 1 },
      stopReason: "end",
    }

    const step2Final: SingleResult = {
      agent: "step2-skill",
      task: "second step with step1-result",
      exitCode: 0,
      messages: [{ role: "assistant", content: [{ type: "text", text: "step2-result" }] }],
      stderr: "",
      usage: { input: 200, output: 60, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 1 },
      stopReason: "end",
    }

    let callIndex = 0
    const runner: SubagentLiveRunner = async (prompt: string, _opts?: any) => {
      prompts.push(prompt)
      callIndex++
      if (callIndex === 1) return step1Final
      return step2Final
    }

    const result = await tool.execute(
      {
        chain: [
          { agent: "step1-skill", task: "first step" },
          { agent: "step2-skill", task: "second step with {previous}" },
        ],
      },
      runner,
    )

    expect(result.mode).toBe("chain")
    expect(result.results.length).toBe(2)
    // {previous} should have been replaced
    expect(prompts[1]).toContain("step1-result")
    expect(prompts[1]).not.toContain("{previous}")
  })

  test("chain update includes completed steps plus current partial", async () => {
    const tool = createSubagentTool()
    const updates: any[] = []

    const step1Final: SingleResult = {
      agent: "s1",
      task: "t1",
      exitCode: 0,
      messages: [{ role: "assistant", content: [{ type: "text", text: "r1" }] }],
      stderr: "",
      usage: { input: 100, output: 30, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 1 },
    }

    const step2Partial: SingleResult = {
      agent: "s2",
      task: "t2",
      exitCode: -1,
      messages: [{ role: "assistant", content: [{ type: "text", text: "working..." }] }],
      stderr: "",
      usage: { input: 50, output: 10, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 },
    }

    const step2Final: SingleResult = {
      agent: "s2",
      task: "t2",
      exitCode: 0,
      messages: [{ role: "assistant", content: [{ type: "text", text: "r2" }] }],
      stderr: "",
      usage: { input: 200, output: 60, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 1 },
    }

    let callIndex = 0
    const runner: SubagentLiveRunner = async (_prompt: string, opts?: any) => {
      callIndex++
      if (callIndex === 1) return step1Final
      // Trigger partial for step 2
      if (opts?.onUpdate) opts.onUpdate(step2Partial)
      return step2Final
    }

    await tool.execute(
      {
        chain: [
          { agent: "s1", task: "t1" },
          { agent: "s2", task: "t2" },
        ],
      },
      runner,
      { onUpdate: (details) => updates.push(details) },
    )

    // There should be updates that include both completed step1 and running step2
    const chainUpdate = updates.find(
      (u) => u.results && u.results.length >= 2 && u.results[1].exitCode === -1,
    )
    expect(chainUpdate).toBeDefined()
    // Step 1 should be done, step 2 running
    expect(chainUpdate.results[0].exitCode).toBe(0)
    expect(chainUpdate.results[1].exitCode).toBe(-1)
  })
})

describe("ce_subagent live updates: existing behavior preserved", () => {
  test("rejects mixed execution modes", async () => {
    const tool = createSubagentTool()
    await expect(
      tool.execute(
        { agent: "a", task: "t", chain: [{ agent: "b", task: "t2" }] },
        async () => makeStubResult(),
      ),
    ).rejects.toThrow("Provide exactly one mode")
  })

  test("rejects pipeline-stage skills", async () => {
    const tool = createSubagentTool()
    await expect(
      tool.execute(
        { agent: "02-plan", task: "make plan" },
        async () => makeStubResult(),
      ),
    ).rejects.toThrow("Pipeline-stage skill")
  })

  test("rejects empty agent in single mode", async () => {
    const tool = createSubagentTool()
    await expect(
      tool.execute({ agent: "", task: "t" }, async () => makeStubResult()),
    ).rejects.toThrow()
  })

  test("rejects pipeline-stage skills in chain", async () => {
    const tool = createSubagentTool()
    await expect(
      tool.execute(
        { chain: [{ agent: "01-brainstorm", task: "discover" }] },
        async () => makeStubResult(),
      ),
    ).rejects.toThrow("Pipeline-stage skill")
  })
})

function makeStubResult(): SingleResult {
  return {
    agent: "stub",
    task: "stub",
    exitCode: 0,
    messages: [],
    stderr: "",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 },
  }
}
