import { describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { createContextHandoffTool } from "../extensions/ce-core/tools/context-handoff"

function readRepoFile(relativePath: string): string {
  const repoRoot = path.resolve(__dirname, "..")
  return readFileSync(path.join(repoRoot, relativePath), "utf8")
}

describe("context_handoff", () => {
  test("load/latest/status returns safe empty state when no handoff exists", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-empty-${Date.now()}`
    const tool = createContextHandoffTool()

    const loadResult = await tool.execute({
      operation: "load",
      repoRoot,
    })

    const latestResult = await tool.execute({
      operation: "latest",
      repoRoot,
    })

    const statusResult = await tool.execute({
      operation: "status",
      repoRoot,
    })

    expect(loadResult.operation).toBe("load")
    expect(loadResult.found).toBe(false)
    expect(loadResult.path).toBeUndefined()

    expect(latestResult.operation).toBe("latest")
    expect(latestResult.found).toBe(false)

    expect(statusResult.operation).toBe("status")
    expect(statusResult.contextHealth).toBe("watch")
    expect(statusResult.recommendNewSession).toBe(false)
  })

  test("save writes latest handoff markdown and dated handoff file", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-save-${Date.now()}`
    const tool = createContextHandoffTool()

    const result = await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "01-brainstorm",
      nextStage: "02-plan",
      contextHealth: "heavy",
      activeFiles: [
        "docs/brainstorms/2026-04-24-token-context-workflow-optimization-requirements.md",
      ],
      blocker: "N/A",
      verification: "artifact written",
      artifacts: {
        brainstorm: "docs/brainstorms/2026-04-24-token-context-workflow-optimization-requirements.md",
      },
      handoffMarkdown: "## Current Task\nCreate plan from approved requirements.\n",
    })

    expect(result.operation).toBe("save")
    expect(result.path).toContain(".context/compound-engineering/handoffs/")
    expect(result.latestPath).toContain(".context/compound-engineering/handoffs/latest.md")
    expect(result.recommendNewSession).toBe(true)

    expect(existsSync(path.join(repoRoot, result.path!))).toBe(true)
    expect(existsSync(path.join(repoRoot, result.latestPath!))).toBe(true)

    const savedText = readFileSync(path.join(repoRoot, result.latestPath!), "utf8")
    expect(savedText).toContain("## Current Task")
  })

  test("status recommends new session only for heavy/critical cross-phase", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-status-${Date.now()}`
    const tool = createContextHandoffTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "02-plan",
      nextStage: "03-work",
      contextHealth: "heavy",
      handoffMarkdown: "heavy handoff",
    })

    const heavy = await tool.execute({ operation: "status", repoRoot })
    expect(heavy.recommendNewSession).toBe(true)

    await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "03-work",
      nextStage: "03-work",
      contextHealth: "heavy",
      handoffMarkdown: "same phase",
    })

    const samePhaseHeavy = await tool.execute({ operation: "status", repoRoot })
    expect(samePhaseHeavy.recommendNewSession).toBe(false)

    await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "03-work",
      nextStage: "04-review",
      contextHealth: "watch",
      handoffMarkdown: "watch cross phase",
    })

    const watchCrossPhase = await tool.execute({ operation: "status", repoRoot })
    expect(watchCrossPhase.recommendNewSession).toBe(false)
  })

  test("load returns latest handoff metadata and markdown", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-load-${Date.now()}`
    const tool = createContextHandoffTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "01-brainstorm",
      nextStage: "02-plan",
      contextHealth: "critical",
      activeFiles: ["skills/02-plan/SKILL.md"],
      handoffMarkdown: "## Next\n/skill:02-plan\n",
    })

    const result = await tool.execute({
      operation: "load",
      repoRoot,
    })

    expect(result.operation).toBe("load")
    expect(result.found).toBe(true)
    expect(result.currentStage).toBe("01-brainstorm")
    expect(result.nextStage).toBe("02-plan")
    expect(result.contextHealth).toBe("critical")
    expect(result.handoffMarkdown).toContain("/skill:02-plan")
  })

  test("save generates evidence-first default handoff when markdown is omitted", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-template-${Date.now()}`
    const tool = createContextHandoffTool()

    const result = await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "03-work",
      nextStage: "04-review",
      contextHealth: "watch",
      activeFiles: [
        "extensions/ce-core/tools/context-handoff.ts",
        "tests/context-handoff.test.ts",
      ],
      blocker: "N/A",
      verification: "bun test tests/context-handoff.test.ts",
      artifacts: {
        plan: "docs/plans/2026-04-24-handoff-lite-template-upgrade-plan.md",
      },
    })

    expect(result.latestPath).toBe(".context/compound-engineering/handoffs/latest.md")

    const savedText = readFileSync(path.join(repoRoot, result.latestPath!), "utf8")
    expect(savedText).toContain("## Current Task")
    expect(savedText).toContain("## Hot Context")
    expect(savedText).toContain("## Verified Facts")
    expect(savedText).toContain("## Active Files")
    expect(savedText).toContain("## Artifacts")
    expect(savedText).toContain("## Current Blocker")
    expect(savedText).toContain("## Verification")
    expect(savedText).toContain("## Do Not Repeat")
    expect(savedText).toContain("## Next Minimal Step")
  })

  // --- Unit 1: Structured runtime-memory fields ---

  test("save persists all five new structured fields in context-state.json", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-new-fields-${Date.now()}`
    const tool = createContextHandoffTool()

    const result = await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "03-work",
      nextStage: "04-review",
      contextHealth: "watch",
      activeFiles: ["src/a.ts"],
      currentTruth: ["The API returns 200 for valid requests", "Migration 014 is applied"],
      invalidatedAssumptions: ["Legacy format is still supported"],
      openDecisions: ["Choose between REST and GraphQL for v2"],
      recentlyAccessedFiles: ["src/a.ts", "src/b.ts", "src/c.ts"],
      compressionRisk: ["Large test output may push context over budget"],
    })

    // Result should return new fields
    expect(result.currentTruth).toEqual(["The API returns 200 for valid requests", "Migration 014 is applied"])
    expect(result.invalidatedAssumptions).toEqual(["Legacy format is still supported"])
    expect(result.openDecisions).toEqual(["Choose between REST and GraphQL for v2"])
    expect(result.recentlyAccessedFiles).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"])
    expect(result.compressionRisk).toEqual(["Large test output may push context over budget"])

    // Persisted state should contain new fields
    const statePath = path.join(repoRoot, ".context", "compound-engineering", "context-state.json")
    const state = JSON.parse(readFileSync(statePath, "utf8"))
    expect(state.currentTruth).toEqual(["The API returns 200 for valid requests", "Migration 014 is applied"])
    expect(state.invalidatedAssumptions).toEqual(["Legacy format is still supported"])
    expect(state.openDecisions).toEqual(["Choose between REST and GraphQL for v2"])
    expect(state.recentlyAccessedFiles).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"])
    expect(state.compressionRisk).toEqual(["Large test output may push context over budget"])
  })

  test("load/latest/status return new structured fields", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-read-fields-${Date.now()}`
    const tool = createContextHandoffTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "03-work",
      nextStage: "04-review",
      currentTruth: ["Fact A"],
      invalidatedAssumptions: ["Old assumption"],
      openDecisions: ["Decision X"],
      recentlyAccessedFiles: ["file1.ts", "file2.ts"],
      compressionRisk: ["Risk Z"],
    })

    const loadResult = await tool.execute({ operation: "load", repoRoot })
    expect(loadResult.currentTruth).toEqual(["Fact A"])
    expect(loadResult.invalidatedAssumptions).toEqual(["Old assumption"])
    expect(loadResult.openDecisions).toEqual(["Decision X"])
    expect(loadResult.recentlyAccessedFiles).toEqual(["file1.ts", "file2.ts"])
    expect(loadResult.compressionRisk).toEqual(["Risk Z"])

    const latestResult = await tool.execute({ operation: "latest", repoRoot })
    expect(latestResult.currentTruth).toEqual(["Fact A"])
    expect(latestResult.invalidatedAssumptions).toEqual(["Old assumption"])
    expect(latestResult.openDecisions).toEqual(["Decision X"])
    expect(latestResult.recentlyAccessedFiles).toEqual(["file1.ts", "file2.ts"])
    expect(latestResult.compressionRisk).toEqual(["Risk Z"])

    const statusResult = await tool.execute({ operation: "status", repoRoot })
    expect(statusResult.currentTruth).toEqual(["Fact A"])
    expect(statusResult.invalidatedAssumptions).toEqual(["Old assumption"])
    expect(statusResult.openDecisions).toEqual(["Decision X"])
    expect(statusResult.recentlyAccessedFiles).toEqual(["file1.ts", "file2.ts"])
    expect(statusResult.compressionRisk).toEqual(["Risk Z"])
  })

  test("default template renders new structured sections", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-new-sections-${Date.now()}`
    const tool = createContextHandoffTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "03-work",
      nextStage: "04-review",
      activeFiles: ["src/a.ts"],
      currentTruth: ["Fact A", "Fact B"],
      invalidatedAssumptions: ["Old assumption"],
      openDecisions: ["Decision X"],
      recentlyAccessedFiles: ["file1.ts"],
      compressionRisk: ["Risk Z"],
    })

    const savedText = readFileSync(
      path.join(repoRoot, ".context", "compound-engineering", "handoffs", "latest.md"),
      "utf8",
    )

    expect(savedText).toContain("## Current Truth")
    expect(savedText).toContain("## Invalidated Assumptions")
    expect(savedText).toContain("## Open Decisions")
    expect(savedText).toContain("## Recently Accessed Files")
    expect(savedText).toContain("## Compression Risk")

    // Verify values appear
    expect(savedText).toContain("- Fact A")
    expect(savedText).toContain("- Old assumption")
    expect(savedText).toContain("- Decision X")
    expect(savedText).toContain("- file1.ts")
    expect(savedText).toContain("- Risk Z")
  })

  test("new fields default correctly when omitted", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-defaults-${Date.now()}`
    const tool = createContextHandoffTool()

    const result = await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "03-work",
      nextStage: "04-review",
      activeFiles: ["src/a.ts", "src/b.ts", "src/c.ts"],
    })

    // recentlyAccessedFiles defaults to activeFiles.slice(0, 5)
    expect(result.recentlyAccessedFiles).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"])
    // Others default to empty arrays
    expect(result.currentTruth).toEqual([])
    expect(result.invalidatedAssumptions).toEqual([])
    expect(result.openDecisions).toEqual([])
    expect(result.compressionRisk).toEqual([])

    // Template should render N/A for empty arrays
    const savedText = readFileSync(
      path.join(repoRoot, ".context", "compound-engineering", "handoffs", "latest.md"),
      "utf8",
    )
    expect(savedText).toContain("## Current Truth")
    expect(savedText).toContain("## Invalidated Assumptions")
    expect(savedText).toContain("## Open Decisions")
    expect(savedText).toContain("## Compression Risk")
  })

  test("custom handoffMarkdown still persists structured fields in state", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-custom-md-${Date.now()}`
    const tool = createContextHandoffTool()

    const result = await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "03-work",
      nextStage: "04-review",
      activeFiles: ["src/a.ts"],
      currentTruth: ["Fact A"],
      invalidatedAssumptions: ["Old assumption"],
      openDecisions: ["Decision X"],
      recentlyAccessedFiles: ["file1.ts"],
      compressionRisk: ["Risk Z"],
      handoffMarkdown: "## Custom\nMy custom markdown\n",
    })

    // Structured fields still returned
    expect(result.currentTruth).toEqual(["Fact A"])
    expect(result.invalidatedAssumptions).toEqual(["Old assumption"])
    expect(result.openDecisions).toEqual(["Decision X"])
    expect(result.recentlyAccessedFiles).toEqual(["file1.ts"])
    expect(result.compressionRisk).toEqual(["Risk Z"])

    // Markdown should be custom, not default template
    const savedText = readFileSync(
      path.join(repoRoot, ".context", "compound-engineering", "handoffs", "latest.md"),
      "utf8",
    )
    expect(savedText).toBe("## Custom\nMy custom markdown\n")
    expect(savedText).not.toContain("## Current Truth")

    // State still has fields
    const statePath = path.join(repoRoot, ".context", "compound-engineering", "context-state.json")
    const state = JSON.parse(readFileSync(statePath, "utf8"))
    expect(state.currentTruth).toEqual(["Fact A"])
  })

  test("backward compatibility: callers omitting new fields still save/load successfully", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-compat-${Date.now()}`
    const tool = createContextHandoffTool()

    // Save with old-style parameters only
    const result = await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "01-brainstorm",
      nextStage: "02-plan",
      contextHealth: "good",
      activeFiles: ["docs/a.md"],
      handoffMarkdown: "## Old-style handoff\n",
    })

    expect(result.operation).toBe("save")
    expect(result.found).toBe(true)
    expect(result.currentTruth).toEqual([])
    expect(result.invalidatedAssumptions).toEqual([])
    expect(result.openDecisions).toEqual([])
    expect(result.recentlyAccessedFiles).toEqual(["docs/a.md"])
    expect(result.compressionRisk).toEqual([])

    // Load should work fine
    const loadResult = await tool.execute({ operation: "load", repoRoot })
    expect(loadResult.found).toBe(true)
    expect(loadResult.currentTruth).toEqual([])
    expect(loadResult.recentlyAccessedFiles).toEqual(["docs/a.md"])
  })

  test("backward compatibility: legacy state files without new fields load with safe defaults", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-legacy-state-${Date.now()}`
    const tool = createContextHandoffTool()
    const handoffDir = path.join(repoRoot, ".context", "compound-engineering", "handoffs")
    mkdirSync(handoffDir, { recursive: true })
    writeFileSync(path.join(handoffDir, "latest.md"), "## Legacy\n", "utf8")
    writeFileSync(
      path.join(repoRoot, ".context", "compound-engineering", "context-state.json"),
      JSON.stringify({
        currentStage: "02-plan",
        nextStage: "03-work",
        contextHealth: "watch",
        latestHandoffPath: ".context/compound-engineering/handoffs/latest.md",
        activeFiles: ["docs/legacy.md"],
        blocker: "N/A",
        verification: "legacy verified",
        artifacts: {},
        recommendNewSession: false,
        updatedAt: "2026-04-30T00:00:00.000Z",
      }),
      "utf8",
    )

    const loadResult = await tool.execute({ operation: "load", repoRoot })
    expect(loadResult.found).toBe(true)
    expect(loadResult.currentTruth).toEqual([])
    expect(loadResult.invalidatedAssumptions).toEqual([])
    expect(loadResult.openDecisions).toEqual([])
    expect(loadResult.recentlyAccessedFiles).toEqual(["docs/legacy.md"])
    expect(loadResult.compressionRisk).toEqual([])

    const statusResult = await tool.execute({ operation: "status", repoRoot })
    expect(statusResult.currentTruth).toEqual([])
    expect(statusResult.recentlyAccessedFiles).toEqual(["docs/legacy.md"])
  })

  // --- Unit 1: activeRules field ---

  test("save/load/latest/status round-trip activeRules", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-activeRules-${Date.now()}`
    const tool = createContextHandoffTool()

    const saveResult = await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "03-work",
      nextStage: "04-review",
      activeRules: ["TDD gate: RED→GREEN→REFACTOR", "No business logic changes"],
    })

    expect(saveResult.activeRules).toEqual(["TDD gate: RED→GREEN→REFACTOR", "No business logic changes"])

    // Persisted state contains activeRules
    const statePath = path.join(repoRoot, ".context", "compound-engineering", "context-state.json")
    const state = JSON.parse(readFileSync(statePath, "utf8"))
    expect(state.activeRules).toEqual(["TDD gate: RED→GREEN→REFACTOR", "No business logic changes"])

    // load returns activeRules
    const loadResult = await tool.execute({ operation: "load", repoRoot })
    expect(loadResult.activeRules).toEqual(["TDD gate: RED→GREEN→REFACTOR", "No business logic changes"])

    // latest returns activeRules
    const latestResult = await tool.execute({ operation: "latest", repoRoot })
    expect(latestResult.activeRules).toEqual(["TDD gate: RED→GREEN→REFACTOR", "No business logic changes"])

    // status returns activeRules
    const statusResult = await tool.execute({ operation: "status", repoRoot })
    expect(statusResult.activeRules).toEqual(["TDD gate: RED→GREEN→REFACTOR", "No business logic changes"])
  })

  test("activeRules renders in default template", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-activeRules-template-${Date.now()}`
    const tool = createContextHandoffTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "03-work",
      activeRules: ["TDD gate: RED→GREEN→REFACTOR", "Keep changes test-only"],
    })

    const savedText = readFileSync(
      path.join(repoRoot, ".context", "compound-engineering", "handoffs", "latest.md"),
      "utf8",
    )

    expect(savedText).toContain("## Active Rules")
    expect(savedText).toContain("- TDD gate: RED→GREEN→REFACTOR")
    expect(savedText).toContain("- Keep changes test-only")
  })

  test("activeRules defaults to empty array when omitted", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-activeRules-default-${Date.now()}`
    const tool = createContextHandoffTool()

    const result = await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "03-work",
    })

    expect(result.activeRules).toEqual([])

    const savedText = readFileSync(
      path.join(repoRoot, ".context", "compound-engineering", "handoffs", "latest.md"),
      "utf8",
    )
    expect(savedText).toContain("## Active Rules")
    expect(savedText).toContain("- N/A")
  })

  test("activeRules >5 is allowed (soft constraint) and round-trips correctly", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-activeRules-soft-${Date.now()}`
    const tool = createContextHandoffTool()

    const manyRules = [
      "TDD gate: RED→GREEN→REFACTOR",
      "No business logic changes",
      "Keep changes test-only",
      "Preserve existing API contracts",
      "Run full test suite before committing",
      "Do not change file naming conventions",
      "Follow TypeScript strict mode",
    ]

    const saveResult = await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "03-work",
      activeRules: manyRules,
    })

    expect(saveResult.activeRules).toEqual(manyRules)
    expect(saveResult.activeRules!.length).toBe(7)

    const loadResult = await tool.execute({ operation: "load", repoRoot })
    expect(loadResult.activeRules).toEqual(manyRules)
  })

  test("backward compatibility: old state without activeRules loads with empty array", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-activeRules-compat-${Date.now()}`
    const tool = createContextHandoffTool()
    const handoffDir = path.join(repoRoot, ".context", "compound-engineering", "handoffs")
    mkdirSync(handoffDir, { recursive: true })
    writeFileSync(path.join(handoffDir, "latest.md"), "## Legacy\n", "utf8")
    writeFileSync(
      path.join(repoRoot, ".context", "compound-engineering", "context-state.json"),
      JSON.stringify({
        currentStage: "02-plan",
        nextStage: "03-work",
        contextHealth: "watch",
        latestHandoffPath: ".context/compound-engineering/handoffs/latest.md",
        activeFiles: ["docs/legacy.md"],
        artifacts: {},
        recommendNewSession: false,
        updatedAt: "2026-04-30T00:00:00.000Z",
      }),
      "utf8",
    )

    const loadResult = await tool.execute({ operation: "load", repoRoot })
    expect(loadResult.found).toBe(true)
    expect(loadResult.activeRules).toEqual([])
    expect(loadResult.currentStage).toBe("02-plan") // other fields still work

    const statusResult = await tool.execute({ operation: "status", repoRoot })
    expect(statusResult.activeRules).toEqual([])
  })

  test("activeRules persists in state even with custom handoffMarkdown", async () => {
    const repoRoot = `/tmp/pi-ce-handoff-activeRules-custom-md-${Date.now()}`
    const tool = createContextHandoffTool()

    const result = await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "03-work",
      activeRules: ["TDD gate: RED→GREEN→REFACTOR"],
      handoffMarkdown: "## Custom\nMy custom markdown\n",
    })

    // activeRules still returned
    expect(result.activeRules).toEqual(["TDD gate: RED→GREEN→REFACTOR"])

    // Persisted in state
    const statePath = path.join(repoRoot, ".context", "compound-engineering", "context-state.json")
    const state = JSON.parse(readFileSync(statePath, "utf8"))
    expect(state.activeRules).toEqual(["TDD gate: RED→GREEN→REFACTOR"])

    // Custom markdown preserved (not default template)
    const savedText = readFileSync(
      path.join(repoRoot, ".context", "compound-engineering", "handoffs", "latest.md"),
      "utf8",
    )
    expect(savedText).toBe("## Custom\nMy custom markdown\n")
  })

  test("phase docs require shared evidence-first handoff-lite template", () => {
    const pipelineConfig = readRepoFile("skills/references/pipeline-config.md")
    expect(pipelineConfig).toContain("### Handoff-lite template")
    expect(pipelineConfig).toContain("## Current Task")
    expect(pipelineConfig).toContain("## Hot Context")
    expect(pipelineConfig).toContain("## Current Truth")
    expect(pipelineConfig).toContain("## Invalidated Assumptions")
    expect(pipelineConfig).toContain("## Open Decisions")
    expect(pipelineConfig).toContain("## Verified Facts")
    expect(pipelineConfig).toContain("## Active Files")
    expect(pipelineConfig).toContain("## Recently Accessed Files")
    expect(pipelineConfig).toContain("## Artifacts")
    expect(pipelineConfig).toContain("## Current Blocker")
    expect(pipelineConfig).toContain("## Verification")
    expect(pipelineConfig).toContain("## Compression Risk")
    expect(pipelineConfig).toContain("## Do Not Repeat")
    expect(pipelineConfig).toContain("## Next Minimal Step")

    const handoffDocs = [
      "skills/01-brainstorm/references/handoff.md",
      "skills/02-plan/references/handoff.md",
      "skills/03-work/references/handoff.md",
      "skills/04-review/references/handoff.md",
      "skills/05-learn/SKILL.md",
    ]

    for (const docPath of handoffDocs) {
      const content = readRepoFile(docPath)
      expect(content).toContain("handoff-lite")
      expect(content).toContain("Handoff-lite template")
    }
  })

  // --- Unit 1 (Route B-lite): context_handoff validate ---

  test("validate returns missing required evidence when no state or handoff exists", async () => {
    const repoRoot = `/tmp/pi-ce-validate-empty-${Date.now()}`
    const tool = createContextHandoffTool()

    const result = await tool.execute({ operation: "validate", repoRoot })

    expect(result.operation).toBe("validate")
    expect(result.found).toBe(false)
    expect(result.ok).toBe(false)
    expect(result.probes!.recall).toBe(false)
    expect(result.probes!.continuation).toBe(false)
    expect(result.missing!.length).toBeGreaterThan(0)
    expect(result.recommendedAction).toBe("save_handoff")
  })

  test("validate passes when recall and continuation evidence exist", async () => {
    const repoRoot = `/tmp/pi-ce-validate-pass-${Date.now()}`
    const tool = createContextHandoffTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "02-plan",
      nextStage: "03-work",
      currentTruth: ["User approved Route B-lite"],
      activeFiles: ["extensions/ce-core/tools/context-handoff.ts"],
      handoffMarkdown: "## Current Task\nBuild validate.\n\n## Next Minimal Step\n/skill:03-work\n",
    })

    const result = await tool.execute({ operation: "validate", repoRoot })

    expect(result.found).toBe(true)
    expect(result.ok).toBe(true)
    expect(result.probes!.recall).toBe(true)
    expect(result.probes!.continuation).toBe(true)
    expect(result.recommendedAction).toBe("continue")
  })

  test("validate warns but stays ok when artifact and decision evidence are missing", async () => {
    const repoRoot = `/tmp/pi-ce-validate-warn-${Date.now()}`
    const tool = createContextHandoffTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "02-plan",
      nextStage: "03-work",
      // No currentTruth — it satisfies both recall and decision, so omit for pure decision-missing test
      // No activeFiles, no artifacts, no openDecisions, no invalidatedAssumptions
      handoffMarkdown: "## Current Task\nTask.\n\n## Next Minimal Step\nDo it.\n",
    })

    const result = await tool.execute({ operation: "validate", repoRoot })

    expect(result.ok).toBe(true)
    expect(result.probes!.recall).toBe(true)
    expect(result.probes!.continuation).toBe(true)
    expect(result.probes!.artifact).toBe(false)
    expect(result.probes!.decision).toBe(false)
    expect(result.warnings!.length).toBeGreaterThan(0)
    expect(result.missing!.length).toBe(0)
  })

  test("validate handles legacy state with safe defaults", async () => {
    const repoRoot = `/tmp/pi-ce-validate-legacy-${Date.now()}`
    const tool = createContextHandoffTool()
    const handoffDir = path.join(repoRoot, ".context", "compound-engineering", "handoffs")
    mkdirSync(handoffDir, { recursive: true })
    writeFileSync(path.join(handoffDir, "latest.md"), "## Legacy\n", "utf8")
    writeFileSync(
      path.join(repoRoot, ".context", "compound-engineering", "context-state.json"),
      JSON.stringify({
        currentStage: "02-plan",
        contextHealth: "watch",
        activeFiles: [],
        artifacts: {},
        recommendNewSession: false,
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      "utf8",
    )

    const result = await tool.execute({ operation: "validate", repoRoot })

    expect(result.found).toBe(true)
    // Legacy state has currentStage but no nextStage, no currentTruth, no Next Minimal Step
    expect(result.probes!.continuation).toBe(false)
    expect(result.ok).toBe(false)
    expect(result.recommendedAction).toBe("fill_required_context")
  })

  test("validate handles corrupted context-state.json without throwing", async () => {
    const repoRoot = `/tmp/pi-ce-validate-corrupt-${Date.now()}`
    const tool = createContextHandoffTool()
    const ceDir = path.join(repoRoot, ".context", "compound-engineering")
    mkdirSync(ceDir, { recursive: true })
    writeFileSync(path.join(ceDir, "context-state.json"), "NOT JSON{{{", "utf8")

    const result = await tool.execute({ operation: "validate", repoRoot })

    expect(result.found).toBe(false)
    expect(result.ok).toBe(false)
    expect(result.recommendedAction).toBe("save_handoff")
  })

  test("validate does not pass continuation from verification evidence alone", async () => {
    const repoRoot = `/tmp/pi-ce-validate-verification-alone-${Date.now()}`
    const tool = createContextHandoffTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "03-work",
      // no nextStage
      verification: "bun test passed",
      currentTruth: ["Fact A"],
      handoffMarkdown: "## Current Task\nTask.\n\n## Next Minimal Step\nN/A\n\n## Verification\n- bun test passed\n",
    })

    const result = await tool.execute({ operation: "validate", repoRoot })

    // Recall should pass because currentTruth exists and currentStage is meaningful
    expect(result.probes!.recall).toBe(true)
    // Continuation must fail: verification alone does not provide next step
    expect(result.probes!.continuation).toBe(false)
    expect(result.ok).toBe(false)
  })

  test("validate ignores placeholder markdown values", async () => {
    const repoRoot = `/tmp/pi-ce-validate-placeholder-${Date.now()}`
    const tool = createContextHandoffTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "03-work",
      handoffMarkdown: [
        "## Current Task",
        "N/A",
        "",
        "## Next Minimal Step",
        "- N/A",
        "",
        "## Artifacts",
        "- N/A",
        "",
        "## Open Decisions",
        "- N/A",
        "",
        "## Verification",
        "- Not run",
        "",
      ].join("\n"),
    })

    const result = await tool.execute({ operation: "validate", repoRoot })

    // Placeholder markdown should not count as evidence
    expect(result.probes!.continuation).toBe(false)
    expect(result.probes!.artifact).toBe(false)
    expect(result.probes!.decision).toBe(false)
    expect(result.ok).toBe(false)
    expect(result.warnings!.length).toBeGreaterThan(0)
  })

  test("validate returns repo-relative path for explicit absolute repo handoff path", async () => {
    const repoRoot = `/tmp/pi-ce-validate-relative-path-${Date.now()}`
    const tool = createContextHandoffTool()
    const handoffDir = path.join(repoRoot, ".context", "compound-engineering", "handoffs")
    mkdirSync(handoffDir, { recursive: true })
    const absoluteHandoffPath = path.join(handoffDir, "custom.md")
    writeFileSync(
      absoluteHandoffPath,
      "## Current Task\nTask.\n\n## Next Minimal Step\nDo it.\n",
      "utf8",
    )

    const result = await tool.execute({
      operation: "validate",
      repoRoot,
      handoffPath: absoluteHandoffPath,
    })

    expect(result.found).toBe(true)
    expect(result.path).toBe(".context/compound-engineering/handoffs/custom.md")
  })

  test("validate ignores placeholder structured state values", async () => {
    const repoRoot = `/tmp/pi-ce-validate-placeholder-state-${Date.now()}`
    const tool = createContextHandoffTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      currentStage: "unknown",
      nextStage: "N/A",
      activeFiles: ["N/A"],
      currentTruth: ["N/A"],
      openDecisions: ["N/A"],
      verification: "Not run",
      handoffMarkdown: "## Current Task\nN/A\n\n## Next Minimal Step\n- N/A\n",
    })

    const result = await tool.execute({ operation: "validate", repoRoot })

    expect(result.probes!.recall).toBe(false)
    expect(result.probes!.continuation).toBe(false)
    expect(result.probes!.artifact).toBe(false)
    expect(result.probes!.decision).toBe(false)
    expect(result.ok).toBe(false)
  })

  test("validate normalizes absolute state handoff path in public result", async () => {
    const repoRoot = `/tmp/pi-ce-validate-absolute-state-path-${Date.now()}`
    const tool = createContextHandoffTool()
    const handoffDir = path.join(repoRoot, ".context", "compound-engineering", "handoffs")
    mkdirSync(handoffDir, { recursive: true })
    const absoluteHandoffPath = path.join(handoffDir, "legacy.md")
    writeFileSync(absoluteHandoffPath, "## Current Task\nTask.\n\n## Next Minimal Step\nDo it.\n", "utf8")
    writeFileSync(
      path.join(repoRoot, ".context", "compound-engineering", "context-state.json"),
      JSON.stringify({
        currentStage: "02-plan",
        nextStage: "03-work",
        contextHealth: "watch",
        latestHandoffPath: absoluteHandoffPath,
        activeFiles: [],
        artifacts: {},
        recommendNewSession: false,
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      "utf8",
    )

    const result = await tool.execute({ operation: "validate", repoRoot })

    expect(result.found).toBe(true)
    expect(result.path).toBe(".context/compound-engineering/handoffs/legacy.md")
  })
})
