import { describe, expect, test } from "bun:test"
import path from "node:path"
import { mkdir, writeFile } from "node:fs/promises"
import ceCoreExtension from "../extensions/ce-core/index"
import {
  getBrainstormArtifactPath,
  getPlanArtifactPath,
  getSolutionArtifactPath,
  getRunArtifactPath,
} from "../extensions/ce-core/utils/artifact-paths"
import { createArtifactHelperTool } from "../extensions/ce-core/tools/artifact-helper"
import { createAskUserQuestionTool } from "../extensions/ce-core/tools/ask-user-question"
import { createSubagentTool } from "../extensions/ce-core/tools/subagent"
import { createWorkflowStateTool } from "../extensions/ce-core/tools/workflow-state"
import { normalizeSlug } from "../extensions/ce-core/utils/name-utils"

describe("artifact paths", () => {
  const repoRoot = "/tmp/pi-ce-repo"

  test("builds the brainstorm artifact path", () => {
    expect(getBrainstormArtifactPath(repoRoot, "2026-04-17", "Pi CE Package")).toBe(
      path.join(repoRoot, "docs", "brainstorms", "2026-04-17-pi-ce-package-requirements.md"),
    )
  })

  test("builds the plan artifact path", () => {
    expect(getPlanArtifactPath(repoRoot, "2026-04-17", "Pi CE Package")).toBe(
      path.join(repoRoot, "docs", "plans", "2026-04-17-pi-ce-package-plan.md"),
    )
  })

  test("builds the solution artifact path by category", () => {
    expect(getSolutionArtifactPath(repoRoot, "workflow", "package bootstrap", "2026-04-17")).toBe(
      path.join(repoRoot, "docs", "solutions", "workflow", "2026-04-17-package-bootstrap.md"),
    )
  })

  test("builds the run artifact path", () => {
    expect(getRunArtifactPath(repoRoot, "ce-review", "run-001")).toBe(
      path.join(repoRoot, ".context", "compound-engineering", "ce-review", "run-001"),
    )
  })
})

describe("slug normalization", () => {
  test("normalizes mixed-case and punctuation-heavy labels", () => {
    expect(normalizeSlug("Pi CE: Package! Design")).toBe("pi-ce-package-design")
  })

  test("collapses repeated separators and trims edges", () => {
    expect(normalizeSlug("---Brainstorm___Plan---")).toBe("brainstorm-plan")
  })
})

describe("artifact_helper", () => {
  test("suggests a brainstorm artifact path", async () => {
    const tool = createArtifactHelperTool()
    const result = await tool.execute({
      repoRoot: "/tmp/pi-ce-repo",
      artifactType: "brainstorm",
      date: "2026-04-17",
      topic: "Pi CE Package",
    })

    expect(result.path).toBe(
      "/tmp/pi-ce-repo/docs/brainstorms/2026-04-17-pi-ce-package-requirements.md",
    )
    expect(result.createdDirectories).toEqual([])
  })

  test("creates missing directories for a solution artifact", async () => {
    const repoRoot = "/tmp/pi-ce-artifact-helper"
    const tool = createArtifactHelperTool()

    const result = await tool.execute({
      repoRoot,
      artifactType: "solution",
      date: "2026-04-17",
      topic: "Package Bootstrap",
      category: "workflow",
      ensureDir: true,
    })

    expect(result.path).toBe(
      "/tmp/pi-ce-artifact-helper/docs/solutions/workflow/2026-04-17-package-bootstrap.md",
    )
    expect(result.createdDirectories).toContain(
      "/tmp/pi-ce-artifact-helper/docs/solutions/workflow",
    )
  })

  test("creates the run artifact directory when ensureDir is true", async () => {
    const repoRoot = "/tmp/pi-ce-run-artifact"
    const tool = createArtifactHelperTool()

    const result = await tool.execute({
      repoRoot,
      artifactType: "run",
      skillName: "ce-review",
      runId: "run-001",
      ensureDir: true,
    })

    expect(result.path).toBe(
      "/tmp/pi-ce-run-artifact/.context/compound-engineering/ce-review/run-001",
    )
    expect(result.createdDirectories).toContain(
      "/tmp/pi-ce-run-artifact/.context/compound-engineering/ce-review",
    )
  })

  test("does not create directories when ensureDir is false or absent", async () => {
    const tool = createArtifactHelperTool()

    const result = await tool.execute({
      repoRoot: "/tmp/pi-ce-no-dir",
      artifactType: "brainstorm",
      date: "2026-04-17",
      topic: "Test",
      ensureDir: false,
    })

    expect(result.path).toBe(
      "/tmp/pi-ce-no-dir/docs/brainstorms/2026-04-17-test-requirements.md",
    )
    expect(result.createdDirectories).toEqual([])
  })
})

