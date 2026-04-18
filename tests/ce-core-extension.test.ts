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
import { createWorktreeManagerTool } from "../extensions/ce-core/tools/worktree-manager"
import { createReviewRouterTool } from "../extensions/ce-core/tools/review-router"
import { createParallelSubagentTool } from "../extensions/ce-core/tools/parallel-subagent"
import { createSessionCheckpointTool } from "../extensions/ce-core/tools/session-checkpoint"
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

describe("worktree_manager", () => {
  test("create operation generates correct git commands", async () => {
    const calls: string[][] = []
    const tool = createWorktreeManagerTool()

    const result = await tool.execute(
      {
        operation: "create",
        repoRoot: "/tmp/my-repo",
        branchName: "feat-add-ci",
      },
      async (args: string[]) => {
        calls.push(args)
        return ""
      },
    )

    expect(calls.length).toBe(2)
    // Branch creation
    expect(calls[0]).toContain("branch")
    expect(calls[0]).toContain("feat-add-ci")
    // Worktree add
    expect(calls[1]).toContain("worktree")
    expect(calls[1]).toContain("add")
    expect(result.worktreePath).toContain("feat-add-ci")
  })

  test("detect operation returns false when not in a worktree", async () => {
    const tool = createWorktreeManagerTool()

    const result = await tool.execute(
      {
        operation: "detect",
        repoRoot: "/tmp/my-repo",
      },
      async () => "",
    )

    expect(result.isWorktree).toBe(false)
  })

  test("detect operation returns true when in a worktree", async () => {
    const tool = createWorktreeManagerTool()

    const result = await tool.execute(
      {
        operation: "detect",
        repoRoot: "/tmp/my-repo",
      },
      async (args: string[]) => {
        if (args.includes("worktree") && args.includes("list")) {
          return "/tmp/my-repo  abc123 [main]\n/tmp/my-repo-feat  def456 [feat-add-ci]"
        }
        return ""
      },
    )

    expect(result.isWorktree).toBe(true)
    expect(result.worktreePath).toBe("/tmp/my-repo-feat")
  })

  test("merge operation generates correct git commands", async () => {
    const calls: string[][] = []
    const tool = createWorktreeManagerTool()

    const result = await tool.execute(
      {
        operation: "merge",
        repoRoot: "/tmp/my-repo",
        branchName: "feat-add-ci",
      },
      async (args: string[]) => {
        calls.push(args)
        return ""
      },
    )

    // Checkout main, merge branch
    expect(calls[0]).toContain("checkout")
    expect(calls[0]).toContain("main")
    expect(calls[1]).toContain("merge")
    expect(calls[1]).toContain("feat-add-ci")
    expect(result.merged).toBe(true)
  })

  test("cleanup operation removes the worktree", async () => {
    const calls: string[][] = []
    const tool = createWorktreeManagerTool()

    const result = await tool.execute(
      {
        operation: "cleanup",
        repoRoot: "/tmp/my-repo",
        branchName: "feat-add-ci",
        worktreePath: "/tmp/my-repo-feat-add-ci",
      },
      async (args: string[]) => {
        calls.push(args)
        return ""
      },
    )

    expect(calls[0]).toContain("worktree")
    expect(calls[0]).toContain("remove")
    expect(calls[0]).toContain("/tmp/my-repo-feat-add-ci")
    expect(calls[1]).toContain("branch")
    expect(calls[1]).toContain("-d")
    expect(calls[1]).toContain("feat-add-ci")
    expect(result.cleanedUp).toBe(true)
  })

  test("rejects unknown operations", async () => {
    const tool = createWorktreeManagerTool()

    await expect(
      tool.execute(
        { operation: "unknown", repoRoot: "/tmp/my-repo" },
        async () => "",
      ),
    ).rejects.toThrow("Unknown operation")
  })
})

