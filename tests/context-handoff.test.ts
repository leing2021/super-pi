import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
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

  test("phase docs require shared evidence-first handoff-lite template", () => {
    const pipelineConfig = readRepoFile("skills/references/pipeline-config.md")
    expect(pipelineConfig).toContain("### Handoff-lite template")
    expect(pipelineConfig).toContain("## Current Task")
    expect(pipelineConfig).toContain("## Hot Context")
    expect(pipelineConfig).toContain("## Verified Facts")
    expect(pipelineConfig).toContain("## Active Files")
    expect(pipelineConfig).toContain("## Artifacts")
    expect(pipelineConfig).toContain("## Current Blocker")
    expect(pipelineConfig).toContain("## Verification")
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
})