describe("ask_user_question", () => {
  test("supports free input mode", async () => {
    const tool = createAskUserQuestionTool()
    const result = await tool.execute(
      { question: "What should we build?" },
      {
        input: async () => "Plan workflow",
        select: async () => null,
      },
    )

    expect(result.answer).toBe("Plan workflow")
    expect(result.mode).toBe("input")
  })

  test("supports fixed-options mode", async () => {
    const tool = createAskUserQuestionTool()
    const result = await tool.execute(
      { question: "Choose next step", options: ["brainstorm", "plan"] },
      {
        input: async () => null,
        select: async () => "plan",
      },
    )

    expect(result.answer).toBe("plan")
    expect(result.mode).toBe("select")
  })

  test("supports custom answers when enabled", async () => {
    const tool = createAskUserQuestionTool()
    const result = await tool.execute(
      {
        question: "Choose next step",
        options: ["brainstorm", "plan"],
        allowCustom: true,
      },
      {
        input: async () => "compound",
        select: async () => "Other",
      },
    )

    expect(result.answer).toBe("compound")
    expect(result.mode).toBe("custom")
  })
})

describe("subagent", () => {
  test("runs a single subagent task", async () => {
    const calls: string[] = []
    const tool = createSubagentTool()

    const result = await tool.execute(
      {
        agent: "ce-plan",
        task: "Design the package",
      },
      async (prompt: string) => {
        calls.push(prompt)
        return "ok"
      },
    )

    expect(calls).toEqual(["/skill:ce-plan Design the package"])
    expect(result.mode).toBe("single")
    expect(result.outputs).toEqual(["ok"])
  })

  test("runs a serial chain and substitutes the previous result", async () => {
    const calls: string[] = []
    const tool = createSubagentTool()

    const result = await tool.execute(
      {
        chain: [
          { agent: "ce-brainstorm", task: "Scope the feature" },
          { agent: "ce-plan", task: "Plan using {previous}" },
        ],
      },
      async (prompt: string) => {
        calls.push(prompt)
        return prompt.includes("ce-brainstorm") ? "requirements-path" : "plan-path"
      },
    )

    expect(calls).toEqual([
      "/skill:ce-brainstorm Scope the feature",
      "/skill:ce-plan Plan using requirements-path",
    ])
    expect(result.mode).toBe("chain")
    expect(result.outputs).toEqual(["requirements-path", "plan-path"])
  })

  test("rejects mixed execution modes", async () => {
    const tool = createSubagentTool()

    await expect(
      tool.execute(
        {
          agent: "ce-plan",
          task: "Design the package",
          chain: [{ agent: "ce-brainstorm", task: "Scope the feature" }],
        },
        async () => "ok",
      ),
    ).rejects.toThrow("Provide exactly one mode")
  })

  test("rejects empty agent in single mode", async () => {
    const tool = createSubagentTool()

    await expect(
      tool.execute(
        { agent: "", task: "Design the package" },
        async () => "ok",
      ),
    ).rejects.toThrow()
  })

  test("rejects empty task in single mode", async () => {
    const tool = createSubagentTool()

    await expect(
      tool.execute(
        { agent: "ce-plan", task: "" },
        async () => "ok",
      ),
    ).rejects.toThrow()
  })

  test("rejects empty chain array", async () => {
    const tool = createSubagentTool()

    await expect(
      tool.execute({ chain: [] }, async () => "ok"),
    ).rejects.toThrow("Provide exactly one mode")
  })
})

