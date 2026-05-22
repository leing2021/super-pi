import { describe, expect, test } from "bun:test"
import {
  type SpawnFactory,
  type SpawnInput,
  createJsonRunner,
} from "../extensions/ce-core/tools/subagent-json-runner"
import type { SingleResult } from "../extensions/ce-core/tools/subagent-events"

// ---------------------------------------------------------------------------
// Fake spawn helpers
// ---------------------------------------------------------------------------

interface FakeChildProcess {
  stdout: { on(event: string, cb: (data: Buffer) => void): void }
  stderr: { on(event: string, cb: (data: Buffer) => void): void }
  on(event: "close", cb: (code: number) => void): void
  on(event: "error", cb: () => void): void
  kill(signal?: string): void
  killed: boolean
}

function createFakeSpawn(options: {
  lines?: string[]
  chunks?: string[]
  stderrText?: string
  exitCode?: number
  /** If true, the process never closes on its own (for abort testing) */
  hang?: boolean
  /** Callback to capture spawn args */
  onSpawn?: (command: string, args: string[], opts: SpawnInput) => void
}): SpawnFactory {
  return (command: string, args: string[], opts: SpawnInput): any => {
    options.onSpawn?.(command, args, opts)

    const proc: FakeChildProcess = {
      stdout: {
        on(_event: string, cb: (data: Buffer) => void) {
          if (options.lines) {
            cb(Buffer.from(options.lines.join("\n") + "\n"))
          } else if (options.chunks) {
            for (const chunk of options.chunks) {
              cb(Buffer.from(chunk))
            }
          }
        },
      },
      stderr: {
        on(_event: string, cb: (data: Buffer) => void) {
          if (options.stderrText) cb(Buffer.from(options.stderrText))
        },
      },
      on(event: string, cb: any) {
        if (event === "close" && !options.hang) {
          setTimeout(() => cb(options.exitCode ?? 0), 0)
        }
      },
      kill(_signal?: string) {
        proc.killed = true
        // When killed, emit close with non-zero
        if (options.hang) {
          setTimeout(() => {
            // Trigger the close handler — but we don't have access to the cb.
            // The runner listens via proc.on("close", ...) internally.
          }, 0)
        }
      },
      killed: false,
    }

    return proc
  }
}

/**
 * Hanging spawn that only resolves when killed, simulating abort.
 */
function createHangingSpawn(): { factory: SpawnFactory; triggerClose: (code: number) => void } {
  let closeCb: ((code: number) => void) | null = null

  const factory: SpawnFactory = () => {
    const proc = {
      stdout: { on() {} },
      stderr: { on() {} },
      on(event: string, cb: any) {
        if (event === "close") closeCb = cb
      },
      kill(signal?: string) {
        proc.killed = true
        // Simulate close after kill
        if (closeCb) setTimeout(() => closeCb!(1), 5)
      },
      killed: false,
    }
    return proc
  }

  return {
    factory,
    triggerClose: (code: number) => {
      if (closeCb) closeCb(code)
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("subagent-json-runner: basic event parsing", () => {
  test("collects assistant messages and usage from message_end events", async () => {
    const lines = [
      JSON.stringify({
        type: "message_end",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "hello world" }],
          usage: { input: 500, output: 100, cacheRead: 0, cacheWrite: 0, cost: { total: 0.02 }, totalTokens: 800 },
          stopReason: "end",
          model: "claude-3",
        },
      }),
    ]

    const runner = createJsonRunner({
      spawnFactory: createFakeSpawn({ lines }),
    })

    const result = await runner.run({
      prompt: "test prompt",
      agent: "my-agent",
      task: "do something",
      cwd: "/tmp",
      extraEnv: { PI_SUBAGENT_DEPTH: "1", PI_SUBAGENT_MAX_DEPTH: "2" },
    })

    expect(result.exitCode).toBe(0)
    expect(result.usage.turns).toBe(1)
    expect(result.usage.input).toBe(500)
    expect(result.stopReason).toBe("end")
    expect(result.model).toBe("claude-3")
  })

  test("handles tool_result_end events", async () => {
    const lines = [
      JSON.stringify({
        type: "message_end",
        message: {
          role: "assistant",
          content: [
            { type: "text", text: "running bash" },
            { type: "toolCall", name: "bash", arguments: { command: "ls" } },
          ],
          usage: { input: 100, output: 50, cost: { total: 0.01 }, totalTokens: 200 },
        },
      }),
      JSON.stringify({
        type: "tool_result_end",
        message: {
          role: "user",
          content: [{ type: "toolResult", name: "bash", result: "file1.ts\nfile2.ts" }],
        },
      }),
      JSON.stringify({
        type: "message_end",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "final answer" }],
          usage: { input: 200, output: 80, cost: { total: 0.02 }, totalTokens: 400 },
          stopReason: "end",
        },
      }),
    ]

    const runner = createJsonRunner({ spawnFactory: createFakeSpawn({ lines }) })
    const result = await runner.run({
      prompt: "test",
      agent: "a",
      task: "t",
      cwd: "/tmp",
    })

    expect(result.messages.length).toBe(3)
    expect(result.usage.turns).toBe(2)
    expect(result.exitCode).toBe(0)
  })

  test("ignores non-JSON lines", async () => {
    const lines = [
      "some debug output",
      "",
      JSON.stringify({
        type: "message_end",
        message: { role: "assistant", content: [{ type: "text", text: "ok" }] },
      }),
      "another non-json line",
    ]

    const runner = createJsonRunner({ spawnFactory: createFakeSpawn({ lines }) })
    const result = await runner.run({
      prompt: "test",
      agent: "a",
      task: "t",
      cwd: "/tmp",
    })

    expect(result.messages.length).toBe(1)
    expect(result.exitCode).toBe(0)
  })
})