describe("review_router", () => {
  test("returns base reviewers for any non-empty diff", async () => {
    const tool = createReviewRouterTool()
    const result = await tool.execute({
      filesChanged: ["src/index.ts"],
      insertions: 10,
      deletions: 2,
    })

    const names = result.reviewers.map(r => r.name)
    expect(names).toContain("correctness-reviewer")
    expect(names).toContain("testing-reviewer")
    expect(names).toContain("maintainability-reviewer")
    expect(result.reviewers.length).toBeGreaterThanOrEqual(3)
  })

  test("adds security reviewer when auth-related paths are changed", async () => {
    const tool = createReviewRouterTool()
    const result = await tool.execute({
      filesChanged: ["src/auth/login.ts", "src/middleware/permissions.ts"],
      insertions: 50,
      deletions: 10,
    })

    const names = result.reviewers.map(r => r.name)
    expect(names).toContain("security-reviewer")
  })

  test("adds performance reviewer when data/query paths are changed", async () => {
    const tool = createReviewRouterTool()
    const result = await tool.execute({
      filesChanged: ["src/db/queries.ts", "src/cache/manager.ts"],
      insertions: 30,
      deletions: 5,
    })

    const names = result.reviewers.map(r => r.name)
    expect(names).toContain("performance-reviewer")
  })

  test("adds integration reviewer when config or CI files change", async () => {
    const tool = createReviewRouterTool()
    const result = await tool.execute({
      filesChanged: [".github/workflows/test.yml", "package.json"],
      insertions: 15,
      deletions: 3,
    })

    const names = result.reviewers.map(r => r.name)
    expect(names).toContain("integration-reviewer")
  })

  test("large diffs add thoroughness reviewer", async () => {
    const tool = createReviewRouterTool()
    const result = await tool.execute({
      filesChanged: ["src/core.ts", "src/utils.ts", "src/main.ts", "src/config.ts", "src/types.ts", "src/helpers.ts"],
      insertions: 500,
      deletions: 200,
    })

    const names = result.reviewers.map(r => r.name)
    expect(names).toContain("thoroughness-reviewer")
  })

  test("each reviewer includes a reason", async () => {
    const tool = createReviewRouterTool()
    const result = await tool.execute({
      filesChanged: ["src/auth/token.ts"],
      insertions: 20,
      deletions: 5,
    })

    for (const reviewer of result.reviewers) {
      expect(reviewer.reason).toBeTruthy()
      expect(typeof reviewer.reason).toBe("string")
    }
  })
})

describe("parallel_subagent", () => {
  test("runs multiple tasks concurrently and returns all outputs", async () => {
    const calls: string[] = []
    const tool = createParallelSubagentTool()

    const result = await tool.execute(
      {
        tasks: [
          { agent: "ce-brainstorm", task: "Scope feature A" },
          { agent: "ce-brainstorm", task: "Scope feature B" },
          { agent: "ce-plan", task: "Plan feature C" },
        ],
      },
      async (prompt: string) => {
        calls.push(prompt)
        return `result-${calls.length}`
      },
    )

    expect(result.outputs.length).toBe(3)
    expect(result.outputs.map(o => o.status)).toEqual(["fulfilled", "fulfilled", "fulfilled"])
    expect(result.outputs[0].value).toBe("result-1")
    expect(result.outputs[1].value).toBe("result-2")
    expect(result.outputs[2].value).toBe("result-3")
  })

  test("handles individual task failures gracefully", async () => {
    const tool = createParallelSubagentTool()

    const result = await tool.execute(
      {
        tasks: [
          { agent: "ce-brainstorm", task: "Good task" },
          { agent: "ce-plan", task: "Fail task" },
          { agent: "ce-work", task: "Another good task" },
        ],
      },
      async (prompt: string) => {
        if (prompt.includes("Fail")) throw new Error("Task failed")
        return "ok"
      },
    )

    expect(result.outputs.length).toBe(3)
    expect(result.outputs[0].status).toBe("fulfilled")
    expect(result.outputs[0].value).toBe("ok")
    expect(result.outputs[1].status).toBe("rejected")
    expect(result.outputs[1].reason).toContain("Task failed")
    expect(result.outputs[2].status).toBe("fulfilled")
    expect(result.outputs[2].value).toBe("ok")
  })

  test("rejects empty task array", async () => {
    const tool = createParallelSubagentTool()

    await expect(
      tool.execute({ tasks: [] }, async () => ""),
    ).rejects.toThrow("at least one task")
  })

  test("returns results in the same order as input tasks", async () => {
    const tool = createParallelSubagentTool()

    const result = await tool.execute(
      {
        tasks: [
          { agent: "ce-work", task: "Slow task" },
          { agent: "ce-plan", task: "Fast task" },
        ],
      },
      async (prompt: string) => {
        if (prompt.includes("Slow")) {
          await new Promise(r => setTimeout(r, 50))
          return "slow-done"
        }
        return "fast-done"
      },
    )

    expect(result.outputs[0].value).toBe("slow-done")
    expect(result.outputs[1].value).toBe("fast-done")
  })
})

