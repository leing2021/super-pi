import { describe, expect, test } from "bun:test"
import {
  type UsageStats,
  type SingleResult,
  type DisplayItem,
  getFinalOutput,
  getDisplayItems,
  parseJsonEvent,
  applyEventToResult,
  isFailedResult,
  formatUsageStats,
  makeInitialResult,
} from "../extensions/ce-core/tools/subagent-events"

describe("subagent-events: result model", () => {
  test("makeInitialResult creates a running placeholder", () => {
    const result = makeInitialResult("my-agent", "do something")
    expect(result.agent).toBe("my-agent")
    expect(result.task).toBe("do something")
    expect(result.exitCode).toBe(-1)
    expect(result.messages).toEqual([])
    expect(result.usage.turns).toBe(0)
  })

  test("isFailedResult detects non-zero exit code", () => {
    const r = makeInitialResult("a", "t")
    r.exitCode = 1
    expect(isFailedResult(r)).toBe(true)
  })

  test("isFailedResult detects error stop reason", () => {
    const r = makeInitialResult("a", "t")
    r.exitCode = 0
    r.stopReason = "error"
    expect(isFailedResult(r)).toBe(true)
  })

  test("isFailedResult detects aborted stop reason", () => {
    const r = makeInitialResult("a", "t")
    r.exitCode = 0
    r.stopReason = "aborted"
    expect(isFailedResult(r)).toBe(true)
  })

  test("isFailedResult returns false for success", () => {
    const r = makeInitialResult("a", "t")
    r.exitCode = 0
    expect(isFailedResult(r)).toBe(false)
  })

  test("isFailedResult treats exitCode -1 (running) as not failed", () => {
    const r = makeInitialResult("a", "t")
    expect(r.exitCode).toBe(-1)
    expect(isFailedResult(r)).toBe(false)
  })
})

describe("subagent-events: getFinalOutput", () => {
  test("returns empty string for empty messages", () => {
    expect(getFinalOutput([])).toBe("")
  })

  test("returns last assistant text", () => {
    const result = getFinalOutput([
      { role: "assistant", content: [{ type: "text", text: "first" }] } as any,
      { role: "user", content: [{ type: "text", text: "user msg" }] } as any,
      { role: "assistant", content: [{ type: "text", text: "last output" }] } as any,
    ])
    expect(result).toBe("last output")
  })

  test("skips tool calls and returns text only", () => {
    const result = getFinalOutput([
      {
        role: "assistant",
        content: [
          { type: "toolCall", name: "bash", arguments: { command: "ls" } },
          { type: "text", text: "final answer" },
        ],
      } as any,
    ])
    expect(result).toBe("final answer")
  })
})

describe("subagent-events: getDisplayItems", () => {
  test("extracts text and toolCall items in order", () => {
    const items = getDisplayItems([
      {
        role: "assistant",
        content: [
          { type: "text", text: "thinking..." },
          { type: "toolCall", name: "read", arguments: { path: "/foo.ts" } },
          { type: "text", text: "done" },
        ],
      } as any,
    ])
    expect(items.length).toBe(3)
    expect(items[0]).toEqual({ type: "text", text: "thinking..." })
    expect(items[1]).toEqual({ type: "toolCall", name: "read", args: { path: "/foo.ts" } })
    expect(items[2]).toEqual({ type: "text", text: "done" })
  })

  test("skips non-assistant messages", () => {
    const items = getDisplayItems([
      { role: "user", content: [{ type: "text", text: "hello" }] } as any,
    ])
    expect(items).toEqual([])
  })
})

describe("subagent-events: parseJsonEvent", () => {
  test("returns null for empty line", () => {
    expect(parseJsonEvent("")).toBeNull()
  })

  test("returns null for non-JSON line", () => {
    expect(parseJsonEvent("not json at all")).toBeNull()
  })

  test("returns null for random JSON without recognized type", () => {
    expect(parseJsonEvent('{"foo":"bar"}')).toBeNull()
  })

  test("parses message_end event", () => {
    const event = parseJsonEvent(
      JSON.stringify({
        type: "message_end",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "hello" }],
          usage: {
            input: 100,
            output: 50,
            cacheRead: 10,
            cacheWrite: 5,
            cost: { total: 0.01 },
            totalTokens: 200,
          },
          stopReason: "end",
          model: "claude-3",
        },
      }),
    )
    expect(event).not.toBeNull()
    expect(event!.type).toBe("message_end")
    if (event!.type === "message_end") {
      expect((event!.message as any).role).toBe("assistant")
      expect(event!.usage).toBeDefined()
      expect(event!.usage!.input).toBe(100)
      expect(event!.stopReason).toBe("end")
      expect(event!.model).toBe("claude-3")
    }
  })

  test("parses tool_result_end event", () => {
    const event = parseJsonEvent(
      JSON.stringify({
        type: "tool_result_end",
        message: {
          role: "user",
          content: [{ type: "toolResult", name: "bash", result: "output" }],
        },
      }),
    )
    expect(event).not.toBeNull()
    expect(event!.type).toBe("tool_result_end")
    if (event!.type === "tool_result_end") {
      expect((event!.message as any).role).toBe("user")
    }
  })

  test("handles message_end with missing usage gracefully", () => {
    const event = parseJsonEvent(
      JSON.stringify({
        type: "message_end",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "no usage" }],
        },
      }),
    )
    expect(event).not.toBeNull()
    if (event!.type === "message_end") {
      expect(event!.usage).toBeUndefined()
    }
  })
})