describe("subagent-json-runner: chunked stdout", () => {
  test("correctly parses lines split across chunks", async () => {
    const fullEvent = JSON.stringify({
      type: "message_end",
      message: { role: "assistant", content: [{ type: "text", text: "second" }], usage: { input: 100 }, stopReason: "end" },
    })
    const chunks = [
      JSON.stringify({ type: "message_end", message: { role: "assistant", content: [{ type: "text", text: "first" }] } }) + "\n",
      fullEvent.slice(0, 20),
      fullEvent.slice(20) + "\n",
    ]

    const runner = createJsonRunner({ spawnFactory: createFakeSpawn({ chunks }) })
    const result = await runner.run({
      prompt: "test",
      agent: "a",
      task: "t",
      cwd: "/tmp",
    })

    expect(result.messages.length).toBe(2)
    expect(result.usage.input).toBe(100)
  })
})

describe("subagent-json-runner: onUpdate callback", () => {
  test("triggers onUpdate for each message_end and tool_result_end", async () => {
    const lines = [
      JSON.stringify({
        type: "message_end",
        message: { role: "assistant", content: [{ type: "text", text: "step 1" }] },
      }),
      JSON.stringify({
        type: "tool_result_end",
        message: { role: "user", content: [{ type: "toolResult", name: "bash", result: "ok" }] },
      }),
      JSON.stringify({
        type: "message_end",
        message: { role: "assistant", content: [{ type: "text", text: "step 2" }], stopReason: "end" },
      }),
    ]

    const updates: SingleResult[] = []
    const runner = createJsonRunner({ spawnFactory: createFakeSpawn({ lines }) })
    await runner.run({
      prompt: "test",
      agent: "a",
      task: "t",
      cwd: "/tmp",
      onUpdate: (partial) => updates.push(partial),
    })

    expect(updates.length).toBeGreaterThanOrEqual(3)
  })

  test("update payload contains current status and recent tool calls", async () => {
    const lines = [
      JSON.stringify({
        type: "message_end",
        message: {
          role: "assistant",
          content: [
            { type: "toolCall", name: "read", arguments: { path: "/foo.ts" } },
            { type: "text", text: "reading file" },
          ],
        },
      }),
    ]

    const updates: SingleResult[] = []
    const runner = createJsonRunner({ spawnFactory: createFakeSpawn({ lines }) })
    await runner.run({
      prompt: "test",
      agent: "a",
      task: "t",
      cwd: "/tmp",
      onUpdate: (partial) => updates.push(partial),
    })

    expect(updates.length).toBeGreaterThanOrEqual(1)
    const first = updates[0]
    expect(first.agent).toBe("a")
    expect(first.messages.length).toBeGreaterThanOrEqual(1)
  })
})

describe("subagent-json-runner: error handling", () => {
  test("non-zero exit code marks failure", async () => {
    const lines = [
      JSON.stringify({
        type: "message_end",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "error occurred" }],
          errorMessage: "something went wrong",
        },
      }),
    ]

    const runner = createJsonRunner({ spawnFactory: createFakeSpawn({ lines, exitCode: 1 }) })
    const result = await runner.run({
      prompt: "test",
      agent: "a",
      task: "t",
      cwd: "/tmp",
    })

    expect(result.exitCode).toBe(1)
    expect(result.errorMessage).toBe("something went wrong")
  })

  test("AbortSignal kills the child process", async () => {
    const ac = new AbortController()
    const { factory, triggerClose } = createHangingSpawn()

    const runner = createJsonRunner({ spawnFactory: factory })
    const promise = runner.run({
      prompt: "test",
      agent: "a",
      task: "t",
      cwd: "/tmp",
      signal: ac.signal,
    })

    // Abort immediately
    ac.abort()

    try {
      await promise
    } catch (e) {
      expect((e as Error).message).toContain("aborted")
    }
  })
})

describe("subagent-json-runner: spawn arguments", () => {
  test("passes correct args including --mode json --no-session", async () => {
    let capturedArgs: string[] = []

    const runner = createJsonRunner({
      spawnFactory: createFakeSpawn({
        onSpawn: (_cmd, args) => { capturedArgs = args },
      }),
    })

    await runner.run({
      prompt: "my task",
      agent: "a",
      task: "t",
      cwd: "/tmp",
      extraFlags: ["--no-skills"],
      extraEnv: { PI_SUBAGENT_DEPTH: "1" },
    })

    expect(capturedArgs).toContain("--mode")
    expect(capturedArgs).toContain("json")
    expect(capturedArgs).toContain("--no-session")
    expect(capturedArgs).toContain("--no-skills")
    expect(capturedArgs).toContain("my task")
  })

  test("per-process env includes extraEnv without mutating global process.env", async () => {
    let capturedEnv: Record<string, string | undefined> = {}
    const originalDepth = process.env.PI_SUBAGENT_DEPTH

    const runner = createJsonRunner({
      spawnFactory: createFakeSpawn({
        onSpawn: (_cmd, _args, opts) => { capturedEnv = opts.env ?? {} },
      }),
    })

    await runner.run({
      prompt: "test",
      agent: "a",
      task: "t",
      cwd: "/tmp",
      extraEnv: { PI_SUBAGENT_DEPTH: "3", PI_SUBAGENT_MAX_DEPTH: "4" },
    })

    expect(capturedEnv.PI_SUBAGENT_DEPTH).toBe("3")
    expect(capturedEnv.PI_SUBAGENT_MAX_DEPTH).toBe("4")
    expect(process.env.PI_SUBAGENT_DEPTH).toBe(originalDepth)
  })
})