describe("session_checkpoint", () => {
  test("save creates a checkpoint file", async () => {
    const repoRoot = `/tmp/pi-ce-cp-save-${Date.now()}`
    const tool = createSessionCheckpointTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      planPath: "docs/plans/2026-04-18-ci-cd-plan.md",
      completedUnits: ["Unit 1: test.yml", "Unit 2: publish.yml"],
    })

    const result = await tool.execute({
      operation: "load",
      repoRoot,
      planPath: "docs/plans/2026-04-18-ci-cd-plan.md",
    })

    expect(result.planPath).toBe("docs/plans/2026-04-18-ci-cd-plan.md")
    expect(result.completedUnits).toEqual(["Unit 1: test.yml", "Unit 2: publish.yml"])
    expect(result.updatedAt).toBeTruthy()
  })

  test("load returns empty array when no checkpoint exists", async () => {
    const tool = createSessionCheckpointTool()

    const result = await tool.execute({
      operation: "load",
      repoRoot: `/tmp/pi-ce-cp-empty-${Date.now()}`,
      planPath: "docs/plans/nonexistent.md",
    })

    expect(result.completedUnits).toEqual([])
  })

  test("save appends additional completed units", async () => {
    const repoRoot = `/tmp/pi-ce-cp-append-${Date.now()}`
    const tool = createSessionCheckpointTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      planPath: "docs/plans/2026-04-18-ci-cd-plan.md",
      completedUnits: ["Unit 1"],
    })

    await tool.execute({
      operation: "save",
      repoRoot,
      planPath: "docs/plans/2026-04-18-ci-cd-plan.md",
      completedUnits: ["Unit 1", "Unit 2", "Unit 3"],
    })

    const result = await tool.execute({
      operation: "load",
      repoRoot,
      planPath: "docs/plans/2026-04-18-ci-cd-plan.md",
    })

    expect(result.completedUnits).toEqual(["Unit 1", "Unit 2", "Unit 3"])
  })

  test("list returns all checkpoints", async () => {
    const repoRoot = `/tmp/pi-ce-cp-list-${Date.now()}`
    const tool = createSessionCheckpointTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      planPath: "docs/plans/plan-a.md",
      completedUnits: ["Unit 1"],
    })

    await tool.execute({
      operation: "save",
      repoRoot,
      planPath: "docs/plans/plan-b.md",
      completedUnits: ["Unit 1", "Unit 2"],
    })

    const result = await tool.execute({
      operation: "list",
      repoRoot,
    })

    expect(result.checkpoints.length).toBe(2)
    const paths = result.checkpoints.map((c: { planPath: string }) => c.planPath)
    expect(paths).toContain("docs/plans/plan-a.md")
    expect(paths).toContain("docs/plans/plan-b.md")
  })

  test("rejects unknown operations", async () => {
    const tool = createSessionCheckpointTool()

    await expect(
      tool.execute({
        operation: "unknown",
        repoRoot: "/tmp/test",
        planPath: "docs/plans/test.md",
      }),
    ).rejects.toThrow("Unknown operation")
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
      "worktree_manager",
      "review_router",
      "parallel_subagent",
      "session_checkpoint",
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
      "createWorktreeManagerTool",
      "createReviewRouterTool",
      "createParallelSubagentTool",
      "createSessionCheckpointTool",
      "getBrainstormArtifactPath",
      "getPlanArtifactPath",
      "getSolutionArtifactPath",
      "getRunArtifactPath",
      "normalizeSlug",
    ]

    expect(exportNames.sort()).toEqual(expectedExports.sort())
  })
})
