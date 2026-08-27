import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync, readdirSync } from "node:fs"
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


  test("06-next provides both next-step recommendation and full status report", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "06-next", "SKILL.md"), "utf8")

    expect(content).toContain("workflow_state")
    expect(content).toContain("session_history")
    expect(content).toContain("docs/brainstorms")
    expect(content).toContain("docs/plans")
    expect(content).toContain("docs/solutions")
    expect(content).toContain(".context/compound-engineering")
    expect(content).toContain("next")
    expect(content).toContain("status")
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
    expect(content).toContain("inline mode")
    expect(content).not.toContain("ce_parallel_subagent")
    expect(content).not.toContain("ce_subagent")
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
    expect(recommendationLogic).toContain("learn")
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

  test("03-work debug-discipline covers the full diagnosis loop", () => {
    const debug = readFileSync(
      path.join(repoRoot, "skills", "03-work", "references", "debug-discipline.md"),
      "utf8",
    )

    // Phase 1: tight loop construction + completion criterion
    expect(debug).toContain("tight loop")
    expect(debug).toContain("red-capable")
    expect(debug).toContain("non-deterministic")
    // Phase 2: minimise
    expect(debug).toContain("minimise")
    // Phase 6: post-mortem handoff to 05-learn
    expect(debug).toContain("post-mortem")
    expect(debug).toContain("05-learn")
  })

  test("references files are self-contained — no external skill paths", () => {
    // Scans every .md under skills/references/ for external path leaks.
    // super-pi must not depend on ~/.pi or absolute user paths.
    const refsDir = path.join(repoRoot, "skills", "references")
    const files = readdirSync(refsDir).filter((f) => f.endsWith(".md"))
    expect(files.length).toBeGreaterThan(0)

    const bannedPatterns = ["~/.pi", "/Users/jasonle"]
    for (const file of files) {
      const content = readFileSync(path.join(refsDir, file), "utf8")
      for (const pattern of bannedPatterns) {
        expect(content).not.toContain(pattern)
      }
    }
  })

  test("skill-level references are self-contained — only the solutions whitelist is allowed", () => {
    // Scans every .md under skills/*/references/ and skills/*/assets/ for
    // external path leaks. Unlike the top-level references test above, skill
    // references MAY legitimately reference ~/.pi/agent/docs/solutions/ (the
    // global solution library convention). Any other ~/.pi path or absolute
    // /Users/ path is a self-containment violation.
    const allowedPath = "~/.pi/agent/docs/solutions/"
    const violations: string[] = []

    for (const skill of skillNames) {
      const skillDir = path.join(repoRoot, "skills", skill)
      const subDirs = ["references", "assets"]
      for (const sub of subDirs) {
        const dir = path.join(skillDir, sub)
        if (!existsSync(dir)) continue
        const files = readdirSync(dir).filter((f) => f.endsWith(".md"))
        for (const file of files) {
          const content = readFileSync(path.join(dir, file), "utf8")
          // Reject any /Users/ absolute path outright.
          if (content.includes("/Users/")) {
            violations.push(`${skill}/${sub}/${file}: /Users/ path`)
          }
          // For ~/.pi: only the solutions whitelist is permitted.
          let searchIdx = 0
          while (true) {
            const hit = content.indexOf("~/.pi", searchIdx)
            if (hit === -1) break
            const window = content.slice(hit, hit + allowedPath.length)
            if (window !== allowedPath) {
              violations.push(`${skill}/${sub}/${file}: non-whitelisted ~/.pi path`)
            }
            searchIdx = hit + 1
          }
        }
      }
    }

    expect(violations).toEqual([])
  })

  test("domain-language reference defines the CONTEXT.md + ADR consumption contract", () => {
    const domain = readFileSync(
      path.join(repoRoot, "skills", "references", "domain-language.md"),
      "utf8",
    )

    expect(domain).toContain("CONTEXT.md")
    expect(domain).toContain("ADR")
    // ADR three-condition threshold
    expect(domain).toContain("hard to reverse")
    // Consumption rule
    expect(domain).toContain("CONTEXT-MAP.md")
  })

  test("every SKILL.md stays under 100 lines", () => {
    for (const skillName of skillNames) {
      const skillFile = path.join(repoRoot, "skills", skillName, "SKILL.md")
      const content = readFileSync(skillFile, "utf8")
      const lineCount = content.split("\n").length
      expect(lineCount).toBeLessThanOrEqual(100)
    }
  })

  test("module-design reference inlines the deep-module vocabulary", () => {
    const moduleDesign = readFileSync(
      path.join(repoRoot, "skills", "references", "module-design.md"),
      "utf8",
    )

    // Seven core terms
    expect(moduleDesign).toContain("module")
    expect(moduleDesign).toContain("interface")
    expect(moduleDesign).toContain("depth")
    expect(moduleDesign).toContain("seam")
    expect(moduleDesign).toContain("adapter")
    expect(moduleDesign).toContain("Leverage")
    expect(moduleDesign).toContain("Locality")
    // Key principles
    expect(moduleDesign).toContain("deletion test")
    expect(moduleDesign).toContain("test surface")
  })

  test("04-review runs a Spec axis against the originating plan when present", () => {
    const content = readFileSync(path.join(repoRoot, "skills", "04-review", "SKILL.md"), "utf8")
    const reviewerSelection = readFileSync(
      path.join(repoRoot, "skills", "04-review", "references", "reviewer-selection.md"),
      "utf8",
    )

    // Spec axis declares missing / scope creep / wrong implementation
    expect(content).toContain("missing")
    expect(content).toContain("scope creep")
    // Spec axis delegates probe detail to spec-source-detection.md, which traces
    // back to original wording (not just plan-vs-diff)
    expect(content).toContain("spec-source-detection.md")
    const specRef = readFileSync(
      path.join(repoRoot, "skills", "04-review", "references", "spec-source-detection.md"),
      "utf8",
    )
    expect(specRef).toContain("trace back")
    // reviewer-selection.md documents the spec-reviewer persona
    expect(reviewerSelection).toContain("spec-reviewer")
    expect(reviewerSelection).toContain("plan artifact")
    expect(reviewerSelection).toContain("directional misunderstanding")
  })

  test("04-review spec-source-detection reference documents the four-level probe", () => {
    const refPath = path.join(repoRoot, "skills", "04-review", "references", "spec-source-detection.md")
    const ref = readFileSync(refPath, "utf8")

    // Four probe levels in priority order (match the heading case in the reference)
    expect(ref).toContain("Plan artifact")
    expect(ref).toContain("Brainstorm artifact")
    expect(ref).toContain("Issue references")
    expect(ref).toContain("git log")
    // Artifact-driven guard: no auto-fetch
    expect(ref).toContain("auto-fetch")
    // SKILL.md points to this reference
    const skill = readFileSync(path.join(repoRoot, "skills", "04-review", "SKILL.md"), "utf8")
    expect(skill).toContain("spec-source-detection.md")
  })

  test("01-brainstorm premise-challenge verifies external-resource intent", () => {
    const premise = readFileSync(
      path.join(repoRoot, "skills", "01-brainstorm", "references", "premise-challenge.md"),
      "utf8",
    )

    // External resource signal must be reverse-verified before scoping
    expect(premise).toContain("External resource signal")
    expect(premise).toContain("incorporated")
  })

  test("coding-style embeds the ladder decision chain and debt marker", () => {
    const codingStyle = readFileSync(
      path.join(repoRoot, "rules", "common", "coding-style.md"),
      "utf8",
    )

    // Ordered decision ladder (stop at the first rung that holds)
    expect(codingStyle).toContain("The Ladder")
    expect(codingStyle).toContain("stdlib")
    expect(codingStyle).toContain("Platform-native")
    // Two meta-rules: lazy about writing, not reading; root cause over symptom
    expect(codingStyle).toContain("understanding the problem, not instead of it")
    expect(codingStyle).toContain("root cause")
    // Deliberate-shortcut debt marker convention
    expect(codingStyle).toContain("debt:")
    expect(codingStyle).toContain("upgrade when")
    // Never-lazy list: trust-boundary guards survive the ladder
    expect(codingStyle).toContain("Never simplify away")
  })

  test("code-smells adds dependency-axis tags beyond the Fowler baseline", () => {
    const codeSmells = readFileSync(
      path.join(repoRoot, "rules", "common", "code-smells.md"),
      "utf8",
    )

    // Reinvented-wheel detection: three tags with replacement guidance
    expect(codeSmells).toContain("stdlib:")
    expect(codeSmells).toContain("native:")
    expect(codeSmells).toContain("dependency:")
    // Tags inherit the Fowler baseline's binding rules
    expect(codeSmells).toContain("judgement call")
  })

  test("out-of-scope knowledge base records rejected/already-built requests", () => {
    const outOfScopeReadme = readFileSync(
      path.join(repoRoot, "docs", "out-of-scope", "README.md"),
      "utf8",
    )
    const learnContent = readFileSync(path.join(repoRoot, "skills", "05-learn", "SKILL.md"), "utf8")

    // README defines the KB convention
    expect(outOfScopeReadme).toContain("rejected")
    expect(outOfScopeReadme).toContain("already")
    // 05-learn writes to out-of-scope when appropriate
    expect(learnContent).toContain("out-of-scope")
  })
})