describe("workflow_state", () => {
  test("reports empty state when no artifacts exist", async () => {
    const tool = createWorkflowStateTool()
    const result = await tool.execute({ repoRoot: "/tmp/pi-ce-empty-repo-" + Date.now() })

    expect(result.brainstorms.count).toBe(0)
    expect(result.plans.count).toBe(0)
    expect(result.solutions.count).toBe(0)
    expect(result.runs.count).toBe(0)
    expect(result.brainstorms.latest).toBeNull()
    expect(result.plans.latest).toBeNull()
    expect(result.solutions.latest).toBeNull()
    expect(result.runs.latest).toBeNull()
  })

  test("reports brainstorm count and latest when artifacts exist", async () => {
    const repoRoot = "/tmp/pi-ce-ws-brainstorm"
    const brainstormDir = path.join(repoRoot, "docs", "brainstorms")
    await mkdir(brainstormDir, { recursive: true })
    await writeFile(path.join(brainstormDir, "2026-04-17-test-requirements.md"), "content")

    const tool = createWorkflowStateTool()
    const result = await tool.execute({ repoRoot })

    expect(result.brainstorms.count).toBe(1)
    expect(result.brainstorms.latest).toBe("2026-04-17-test-requirements.md")
    expect(result.plans.count).toBe(0)
  })

  test("reports solutions recursively across subcategories", async () => {
    const repoRoot = "/tmp/pi-ce-ws-solutions"
    const solDir = path.join(repoRoot, "docs", "solutions", "integration")
    await mkdir(solDir, { recursive: true })
    await writeFile(path.join(solDir, "2026-04-17-npm-publish.md"), "content")

    const tool = createWorkflowStateTool()
    const result = await tool.execute({ repoRoot })

    expect(result.solutions.count).toBe(1)
    expect(result.solutions.latest).toContain("npm-publish")
  })

  test("picks the most recent artifact as latest", async () => {
    const repoRoot = "/tmp/pi-ce-ws-multi"
    const planDir = path.join(repoRoot, "docs", "plans")
    await mkdir(planDir, { recursive: true })
    await writeFile(path.join(planDir, "2026-04-16-old-plan.md"), "old")
    await writeFile(path.join(planDir, "2026-04-17-new-plan.md"), "new")

    const tool = createWorkflowStateTool()
    const result = await tool.execute({ repoRoot })

    expect(result.plans.count).toBe(2)
    expect(result.plans.latest).toBe("2026-04-17-new-plan.md")
  })
})

describe("ce-core extension runtime registration", () => {
  test("registers artifact_helper, ask_user_question, and subagent tools", () => {
    const registeredNames: string[] = []
    const pi = {
      registerTool(definition: { name: string }) {
        registeredNames.push(definition.name)
      },
    }

    ceCoreExtension(pi as never)

    expect(registeredNames).toEqual([
      "artifact_helper",
      "ask_user_question",
      "subagent",
      "workflow_state",
    ])
  })
})

describe("public exports", () => {
  test("only exports the extension default and public utility functions", async () => {
    const mod = await import("../extensions/ce-core/index")
    const exportNames = Object.keys(mod).filter(k => k !== "default")

    const expectedExports = [
      "createArtifactHelperTool",
      "createAskUserQuestionTool",
      "createSubagentTool",
      "createWorkflowStateTool",
      "getBrainstormArtifactPath",
      "getPlanArtifactPath",
      "getSolutionArtifactPath",
      "getRunArtifactPath",
      "normalizeSlug",
    ]

    expect(exportNames.sort()).toEqual(expectedExports.sort())
  })
})
