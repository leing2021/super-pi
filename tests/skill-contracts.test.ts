import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const repoRoot = path.resolve(import.meta.dir, "..")

const skillNames = [
  "01-brainstorm",
  "02-plan",
  "03-work",
  "04-review",
  "05-learn",
  "06-next",
  "07-worktree",
  "08-status",
  "09-help",
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

  test("09-help explains when to use each Phase 1 skill", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "09-help", "SKILL.md"), "utf8")

    expect(content).toContain("01-brainstorm")
    expect(content).toContain("02-plan")
    expect(content).toContain("03-work")
    expect(content).toContain("04-review")
    expect(content).toContain("05-learn")
    expect(content).toContain("08-status")
  })

  test("08-status scans repo-local artifacts before recommending next steps", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "08-status", "SKILL.md"), "utf8")

    expect(content).toContain("workflow_state")
    expect(content).toContain("session_history")
    expect(content).toContain("docs/brainstorms")
    expect(content).toContain("docs/plans")
    expect(content).toContain("docs/solutions")
    expect(content).toContain(".context/compound-engineering")
    expect(content).toContain("next")
    expect(content).toContain("workflow_state")
  })

  test("01-brainstorm writes requirements artifacts and hands off to 02-plan", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "01-brainstorm", "SKILL.md"), "utf8")
    const template = readFileSync(
      path.join(repoRoot, "skills", "01-brainstorm", "references", "requirements-template.md"),
      "utf8",
    )
    const handoff = readFileSync(
      path.join(repoRoot, "skills", "01-brainstorm", "references", "handoff.md"),
      "utf8",
    )

    expect(content).toContain("one question at a time")
    expect(content).toContain("2-3")
    expect(content).toContain("approach")
    expect(content).toContain("brainstorm_dialog")
    expect(content).toContain("refine")
    expect(content).toContain("summarize")
    expect(content).toContain("design checklist")
    expect(content).toContain("approval")
    expect(content.toLowerCase()).toContain("stop conditions")
    expect(content).toContain("docs/brainstorms/")
    expect(content).toContain("implementation details")
    expect(template).toContain("Requirements")
    expect(template).toContain("Success criteria")
    expect(handoff).toContain("02-plan")
  })

  test("02-plan searches brainstorms and solutions, then writes implementation units", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "02-plan", "SKILL.md"), "utf8")
    const template = readFileSync(
      path.join(repoRoot, "skills", "02-plan", "references", "plan-template.md"),
      "utf8",
    )
    const unitTemplate = readFileSync(
      path.join(repoRoot, "skills", "02-plan", "references", "implementation-unit-template.md"),
      "utf8",
    )
    const handoff = readFileSync(
      path.join(repoRoot, "skills", "02-plan", "references", "handoff.md"),
      "utf8",
    )

    expect(content).toContain("plan_diff")
    expect(content).toContain("RED")
    expect(content).toContain("GREEN")
    expect(content).toContain("REFACTOR")
    expect(content).toContain("TDD violation")
    expect(content).toContain("docs/brainstorms/")
    expect(content).toContain("docs/plans/")
    // Must include grep-first solution search strategy
    expect(content).toContain("grep -rl")
    expect(content).toContain("~/.pi/agent/docs/solutions")
    expect(content).toContain("frontmatter")
    expect(template).toContain("Implementation units")
    expect(unitTemplate).toContain("Goal")
    expect(unitTemplate).toContain("Files")
    expect(unitTemplate).toContain("Patterns to follow")
    expect(unitTemplate).toContain("Test scenarios")
    expect(unitTemplate).toContain("Verification")
    expect(unitTemplate).toContain("Dependencies")
    expect(handoff).toContain("03-work")
  })

  test("05-learn writes structured solution artifacts and checks overlap", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "05-learn", "SKILL.md"), "utf8")
    const schema = readFileSync(
      path.join(repoRoot, "skills", "05-learn", "references", "solution-schema.yaml"),
      "utf8",
    )
    const categoryMap = readFileSync(
      path.join(repoRoot, "skills", "05-learn", "references", "category-map.md"),
      "utf8",
    )
    const overlapRules = readFileSync(
      path.join(repoRoot, "skills", "05-learn", "references", "overlap-rules.md"),
      "utf8",
    )
    const template = readFileSync(
      path.join(repoRoot, "skills", "05-learn", "assets", "solution-template.md"),
      "utf8",
    )

    expect(content).toContain("pattern_extractor")
    expect(content).toContain("docs/solutions/")
    expect(content).toContain("schema")
    expect(content).toContain("overlap")
    expect(content).toContain("02-plan")
    expect(content).toContain("04-review")
    // Schema: 5-field frontmatter (title, category, severity, tags, applies_when)
    expect(schema).toContain("title")
    expect(schema).toContain("category")
    expect(schema).toContain("severity")
    expect(schema).toContain("tags")
    expect(schema).toContain("applies_when")
    expect(categoryMap).toContain("workflow")
    expect(overlapRules).toContain("High")
    expect(overlapRules).toContain("Moderate")
    // Template must include YAML frontmatter block
    expect(template).toContain("---")
    expect(template).toContain("title:")
    expect(template).toContain("category:")
    expect(template).toContain("Problem")
    expect(template).toContain("Solution")
  })

  test("03-work distinguishes plan-path execution from bare prompts and hands off to 04-review", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "03-work", "SKILL.md"), "utf8")
    const progress = readFileSync(
      path.join(repoRoot, "skills", "03-work", "references", "progress-update-format.md"),
      "utf8",
    )
    const handoff = readFileSync(
      path.join(repoRoot, "skills", "03-work", "references", "handoff.md"),
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
    expect(content).toContain("RED")
    expect(content).toContain("GREEN")
    expect(content).toContain("completion report")
    expect(content).toContain("verification")
    expect(content).toContain("worktree")
    expect(progress).toContain("Completed")
    expect(progress).toContain("Verification")
    expect(handoff).toContain("04-review")
  })

  test("04-review detects scope, reads plans and solutions, uses review_router and autofix", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "04-review", "SKILL.md"), "utf8")
    const findingsSchema = readFileSync(
      path.join(repoRoot, "skills", "04-review", "references", "findings-schema.md"),
      "utf8",
    )
    const reviewerSelection = readFileSync(
      path.join(repoRoot, "skills", "04-review", "references", "reviewer-selection.md"),
      "utf8",
    )
    const handoff = readFileSync(
      path.join(repoRoot, "skills", "04-review", "references", "handoff.md"),
      "utf8",
    )

    expect(content).toContain("diff scope")
    expect(content).toContain("plan")
    expect(content).toContain("structured findings")
    expect(content).toContain("review_router")
    expect(content).toContain("autofix")
    expect(content).toContain("YAGNI")
    expect(content).toContain("technical evaluation")
    // Must include grep-first solution search strategy
    expect(content).toContain("grep -rl")
    expect(content).toContain("~/.pi/agent/docs/solutions")
    expect(content).toContain("frontmatter")
    expect(findingsSchema).toContain("severity")
    expect(findingsSchema).toContain("summary")
    expect(findingsSchema).toContain("evidence")
    expect(findingsSchema).toContain("recommended action")
    expect(findingsSchema).toContain("autofixable")
    expect(reviewerSelection).toContain("review_router")
    expect(reviewerSelection).toContain("correctness-reviewer")
    expect(reviewerSelection).toContain("security-reviewer")
    expect(handoff).toContain("05-learn")
    expect(handoff).toContain("autofix")
  })

  test("06-next uses workflow_state to recommend the next skill", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "06-next", "SKILL.md"), "utf8")
    const recommendationLogic = readFileSync(
      path.join(repoRoot, "skills", "06-next", "references", "recommendation-logic.md"),
      "utf8",
    )

    expect(content).toContain("workflow_state")
    expect(content).toContain("session_history")
    expect(content).toContain("01-brainstorm")
    expect(content).toContain("02-plan")
    expect(content).toContain("03-work")
    expect(content).toContain("04-review")
    expect(content).toContain("05-learn")
    expect(recommendationLogic).toContain("brainstorm")
    expect(recommendationLogic).toContain("plan")
    expect(recommendationLogic).toContain("work")
    expect(recommendationLogic).toContain("review")
    expect(recommendationLogic).toContain("compound")
  })

  test("07-worktree manages git worktree lifecycle using worktree_manager", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "07-worktree", "SKILL.md"), "utf8")

    expect(content).toContain("worktree_manager")
    expect(content).toContain("create")
    expect(content).toContain("merge")
    expect(content).toContain("cleanup")
    expect(content).toContain("03-work")
  })

  test("05-learn solution-search-strategy defines grep-first retrieval steps", () => {
    const strategy = readFileSync(
      path.join(repoRoot, "skills", "05-learn", "references", "solution-search-strategy.md"),
      "utf8",
    )

    expect(strategy).toContain("grep")
    expect(strategy).toContain("frontmatter")
    expect(strategy).toContain("severity")
    expect(strategy).toContain("tags")
    // Must define two-level search: project-level + global-level
    expect(strategy).toContain("~/.pi/agent/docs/solutions")
  })
})
