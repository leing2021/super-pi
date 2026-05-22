import { describe, expect, test } from "bun:test"
import {
  formatToolCall,
  renderSubagentResult,
  renderSubagentCall,
} from "../extensions/ce-core/tools/subagent-renderer"
import type { SingleResult } from "../extensions/ce-core/tools/subagent-events"
import type { SubagentLiveDetails } from "../extensions/ce-core/tools/subagent"

// ---------------------------------------------------------------------------
// Mock theme for testing
// ---------------------------------------------------------------------------

const mockTheme = {
  fg: (_color: string, text: string) => text,
  bold: (text: string) => `**${text}**`,
}

// ---------------------------------------------------------------------------
// Tool call formatting tests
// ---------------------------------------------------------------------------

describe("subagent-renderer: formatToolCall", () => {
  test("formats bash command with truncation", () => {
    const result = formatToolCall("bash", { command: "echo hello world" }, mockTheme.fg.bind(mockTheme))
    expect(result).toContain("echo hello world")
  })

  test("formats bash with long command truncated", () => {
    const longCmd = "a".repeat(80)
    const result = formatToolCall("bash", { command: longCmd }, mockTheme.fg.bind(mockTheme))
    // Should be truncated (80 > 60 chars)
    expect(result.length).toBeLessThan(longCmd.length + 10)
  })

  test("formats read with file path", () => {
    const result = formatToolCall("read", { file_path: "/foo/bar.ts" }, mockTheme.fg.bind(mockTheme))
    expect(result).toContain("bar.ts")
  })

  test("formats read with offset/limit", () => {
    const result = formatToolCall("read", { path: "test.ts", offset: 10, limit: 20 }, mockTheme.fg.bind(mockTheme))
    expect(result).toContain("10")
  })

  test("formats write with file path and line count", () => {
    const result = formatToolCall("write", { path: "output.ts", content: "line1\nline2\nline3" }, mockTheme.fg.bind(mockTheme))
    expect(result).toContain("output.ts")
    expect(result).toContain("3 lines")
  })

  test("formats edit with file path", () => {
    const result = formatToolCall("edit", { path: "change.ts" }, mockTheme.fg.bind(mockTheme))
    expect(result).toContain("change.ts")
  })

  test("formats unknown tools with JSON args", () => {
    const result = formatToolCall("customTool", { key: "value" }, mockTheme.fg.bind(mockTheme))
    expect(result).toContain("customTool")
  })
})

// ---------------------------------------------------------------------------
// renderSubagentCall tests
// ---------------------------------------------------------------------------

describe("subagent-renderer: renderSubagentCall", () => {
  test("renders single agent call", () => {
    const component = renderSubagentCall(
      { agent: "my-skill", task: "do something" },
      mockTheme,
    )
    expect(component).toBeDefined()
    const lines = component.render(80)
    const text = lines.join("\n")
    expect(text).toContain("my-skill")
    expect(text).toContain("do something")
  })

  test("renders chain call", () => {
    const component = renderSubagentCall(
      {
        chain: [
          { agent: "step1", task: "first" },
          { agent: "step2", task: "second with {previous}" },
        ],
      },
      mockTheme,
    )
    const lines = component.render(80)
    const text = lines.join("\n")
    expect(text).toContain("chain")
    expect(text).toContain("2 steps")
    expect(text).toContain("step1")
  })

  test("renders parallel call", () => {
    const component = renderSubagentCall(
      {
        tasks: [
          { agent: "t1", task: "task one" },
          { agent: "t2", task: "task two" },
        ],
      },
      mockTheme,
    )
    const lines = component.render(80)
    const text = lines.join("\n")
    expect(text).toContain("parallel")
    expect(text).toContain("2 tasks")
  })
})

// ---------------------------------------------------------------------------
// renderSubagentResult tests
// ---------------------------------------------------------------------------

