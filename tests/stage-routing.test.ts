import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent"
import ceCoreExtension from "../extensions/ce-core/index"
import { applyStageStrategies, looksLikeFileCarrier, parseStageSkillName } from "../extensions/ce-core/utils/stage-routing"

const carrier = (body: string) => `<file name="/tmp/stage prompt.txt">\n${body}\n</file>\n`
let repoRoot: string

beforeAll(async () => {
  repoRoot = await mkdtemp(path.join(tmpdir(), "ce-stage-routing-"))
  await mkdir(path.join(repoRoot, CONFIG_DIR_NAME))
  await writeFile(path.join(repoRoot, CONFIG_DIR_NAME, "settings.json"), JSON.stringify({
    modelStrategy: { "03-work": "test-provider/target" },
    thinkingStrategy: { "03-work": "high" },
  }))
})

afterAll(async () => {
  await rm(repoRoot, { recursive: true, force: true })
})

function inputFixture() {
  const models: string[] = []
  const thinking: string[] = []
  let input!: (event: { text: string, source: string, streamingBehavior?: string }, ctx: typeof context) => Promise<unknown>
  const context = {
    cwd: repoRoot,
    mode: "tui",
    model: { provider: "test-provider", id: "initial" },
    modelRegistry: { find: (provider: string, id: string) => ({ provider, id }) },
    sessionManager: { getBranch: (): Array<{ type: string, message?: { role: string } }> => [] },
    ui: { notify() {} },
  }
  ceCoreExtension({
    registerTool() {},
    registerCommand() {},
    on(event: string, handler: typeof input) {
      if (event === "input") input = handler
    },
    async setModel(model: { id: string }) { models.push(model.id); return true },
    getThinkingLevel: () => "medium",
    setThinkingLevel(level: string) { thinking.push(level) },
  } as never)
  return { input, context, models, thinking }
}

describe("stage command carrier parsing", () => {
  test("carrier parsing is opt-in (safe default rejects file carriers)", () => {
    expect(parseStageSkillName(carrier("/skill:03-work task"))).toBeNull()
  })

  test("accepts a complete single pi file carrier with a leading stage command", () => {
    expect(parseStageSkillName(carrier("/skill:03-work task"), true)).toBe("03-work")
    expect(parseStageSkillName(` \n${carrier(" \n/skill:02-plan task\n")} `, true)).toBe("02-plan")
    expect(parseStageSkillName('<file name="/tmp/p.txt">\r\n/skill:03-work task\r\n</file>', true)).toBe("03-work")
  })

  test("preserves direct commands and rejects unknown skills", () => {
    expect(parseStageSkillName(" \n/skill:03-work task")).toBe("03-work")
    expect(parseStageSkillName("/skill:unrelated task")).toBeNull()
    expect(parseStageSkillName(carrier("/skill:unrelated task"), true)).toBeNull()
  })

  test.each([
    carrier("Example:\n/skill:03-work task"),
    carrier("```text\n/skill:03-work task\n```"),
    `Read this:\n${carrier("/skill:03-work task")}`,
    `${carrier("/skill:03-work task")}extra text`,
    `${carrier("/skill:03-work task")}${carrier("reference")}`,
    carrier(carrier("/skill:03-work task")),
    carrier(`/skill:03-work task\n${carrier("reference")}`),
    '<file name="/tmp/p.txt">\n/skill:03-work task',
    '<file>\n/skill:03-work task\n</file>',
    '<file name="/tmp/p.txt">/skill:03-work task</file>',
  ])("rejects reference examples or ambiguous/malformed carriers: %s", (text) => {
    expect(parseStageSkillName(text, true)).toBeNull()
  })
})

describe("stage carrier input hook", () => {
  test("routes both model and thinking for the first wrapped user input", async () => {
    const { input, context, models, thinking } = inputFixture()
    const result = await input({ text: carrier("/skill:03-work task"), source: "interactive" }, context)
    expect(result).toEqual({ action: "continue" })
    expect(models).toEqual(["target"])
    expect(thinking).toEqual(["high"])
  })

  test("does not route a wrapped command after an earlier user message", async () => {
    const { input, context, models, thinking } = inputFixture()
    context.sessionManager.getBranch = () => [{ type: "message", message: { role: "user" } }]
    await input({ text: carrier("/skill:03-work task"), source: "interactive" }, context)
    expect(models).toEqual([])
    expect(thinking).toEqual([])
    // Explicit commands retain their existing later-input behavior.
    await input({ text: "/skill:03-work task", source: "interactive" }, context)
    expect(models).toEqual(["target"])
  })

  test("ignores non-user entries when deciding whether this is the first user input", async () => {
    const { input, context, models } = inputFixture()
    context.sessionManager.getBranch = () => [{ type: "custom" }, { type: "message", message: { role: "assistant" } }]
    await input({ text: carrier("/skill:03-work task"), source: "rpc" }, context)
    expect(models).toEqual(["target"])
  })

  test("does not route extension input or streaming steers", async () => {
    const { input, context, models, thinking } = inputFixture()
    await input({ text: carrier("/skill:03-work task"), source: "extension" }, context)
    await input({ text: carrier("/skill:03-work task"), source: "interactive", streamingBehavior: "steer" }, context)
    expect(models).toEqual([])
    expect(thinking).toEqual([])
  })

  test("already-selected targets remain idempotent", async () => {
    const { input, context, models } = inputFixture()
    context.model.id = "target"
    await input({ text: carrier("/skill:03-work task"), source: "interactive" }, context)
    expect(models).toEqual([])
  })
})