describe("subagent-events: applyEventToResult", () => {
  test("applies message_end: increments turns and usage", () => {
    const result = makeInitialResult("a", "t")
    const event = {
      type: "message_end" as const,
      message: {
        role: "assistant" as const,
        content: [{ type: "text" as const, text: "response" }],
      },
      usage: { input: 500, output: 200, cacheRead: 50, cacheWrite: 30, cost: { total: 0.05 }, totalTokens: 800 },
      stopReason: "end",
      model: "claude-3",
    }
    applyEventToResult(result, event)
    expect(result.messages.length).toBe(1)
    expect(result.usage.turns).toBe(1)
    expect(result.usage.input).toBe(500)
    expect(result.usage.output).toBe(200)
    expect(result.usage.cacheRead).toBe(50)
    expect(result.usage.cacheWrite).toBe(30)
    expect(result.usage.cost).toBeCloseTo(0.05)
    expect(result.usage.contextTokens).toBe(800)
    expect(result.stopReason).toBe("end")
    expect(result.model).toBe("claude-3")
  })

  test("applies tool_result_end: adds message", () => {
    const result = makeInitialResult("a", "t")
    const event = {
      type: "tool_result_end" as const,
      message: {
        role: "user" as const,
        content: [{ type: "toolResult" as const, name: "bash", result: "ok" }],
      },
    }
    applyEventToResult(result, event)
    expect(result.messages.length).toBe(1)
    // turns should NOT increment for tool_result_end
    expect(result.usage.turns).toBe(0)
  })

  test("accumulates usage across multiple message_end events", () => {
    const result = makeInitialResult("a", "t")
    applyEventToResult(result, {
      type: "message_end",
      message: { role: "assistant", content: [{ type: "text", text: "one" }] },
      usage: { input: 100, output: 50, cacheRead: 0, cacheWrite: 0, cost: { total: 0.01 }, totalTokens: 200 },
    })
    applyEventToResult(result, {
      type: "message_end",
      message: { role: "assistant", content: [{ type: "text", text: "two" }] },
      usage: { input: 200, output: 80, cacheRead: 10, cacheWrite: 5, cost: { total: 0.02 }, totalTokens: 400 },
    })
    expect(result.usage.turns).toBe(2)
    expect(result.usage.input).toBe(300)
    expect(result.usage.output).toBe(130)
    expect(result.usage.cost).toBeCloseTo(0.03)
  })

  test("captures errorMessage from message_end", () => {
    const result = makeInitialResult("a", "t")
    applyEventToResult(result, {
      type: "message_end",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "" }],
        errorMessage: "rate limited",
      },
    })
    expect(result.errorMessage).toBe("rate limited")
  })
})

describe("subagent-events: formatUsageStats", () => {
  test("formats basic usage with turns", () => {
    const str = formatUsageStats({ input: 1500, output: 300, cacheRead: 0, cacheWrite: 0, cost: 0.0123, contextTokens: 5000, turns: 3 })
    expect(str).toContain("3 turns")
    expect(str).toContain("↑1.5k")
    expect(str).toContain("↓300")
    expect(str).toContain("$0.0123")
  })

  test("formats cache stats when present", () => {
    const str = formatUsageStats({ input: 0, output: 0, cacheRead: 2000, cacheWrite: 500, cost: 0, contextTokens: 0, turns: 1 })
    expect(str).toContain("R2.0k")
    expect(str).toContain("W500")
  })

  test("includes model when provided", () => {
    const str = formatUsageStats({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 }, "claude-3")
    expect(str).toContain("claude-3")
  })

  test("skips zero values", () => {
    const str = formatUsageStats({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 })
    expect(str).toBe("")
  })
})