function makeSuccessResult(agent: string, task: string): SingleResult {
  return {
    agent,
    task,
    exitCode: 0,
    messages: [
      {
        role: "assistant",
        content: [
          { type: "toolCall", name: "read", arguments: { path: "/foo.ts" } },
          { type: "text", text: "final output text" },
        ],
      },
    ],
    stderr: "",
    usage: { input: 500, output: 100, cacheRead: 0, cacheWrite: 0, cost: 0.01, contextTokens: 800, turns: 2 },
    stopReason: "end",
    model: "claude-3",
  }
}

function makeRunningResult(agent: string, task: string): SingleResult {
  return {
    agent,
    task,
    exitCode: -1,
    messages: [],
    stderr: "",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 },
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

describe("subagent-renderer: renderSubagentResult single", () => {
  test("renders success with checkmark and agent name", () => {
    const details: SubagentLiveDetails = {
      mode: "single",
      results: [makeSuccessResult("my-skill", "do work")],
    }
    const component = renderSubagentResult(details, { expanded: false }, mockTheme)
    const lines = component.render(80)
    const text = lines.join("\n")
    expect(text).toContain("✓")
    expect(text).toContain("my-skill")
  })

  test("renders running with hourglass", () => {
    const details: SubagentLiveDetails = {
      mode: "single",
      results: [makeRunningResult("my-skill", "do work")],
    }
    const component = renderSubagentResult(details, { expanded: false }, mockTheme)
    const lines = component.render(80)
    const text = lines.join("\n")
    expect(text).toContain("⏳")
  })

  test("renders failure with X and error reason", () => {
    const details: SubagentLiveDetails = {
      mode: "single",
      results: [makeFailedResult("my-skill", "do work", "something broke")],
    }
    const component = renderSubagentResult(details, { expanded: false }, mockTheme)
    const lines = component.render(80)
    const text = lines.join("\n")
    expect(text).toContain("✗")
    expect(text).toContain("something broke")
  })

  test("renders usage stats", () => {
    const details: SubagentLiveDetails = {
      mode: "single",
      results: [makeSuccessResult("s", "t")],
    }
    const component = renderSubagentResult(details, { expanded: false }, mockTheme)
    const lines = component.render(80)
    const text = lines.join("\n")
    expect(text).toContain("2 turns")
    expect(text).toContain("claude-3")
  })

  test("expanded view includes task and full output", () => {
    const details: SubagentLiveDetails = {
      mode: "single",
      results: [makeSuccessResult("s", "do the thing")],
    }
    const component = renderSubagentResult(details, { expanded: true }, mockTheme)
    const lines = component.render(80)
    const text = lines.join("\n")
    expect(text).toContain("do the thing")
    expect(text).toContain("final output text")
  })
})

describe("subagent-renderer: renderSubagentResult parallel", () => {
  test("renders parallel collapsed with per-task status icons", () => {
    const details: SubagentLiveDetails = {
      mode: "parallel",
      results: [
        makeSuccessResult("s1", "task 1"),
        makeRunningResult("s2", "task 2"),
        makeFailedResult("s3", "task 3", "error msg"),
      ],
    }
    const component = renderSubagentResult(details, { expanded: false }, mockTheme)
    const lines = component.render(80)
    const text = lines.join("\n")
    expect(text).toContain("✓")
    expect(text).toContain("⏳")
    expect(text).toContain("✗")
    expect(text).toContain("parallel")
  })

  test("renders expanded with per-task details", () => {
    const details: SubagentLiveDetails = {
      mode: "parallel",
      results: [
        makeSuccessResult("s1", "task 1"),
        makeSuccessResult("s2", "task 2"),
      ],
    }
    const component = renderSubagentResult(details, { expanded: true }, mockTheme)
    const lines = component.render(80)
    const text = lines.join("\n")
    expect(text).toContain("s1")
    expect(text).toContain("s2")
    expect(text).toContain("task 1")
    expect(text).toContain("task 2")
  })

  test("running partial does not crash", () => {
    const details: SubagentLiveDetails = {
      mode: "parallel",
      results: [
        makeRunningResult("s1", "t1"),
        makeRunningResult("s2", "t2"),
      ],
    }
    const component = renderSubagentResult(details, { expanded: false }, mockTheme)
    expect(component).toBeDefined()
    const lines = component.render(80)
    expect(lines.length).toBeGreaterThan(0)
  })
})
