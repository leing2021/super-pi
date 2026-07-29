---
name: 04-review
description: "Review code changes across five axes with evidence-first findings. Use after implementation is complete and before committing."
---

# Review

Use this skill after implementation to review changes against the diff, plan, and prior learnings.

See [shared pipeline instructions](../references/pipeline-config.md) for model routing and pipeline behavior.

## Core rules

1. Load project rules (4 steps):
   - Load `rules/common/code-review.md`
   - Detect language from changed files via [language detection](../references/language-detection.md)
   - Load matching language-specific rules (e.g., `rules/typescript/`)
   - If frontend/browser changes, also load `rules/web/` files
2. **Priority:** project-level `{repo-root}/rules/` overrides package defaults
3. Determine **diff scope** before selecting reviewers
4. Use **`review_router`** tool to select reviewer personas based on diff metadata
5. Read relevant **plan** artifact when exists
6. Run solution search (see `references/solution-search.md`):
   - Extract keywords → `grep -rl "tags:.*keyword" docs/solutions/ ~/.pi/agent/docs/solutions/`
   - Read **frontmatter** only (first 15 lines) of matches → score by severity + tag relevance
   - Fully read top 3 candidates
7. **Spec axis:** when a plan artifact exists, compare diff against it — report **missing** requirements, **scope creep** (unrequested behaviour), and **wrong implementation** (looks done but isn't). Also **trace back** to the user's original wording (brainstorm scope) to catch directional misunderstandings the plan itself encoded. Skip if no plan.
8. Produce structured findings using `references/findings-schema.md`
9. **Autofixable findings:** apply and re-review (max 3 iterations)

## Review discipline

Code review is **technical evaluation**, not social performance:
- **Verify before implementing** any suggestion
- **YAGNI check:** question features nothing uses
- **No performative agreement:** verify before concurring
- **Push back** with reasoning when findings are incorrect
- **Evidence before assertions:** cite specific code, not principles
- **Architecture axis:** audit module depth and seams using `../references/module-design.md`

### Precision gate

**Favor precision over recall.** A false positive costs more trust than a missed minor issue.
- Before reporting a non-local claim (race condition, security boundary, resource leak), use `file_read` and `code_search` to confirm evidence. Do not infer from names alone.
- Stay silent when the surrounding context is unclear. A miss on ambiguous code is acceptable; a false alarm is not.
- Do not flag issues that a compiler, formatter, linter, or type checker already catches, unless the diff shows a concrete user-visible consequence those tools miss.
- Label each finding with severity. Blocking (CRITICAL/HIGH) for correctness and security; non-blocking (LOW) for style and naming.
- Apply language-specific rules from `rules/{lang}/review-checklist.md` — they contain precise, actionable defect patterns per language.

## Handling findings

1. **Read** — complete all findings without reacting
2. **Verify** — check each against codebase reality
3. **Evaluate** — is it sound for THIS codebase?
4. **Act** — fix confirmed issues, push back on incorrect ones
5. **Test** — verify each fix individually, no regressions

## Workflow

1. **Load context**: consume latest handoff before any broad file reads — `context_handoff load` or read `.context/compound-engineering/handoffs/latest.md`. If found, use `activeFiles`, `artifacts.plan` as starting point. If not found, proceed normally. Read `CONTEXT.md` if it exists at root — see `../references/domain-language.md`.
2. Determine diff scope from branch or explicit target
3. Collect stats (files, insertions, deletions) → call `review_router`
4. Read matching plan artifact
5. Run solution search
6. Apply each reviewer persona from `review_router`
7. Merge into structured findings
8. Verify each finding against codebase
9. Apply autofixes, re-run tests, re-review if needed

## Optional: QA Test Mode

After code review complete, offer browser QA:

> Code review done. Run browser QA?
> - **A) Done** — stop here
> - **B) Browser QA** — find visual/functional bugs
> - **C) QA + regression tests** — find bugs, fix, add tests

If B or C: read `references/qa-test-mode.md` and execute workflow.
After QA: include findings in handoff, note fix commits/test files.

## Handoff

See `references/handoff.md` for format.

Before finishing this skill, apply the completion checklist in [shared pipeline instructions](../references/pipeline-config.md).