async function diagnosticFixture(settings: object) {
  const cwd = await mkdtemp(path.join(repoRoot, "notice-"))
  await mkdir(path.join(cwd, CONFIG_DIR_NAME))
  await writeFile(path.join(cwd, CONFIG_DIR_NAME, "settings.json"), JSON.stringify(settings))
  return {
    context: {
      cwd,
      mode: "print",
      model: { provider: "test-provider", id: "initial" },
      modelRegistry: { find: (provider: string, id: string): object | undefined => ({ provider, id }) },
      ui: { notify: (_message: string, _level?: string) => {} },
    },
    pi: {
      setModel: async () => true,
      getThinkingLevel: () => "medium",
      setThinkingLevel: (_level: string) => {},
    },
  }
}

async function captureRouting(fixture: Awaited<ReturnType<typeof diagnosticFixture>>) {
  const stderr = spyOn(process.stderr, "write").mockImplementation(() => true)
  const stdout = spyOn(process.stdout, "write").mockImplementation(() => true)
  const ui = spyOn(fixture.context.ui, "notify")
  try {
    await applyStageStrategies(fixture.pi as never, fixture.context, "03-work")
    return {
      stderr: stderr.mock.calls.map(([chunk]) => String(chunk)).join(""),
      stdoutCalls: stdout.mock.calls.length,
      uiCalls: [...ui.mock.calls],
    }
  } finally {
    stderr.mockRestore()
    stdout.mockRestore()
    ui.mockRestore()
  }
}

for (const mode of ["print", "json"]) {
  describe(`${mode} routing diagnostics`, () => {
    test("writes model/thinking success notices as JSON lines only to stderr", async () => {
      const fixture = await diagnosticFixture({
        modelStrategy: { "03-work": "test-provider/target" },
        thinkingStrategy: { "03-work": "high" },
      })
      fixture.context.mode = mode
      const captured = await captureRouting(fixture)
      expect(captured.stdoutCalls).toBe(0)
      expect(captured.uiCalls).toEqual([])
      expect(captured.stderr.trim().split("\n").map(line => JSON.parse(line))).toEqual([
        { source: "ce-core", event: "stage-routing", stage: "03-work", level: "info", message: "Switched model for 03-work: test-provider/target" },
        { source: "ce-core", event: "stage-routing", stage: "03-work", level: "info", message: "Switched thinking level for 03-work: high" },
      ])
    })

    test.each([
      ["invalid reference", " ", "Invalid modelStrategy for 03-work:  "],
      ["missing model", "test-provider/absent", "Model not found for 03-work: test-provider/absent"],
      ["missing API key", "test-provider/target", "No API key for 03-work: test-provider/target"],
    ])("makes %s warning observable", async (kind, reference, message) => {
      const fixture = await diagnosticFixture({ modelStrategy: { "03-work": reference } })
      fixture.context.mode = mode
      if (kind === "missing model") fixture.context.modelRegistry.find = () => undefined
      if (kind === "missing API key") fixture.pi.setModel = async () => false
      const captured = await captureRouting(fixture)
      expect(captured.stdoutCalls).toBe(0)
      expect(captured.uiCalls).toEqual([])
      expect(JSON.parse(captured.stderr)).toEqual({ source: "ce-core", event: "stage-routing", stage: "03-work", level: "warning", message })
    })

    test("escapes unknown thinking values and reports the medium fallback", async () => {
      const fixture = await diagnosticFixture({ thinkingStrategy: { "03-work": "bad\nvalue" } })
      fixture.context.mode = mode
      const captured = await captureRouting(fixture)
      expect(captured.stderr.trim().split("\n")).toHaveLength(1)
      expect(JSON.parse(captured.stderr)).toEqual({
        source: "ce-core", event: "stage-routing", stage: "03-work", level: "warning",
        message: "Unknown thinking level for 03-work: bad\nvalue, falling back to medium",
      })
      expect(captured.stdoutCalls).toBe(0)
      expect(captured.uiCalls).toEqual([])
    })

    test("no strategy or an already-selected model produces no notices", async () => {
      for (const modelStrategy of [{}, { "03-work": "test-provider/initial" }]) {
        const fixture = await diagnosticFixture({ modelStrategy })
        fixture.context.mode = mode
        const captured = await captureRouting(fixture)
        expect(captured.stderr).toBe("")
        expect(captured.stdoutCalls).toBe(0)
        expect(captured.uiCalls).toEqual([])
      }
    })
  })
}

for (const mode of ["tui", "rpc"]) {
  test(`${mode} keeps existing UI notifications without stderr output`, async () => {
    const fixture = await diagnosticFixture({ modelStrategy: { "03-work": "test-provider/target" } })
    fixture.context.mode = mode
    const captured = await captureRouting(fixture)
    expect(captured.stderr).toBe("")
    expect(captured.stdoutCalls).toBe(0)
    expect(captured.uiCalls).toEqual([["Switched model for 03-work: test-provider/target", "info"]])
  })
}


test("looksLikeFileCarrier shares the wrapper prefix check", () => {
  expect(looksLikeFileCarrier("  <file name=\"/tmp/p.txt\">")).toBe(true)
  expect(looksLikeFileCarrier("/skill:03-work")).toBe(false)
})
