import { describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import {
  extractAssistantText,
  loadPromptTemplate,
  runIsolatedReview,
  toolExecutionPreview,
  type ReviewChildProcess,
  type SpawnFn,
  type VersionProbe,
} from "../extensions/ce-core/tools/isolated-review"

function makeFakeChild() {
  const listeners: Record<string, Array<(data: unknown) => void>> = {}
  const child = {
    stdout: { on: (event: "data", cb: (chunk: string) => void) => void (listeners[`stdout:${event}`] ??= []).push(cb as (data: unknown) => void) },
    stderr: { on: (event: "data", cb: (chunk: string) => void) => void (listeners[`stderr:${event}`] ??= []).push(cb as (data: unknown) => void) },
    on: (event: "exit", cb: (code: number | null) => void) => void (listeners[event] ??= []).push(cb as (data: unknown) => void),
    killed: false,
  }
  const extended = child as typeof child & ReviewChildProcess & {
    emitExit: (code: number | null) => void
    emitStdout: (chunk: string) => void
    emitStderr: (chunk: string) => void
  }
  extended.kill = () => {
    child.killed = true
    for (const cb of listeners.exit ?? []) cb(null)
  }
  extended.emitExit = (code: number | null) => {
    for (const cb of listeners.exit ?? []) cb(code)
  }
  extended.emitStdout = (chunk: string) => {
    for (const cb of listeners["stdout:data"] ?? []) cb(chunk)
  }
  extended.emitStderr = (chunk: string) => {
    for (const cb of listeners["stderr:data"] ?? []) cb(chunk)
  }
  return extended
}

function makeSpawnFn(children: ReviewChildProcess[], calls: Array<{ command: string; args: string[] }>): SpawnFn {
  return (_command, args, _options) => {
    const child = children[calls.length] ?? makeFakeChild()
    calls.push({ command: _command, args })
    return child
  }
}

const okVersionProbe: VersionProbe = async () => "0.85.1"

function tmpFindingsPath(): string {
  return path.join(mkdtempSync(path.join(tmpdir(), "ir-test-")), "findings.md")
}

function cleanup(dir: string) {
  rmSync(dir, { recursive: true, force: true })
}

describe("extractAssistantText", () => {
  test("extracts text from the last assistant message_end event", () => {
    const lines = [
      '{"type":"session","version":3,"id":"u1"}',
      '{"type":"agent_start"}',
      '{"type":"message_end","message":{"role":"assistant","content":[{"type":"text","text":"first"}]}}',
      '{"type":"tool_execution_start","toolCallId":"t1","toolName":"read","args":{}}',
      '{"type":"message_end","message":{"role":"assistant","content":[{"type":"text","text":"final "},{"type":"text","text":"output"}]}}',
    ]
    expect(extractAssistantText(lines)).toBe("final output")
  })

  test("returns null when no assistant message exists", () => {
    const lines = ['{"type":"session","version":3,"id":"u1"}', '{"type":"agent_start"}']
    expect(extractAssistantText(lines)).toBeNull()
  })

  test("ignores malformed JSON lines", () => {
    const lines = ["not json at all", '{"type":"message_end","message":{"role":"assistant","content":[{"type":"text","text":"ok"}]}}']
    expect(extractAssistantText(lines)).toBe("ok")
  })
})

describe("toolExecutionPreview", () => {
  test("previews tool_execution_start with the primary arg value", () => {
    const line = JSON.stringify({ type: "tool_execution_start", toolCallId: "t1", toolName: "read", args: { file_path: "/repo/diff.patch" } })
    expect(toolExecutionPreview(line)).toBe("tool read: /repo/diff.patch")
  })

  test("flattens and truncates long args like bash commands", () => {
    const line = JSON.stringify({ type: "tool_execution_start", toolName: "bash", args: { command: `rg pattern\n${"x".repeat(200)}` } })
    const preview = toolExecutionPreview(line)
    expect(preview).toMatch(/^tool bash: rg pattern x+/)
    // maxChars caps the args portion; the "tool bash: " prefix adds 11 chars
    expect(preview!.length).toBeLessThanOrEqual("tool bash: ".length + 120)
    expect(preview!.endsWith("…"))
  })

  test("previews tool_execution_end only when it errored", () => {
    const failed = JSON.stringify({ type: "tool_execution_end", toolCallId: "t1", toolName: "bash", isError: true, result: "boom" })
    expect(toolExecutionPreview(failed)).toBe("tool bash failed")
    const ok = JSON.stringify({ type: "tool_execution_end", toolCallId: "t1", toolName: "bash", isError: false, result: { big: "payload" } })
    expect(toolExecutionPreview(ok)).toBeNull()
  })

  test("falls back to stringified args when no known key matches", () => {
    const line = JSON.stringify({ type: "tool_execution_start", toolName: "custom", args: { nested: { a: 1 } } })
    expect(toolExecutionPreview(line)).toBe('tool custom: {"nested":{"a":1}}')
  })

  test("returns null for non-tool or malformed lines", () => {
    expect(toolExecutionPreview("not json")).toBeNull()
    expect(toolExecutionPreview('{"type":"message_end","message":{"role":"assistant","content":[]}}')).toBeNull()
    expect(toolExecutionPreview('{"type":"agent_start"}')).toBeNull()
  })
})

describe("runIsolatedReview", () => {
  test("returns completed with reviewer output when child succeeds and writes findings", async () => {
    const findingsPath = tmpFindingsPath()
    const child = makeFakeChild()
    const calls: Array<{ command: string; args: string[] }> = []
    const spawnFn = makeSpawnFn([child], calls)

    const pending = runIsolatedReview(
      { repoRoot: "/repo", diffBase: "main", findingsPath, promptTemplate: "REVIEW PROMPT" },
      { spawnFn, probeCliVersion: okVersionProbe },
    )

    queueMicrotask(() => {
      child.emitStdout('{"type":"session","version":3,"id":"u1"}\n')
      child.emitStdout('{"type":"message_end","message":{"role":"assistant","content":[{"type":"text","text":"review done"}]}}\n')
      require("node:fs").writeFileSync(findingsPath, "# findings")
      child.emitExit(0)
    })

    const result = await pending

    if (result.status !== "completed") throw new Error(`expected completed, got ${result.status}`)
    expect(result.isolation).toBe("isolated")
    expect(result.reviewerOutput).toBe("review done")
    expect(result.findingsWritten).toBe(true)
    expect(calls[0]?.command).toBe("pi")
    expect(calls[0]?.args).toContain("--mode")
    expect(calls[0]?.args).toContain("json")
    expect(calls[0]?.args).toContain("--no-session")
    expect(calls[0]?.args.find((arg) => arg.startsWith("REVIEW PROMPT"))).toBeDefined()
    cleanup(path.dirname(findingsPath))
  })

  test("degrades with cli_not_found when pi probe returns null", async () => {
    const findingsPath = tmpFindingsPath()
    const calls: Array<{ command: string; args: string[] }> = []
    const spawnFn = makeSpawnFn([], calls)

    const result = await runIsolatedReview(
      { repoRoot: "/repo", diffBase: "main", findingsPath, promptTemplate: "P" },
      { spawnFn, probeCliVersion: async () => null },
    )

    if (result.status !== "degraded") throw new Error(`expected degraded, got ${result.status}`)
    expect(result.spawnError).toBe("cli_not_found")
    expect(calls.length).toBe(0)
    expect(existsSync(findingsPath)).toBe(true)
    const content = readFileSync(findingsPath, "utf8")
    expect(content).toContain("isolation: degraded")
    expect(content).toContain("spawn_error: cli_not_found")
    cleanup(path.dirname(findingsPath))
  })

  test("degrades with version when pi is older than minimum", async () => {
    const findingsPath = tmpFindingsPath()
    const calls: Array<{ command: string; args: string[] }> = []
    const spawnFn = makeSpawnFn([], calls)

    const result = await runIsolatedReview(
      { repoRoot: "/repo", diffBase: "main", findingsPath, promptTemplate: "P" },
      { spawnFn, probeCliVersion: async () => "0.79.0" },
    )

    if (result.status !== "degraded") throw new Error(`expected degraded, got ${result.status}`)
    expect(result.spawnError).toBe("version")
    expect(calls.length).toBe(0)
    cleanup(path.dirname(findingsPath))
  })

  test("retries exactly once on timeout, then degrades with stderr tail", async () => {
    const findingsPath = tmpFindingsPath()
    const children = [makeFakeChild(), makeFakeChild()]
    const calls: Array<{ command: string; args: string[] }> = []
    const spawnFn: SpawnFn = (command, args, options) => {
      const child = children[calls.length] ?? makeFakeChild()
      calls.push({ command, args })
      // emit stderr after the current stack so collectors have subscribed
      queueMicrotask(() => {
        child.emitStderr("api hang suspected\n")
      })
      return child
    }

    const result = await runIsolatedReview(
      { repoRoot: "/repo", diffBase: "main", findingsPath, promptTemplate: "P", timeoutMs: 15 },
      { spawnFn, probeCliVersion: okVersionProbe },
    )

    if (result.status !== "degraded") throw new Error(`expected degraded, got ${result.status}`)
    expect(result.spawnError).toBe("timeout")
    expect(calls.length).toBe(2)
    const content = readFileSync(findingsPath, "utf8")
    expect(content).toContain("spawn_error: timeout")
    expect(content).toContain("api hang suspected")
    cleanup(path.dirname(findingsPath))
  }, 5000)

  test("injects incremental review context into the prompt", async () => {
    const findingsPath = tmpFindingsPath()
    const child = makeFakeChild()
    const calls: Array<{ command: string; args: string[] }> = []
    const spawnFn = makeSpawnFn([child], calls)

    const pending = runIsolatedReview(
      {
        repoRoot: "/repo",
        diffBase: "main",
        findingsPath,
        promptTemplate: "REVIEW PROMPT",
        incremental: { previousFindingsPath: "/repo/docs/plans/prev-findings.md" },
      },
      { spawnFn, probeCliVersion: okVersionProbe },
    )

    queueMicrotask(() => {
      child.emitExit(0)
    })

    await pending

    const promptArg = calls[0]?.args.find((arg) => arg.startsWith("REVIEW PROMPT")) ?? ""
    expect(promptArg).toContain("/repo/docs/plans/prev-findings.md")
    cleanup(path.dirname(findingsPath))
  })

  test("aborts and kills the child when signal fires", async () => {
    const findingsPath = tmpFindingsPath()
    const child = makeFakeChild()
    const calls: Array<{ command: string; args: string[] }> = []
    const spawnFn = makeSpawnFn([child], calls)
    const controller = new AbortController()

    const pending = runIsolatedReview(
      { repoRoot: "/repo", diffBase: "main", findingsPath, promptTemplate: "P" },
      { spawnFn, probeCliVersion: okVersionProbe },
      controller.signal,
    )

    queueMicrotask(() => controller.abort())

    const result = await pending

    if (result.status !== "aborted") throw new Error(`expected aborted, got ${result.status}`)
    expect(child.killed).toBe(true)
    cleanup(path.dirname(findingsPath))
  })

  test("nonzero exit maps to child_failed with stderr tail, not cli_not_found", async () => {
    const findingsPath = tmpFindingsPath()
    const child = makeFakeChild()
    const calls: Array<{ command: string; args: string[] }> = []
    const spawnFn = makeSpawnFn([child], calls)

    const pending = runIsolatedReview(
      { repoRoot: "/repo", diffBase: "main", findingsPath, promptTemplate: "P" },
      { spawnFn, probeCliVersion: okVersionProbe },
    )

    queueMicrotask(() => {
      child.emitStderr("model api exploded\n")
      child.emitExit(3)
    })

    const result = await pending

    if (result.status !== "degraded") throw new Error(`expected degraded, got ${result.status}`)
    expect(result.spawnError).toBe("child_failed")
    const content = readFileSync(findingsPath, "utf8")
    expect(content).toContain("spawn_error: child_failed")
    expect(content).toContain("exited with code 3")
    expect(content).toContain("model api exploded")
    cleanup(path.dirname(findingsPath))
  })

  test("degrades with cli_not_found when spawn throws ENOENT", async () => {
    const findingsPath = tmpFindingsPath()
    const spawnFn: SpawnFn = () => {
      const err = new Error("spawn pi ENOENT") as NodeJS.ErrnoException
      err.code = "ENOENT"
      throw err
    }

    const result = await runIsolatedReview(
      { repoRoot: "/repo", diffBase: "main", findingsPath, promptTemplate: "P" },
      // probe passes but binary vanishes before spawn
      { spawnFn, probeCliVersion: okVersionProbe },
    )

    if (result.status !== "degraded") throw new Error(`expected degraded, got ${result.status}`)
    expect(result.spawnError).toBe("cli_not_found")
    cleanup(path.dirname(findingsPath))
  })
})

describe("loadPromptTemplate", () => {
  test("default resolves the packaged asset relative to the module, not repoRoot", () => {
    const result = loadPromptTemplate("/definitely/not/a/real/repo")
    expect(result.source).toBe("asset")
    expect(result.template).toContain("do NOT fix code")
    expect(result.template).toContain("Rules loaded:")
  })

  test("relative promptPath resolves against repoRoot before cwd", () => {
    const result = loadPromptTemplate("/repo", "custom-prompt.md")
    // /repo/custom-prompt.md does not exist in the test env -> explicit fallback
    expect(result.source).toBe("fallback")
  })

  test("relative promptPath resolves against repoRoot, not cwd", () => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), "ir-root-"))
    require("node:fs").writeFileSync(path.join(repoRoot, "custom-prompt.md"), "REPO TEMPLATE")
    // cwd is the super-pi repo, which has no custom-prompt.md at its root —
    // hitting the override proves the base was repoRoot
    const result = loadPromptTemplate(repoRoot, "custom-prompt.md")
    expect(result.source).toBe("override")
    expect(result.template).toBe("REPO TEMPLATE")
    cleanup(repoRoot)
  })

  test("explicit promptPath override wins over the packaged asset", () => {
    const custom = path.join(mkdtempSync(path.join(tmpdir(), "ir-prompt-")), "custom.md")
    require("node:fs").writeFileSync(custom, "CUSTOM TEMPLATE")
    const result = loadPromptTemplate("/repo", custom)
    expect(result.source).toBe("override")
    expect(result.template).toBe("CUSTOM TEMPLATE")
    cleanup(path.dirname(custom))
  })
})

