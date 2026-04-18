import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const repoRoot = path.resolve(import.meta.dir, "..")

const skillNames = [
  "ce-brainstorm",
  "ce-plan",
  "ce-work",
  "ce-review",
  "ce-compound",
  "ce-help",
  "ce-status",
  "ce-next",
  "ce-worktree",
]

describe("skill package contracts", () => {
  test("exposes all Phase 1 skill directories and entry files", () => {
    for (const skillName of skillNames) {
      const skillDir = path.join(repoRoot, "skills", skillName)
      const skillFile = path.join(skillDir, "SKILL.md")

      expect(existsSync(skillDir)).toBe(true)
      expect(existsSync(skillFile)).toBe(true)
    }
  })

  test("every skill has a references or assets directory", () => {
    for (const skillName of skillNames) {
      const skillDir = path.join(repoRoot, "skills", skillName)
      const hasReferences = existsSync(path.join(skillDir, "references"))
      const hasAssets = existsSync(path.join(skillDir, "assets"))
      expect(hasReferences || hasAssets).toBe(true)
    }
  })

  test("uses valid frontmatter names and descriptions", () => {
    for (const skillName of skillNames) {
      const skillFile = path.join(repoRoot, "skills", skillName, "SKILL.md")
      const content = readFileSync(skillFile, "utf8")

      expect(content).toContain(`name: ${skillName}`)
      expect(content).toContain("description:")
    }
  })

  test("exposes the ce-core extension entrypoint", () => {
    expect(existsSync(path.join(repoRoot, "extensions", "ce-core", "index.ts"))).toBe(true)
  })

  test("ce-help explains when to use each Phase 1 skill", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "ce-help", "SKILL.md"), "utf8")

    expect(content).toContain("ce-brainstorm")
    expect(content).toContain("ce-plan")
    expect(content).toContain("ce-work")
    expect(content).toContain("ce-review")
    expect(content).toContain("ce-compound")
    expect(content).toContain("ce-status")
  })

  test("ce-status scans repo-local artifacts before recommending next steps", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "ce-status", "SKILL.md"), "utf8")

    expect(content).toContain("workflow_state")
    expect(content).toContain("session_history")
    expect(content).toContain("docs/brainstorms")
    expect(content).toContain("docs/plans")
    expect(content).toContain("docs/solutions")
    expect(content).toContain(".context/compound-engineering")
    expect(content).toContain("next")
    expect(content).toContain("workflow_state")
  })

  test("ce-brainstorm writes requirements artifacts and hands off to ce-plan", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "ce-brainstorm", "SKILL.md"), "utf8")
    const template = readFileSync(
      path.join(repoRoot, "skills", "ce-brainstorm", "references", "requirements-template.md"),
      "utf8",
    )
    const handoff = readFileSync(
      path.join(repoRoot, "skills", "ce-brainstorm", "references", "handoff.md"),
      "utf8",
    )

    expect(content).toContain("one question at a time")
    expect(content).toContain("2-3")
    expect(content).toContain("approach")
    expect(content).toContain("brainstorm_dialog")
    expect(content).toContain("refine")
    expect(content).toContain("summarize")
    expect(content).toContain("docs/brainstorms/")
    expect(content).toContain("implementation details")
    expect(template).toContain("Requirements")
    expect(template).toContain("Success criteria")
    expect(handoff).toContain("ce-plan")
  })

  test("ce-plan searches brainstorms and solutions, then writes implementation units", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "ce-plan", "SKILL.md"), "utf8")
    const template = readFileSync(
      path.join(repoRoot, "skills", "ce-plan", "references", "plan-template.md"),
      "utf8",
    )
    const unitTemplate = readFileSync(
      path.join(repoRoot, "skills", "ce-plan", "references", "implementation-unit-template.md"),
      "utf8",
    )
    const handoff = readFileSync(
      path.join(repoRoot, "skills", "ce-plan", "references", "handoff.md"),
      "utf8",
    )

    expect(content).toContain("plan_diff")
    expect(content).toContain("docs/brainstorms/")
    expect(content).toContain("docs/solutions/")
    expect(content).toContain("docs/plans/")
    expect(template).toContain("Implementation units")
    expect(unitTemplate).toContain("Goal")
    expect(unitTemplate).toContain("Files")
    expect(unitTemplate).toContain("Patterns to follow")
    expect(unitTemplate).toContain("Test scenarios")
    expect(unitTemplate).toContain("Verification")
    expect(unitTemplate).toContain("Dependencies")
    expect(handoff).toContain("ce-work")
  })

  test("ce-compound writes structured solution artifacts and checks overlap", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "ce-compound", "SKILL.md"), "utf8")
    const schema = readFileSync(
      path.join(repoRoot, "skills", "ce-compound", "references", "solution-schema.yaml"),
      "utf8",
    )
    const categoryMap = readFileSync(
      path.join(repoRoot, "skills", "ce-compound", "references", "category-map.md"),
      "utf8",
    )
    const overlapRules = readFileSync(
      path.join(repoRoot, "skills", "ce-compound", "references", "overlap-rules.md"),
      "utf8",
    )
    const template = readFileSync(
      path.join(repoRoot, "skills", "ce-compound", "assets", "solution-template.md"),
      "utf8",
    )

    expect(content).toContain("pattern_extractor")
    expect(content).toContain("docs/solutions/")
    expect(content).toContain("schema")
    expect(content).toContain("overlap")
    expect(content).toContain("ce-plan")
    expect(content).toContain("ce-review")
    expect(schema).toContain("category")
    expect(schema).toContain("problem_type")
    expect(categoryMap).toContain("workflow")
    expect(overlapRules).toContain("High")
    expect(overlapRules).toContain("Moderate")
    expect(template).toContain("Problem")
    expect(template).toContain("Solution")
  })

  test("ce-work distinguishes plan-path execution from bare prompts and hands off to ce-review", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "ce-work", "SKILL.md"), "utf8")
    const progress = readFileSync(
      path.join(repoRoot, "skills", "ce-work", "references", "progress-update-format.md"),
      "utf8",
    )
    const handoff = readFileSync(
      path.join(repoRoot, "skills", "ce-work", "references", "handoff.md"),
      "utf8",
    )

    expect(content).toContain("plan path")
    expect(content).toContain("bare prompt")
    expect(content).toContain("implementation units")
    expect(content).toContain("inline")
    expect(content).toContain("serial subagents")
    expect(content).toContain("parallel_subagent")
    expect(content).toContain("session_checkpoint")
    expect(content).toContain("task_splitter")
    expect(content).toContain("retry")
    expect(content).toContain("verification")
    expect(content).toContain("worktree")
    expect(progress).toContain("Completed")
    expect(progress).toContain("Verification")
    expect(handoff).toContain("ce-review")
  })

  test("ce-review detects scope, reads plans and solutions, uses review_router and autofix", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "ce-review", "SKILL.md"), "utf8")
    const findingsSchema = readFileSync(
      path.join(repoRoot, "skills", "ce-review", "references", "findings-schema.md"),
      "utf8",
    )
    const reviewerSelection = readFileSync(
      path.join(repoRoot, "skills", "ce-review", "references", "reviewer-selection.md"),
      "utf8",
    )
    const handoff = readFileSync(
      path.join(repoRoot, "skills", "ce-review", "references", "handoff.md"),
      "utf8",
    )

    expect(content).toContain("diff scope")
    expect(content).toContain("plan")
    expect(content).toContain("docs/solutions/")
    expect(content).toContain("structured findings")
    expect(content).toContain("review_router")
    expect(content).toContain("autofix")
    expect(findingsSchema).toContain("severity")
    expect(findingsSchema).toContain("summary")
    expect(findingsSchema).toContain("evidence")
    expect(findingsSchema).toContain("recommended action")
    expect(findingsSchema).toContain("autofixable")
    expect(reviewerSelection).toContain("review_router")
    expect(reviewerSelection).toContain("correctness-reviewer")
    expect(reviewerSelection).toContain("security-reviewer")
    expect(handoff).toContain("ce-compound")
    expect(handoff).toContain("autofix")
  })

  test("ce-next uses workflow_state to recommend the next skill", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "ce-next", "SKILL.md"), "utf8")
    const recommendationLogic = readFileSync(
      path.join(repoRoot, "skills", "ce-next", "references", "recommendation-logic.md"),
      "utf8",
    )

    expect(content).toContain("workflow_state")
    expect(content).toContain("session_history")
    expect(content).toContain("ce-brainstorm")
    expect(content).toContain("ce-plan")
    expect(content).toContain("ce-work")
    expect(content).toContain("ce-review")
    expect(content).toContain("ce-compound")
    expect(recommendationLogic).toContain("brainstorm")
    expect(recommendationLogic).toContain("plan")
    expect(recommendationLogic).toContain("work")
    expect(recommendationLogic).toContain("review")
    expect(recommendationLogic).toContain("compound")
  })

  test("ce-worktree manages git worktree lifecycle using worktree_manager", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "ce-worktree", "SKILL.md"), "utf8")

    expect(content).toContain("worktree_manager")
    expect(content).toContain("create")
    expect(content).toContain("merge")
    expect(content).toContain("cleanup")
    expect(content).toContain("ce-work")
  })
})