describe("progress reporting (onProgress)", () => {
  test("reports spawn start and each assistant message preview; ignores non-assistant events", async () => {
    const findingsPath = tmpFindingsPath()
    const child = makeFakeChild()
    const spawnFn = makeSpawnFn([child], [])
    const progress: string[] = []
    const messageEnd = JSON.stringify({
      type: "message_end",
      message: { role: "assistant", content: [{ type: "text", text: "Reading diff against main\nsecond line" }] },
    })

    const pending = runIsolatedReview(
      { repoRoot: "/repo", diffBase: "main", findingsPath, promptTemplate: "P" },
      { spawnFn, probeCliVersion: okVersionProbe },
      undefined,
      (text) => progress.push(text),
    )

    queueMicrotask(() => {
      child.emitStdout(JSON.stringify({ type: "message_start", message: { role: "assistant" } }) + "\n")
      child.emitStdout(messageEnd + "\n")
      child.emitExit(0)
    })

    const result = await pending
    expect(result.status).toBe("completed")
    // spawn-start expectation message
    expect(progress.some((t) => t.includes("spawned"))).toBe(true)
    // exactly one preview for the one assistant message_end; newline flattened
    expect(progress.filter((t) => t.includes("Reading diff against main second line")).length).toBe(1)
    expect(progress.length).toBe(2)
    cleanup(path.dirname(findingsPath))
  })

  test("reports tool_execution events so tool-only stretches keep the UI moving", async () => {
    const findingsPath = tmpFindingsPath()
    const child = makeFakeChild()
    const spawnFn = makeSpawnFn([child], [])
    const progress: string[] = []

    const pending = runIsolatedReview(
      { repoRoot: "/repo", diffBase: "main", findingsPath, promptTemplate: "P" },
      { spawnFn, probeCliVersion: okVersionProbe },
      undefined,
      (text) => progress.push(text),
    )

    queueMicrotask(() => {
      child.emitStdout(JSON.stringify({ type: "tool_execution_start", toolCallId: "t1", toolName: "read", args: { file_path: "/repo/rules/review.md" } }) + "\n")
      child.emitStdout(JSON.stringify({ type: "tool_execution_end", toolCallId: "t1", toolName: "read", isError: false, result: "ok" }) + "\n")
      child.emitStdout(JSON.stringify({ type: "tool_execution_start", toolCallId: "t2", toolName: "bash", args: { command: "rg TODO" } }) + "\n")
      child.emitExit(0)
    })

    const result = await pending
    expect(result.status).toBe("completed")
    expect(progress.some((t) => t.includes("tool read: /repo/rules/review.md"))).toBe(true)
    // non-error tool_execution_end stays silent
    expect(progress.some((t) => t.includes("tool read failed"))).toBe(false)
    expect(progress.some((t) => t.includes("tool bash: rg TODO"))).toBe(true)
    cleanup(path.dirname(findingsPath))
  })

  test("aborted run writes evidence findings (isolation marker, elapsed, stderr tail)", async () => {
    const findingsPath = tmpFindingsPath()
    const child = makeFakeChild()
    const spawnFn = makeSpawnFn([child], [])
    const controller = new AbortController()

    const pending = runIsolatedReview(
      { repoRoot: "/repo", diffBase: "main", findingsPath, promptTemplate: "P" },
      { spawnFn, probeCliVersion: okVersionProbe },
      controller.signal,
    )

    queueMicrotask(() => {
      child.emitStderr("mid-run noise\n")
      controller.abort()
    })

    const result = await pending
    if (result.status !== "aborted") throw new Error(`expected aborted, got ${result.status}`)
    expect(child.killed).toBe(true)
    expect(result.findingsWritten).toBe(true)
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0)
    const content = readFileSync(findingsPath, "utf8")
    expect(content).toContain("isolation: aborted")
    expect(content).toContain("mid-run noise")
    expect(content).toMatch(/aborted after \d+s/)
    cleanup(path.dirname(findingsPath))
  })
})

describe("isolated_review tool execute (onUpdate forwarding + abort summary)", () => {
  test("forwards progress to onUpdate and reports elapsed in the aborted summary", async () => {
    const { createIsolatedReviewTool } = await import("../extensions/ce-core/tools/isolated-review")
    const findingsPath = tmpFindingsPath()
    const child = makeFakeChild()
    const spawnFn = makeSpawnFn([child], [])
    const controller = new AbortController()
    const updates: string[] = []
    const tool = createIsolatedReviewTool({ spawnFn, probeCliVersion: okVersionProbe })

    const pending = tool.execute(
      { repoRoot: "/repo", diffBase: "main", findingsPath },
      controller.signal,
      (update) => {
        for (const block of update.content) if (block.type === "text") updates.push(block.text)
      },
    )

    queueMicrotask(() => controller.abort())

    const result = await pending
    expect(result.summary).toMatch(/aborted after \d+s/)
    expect(updates.some((t) => t.includes("spawned"))).toBe(true)
    cleanup(path.dirname(findingsPath))
  })
})
