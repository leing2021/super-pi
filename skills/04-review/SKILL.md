---
name: 04-review
description: "Review code changes across five axes with evidence-first findings. Use after implementation is complete and before committing."
---

# Review

Use this skill after implementation to review changes against the diff, plan, and prior learnings.

See [shared pipeline instructions](../references/pipeline-config.md) for model routing and pipeline behavior.

## Core rules

1. Load project rules before producing findings (detailed in Workflow step 3): load `../../rules/common/code-review.md` + `code-smells.md`, detect language from changed files, load matching `rules/{lang}/` files including `review-checklist.md` (mark `missing (fell back to common)` when absent), plus `rules/web/` for frontend/browser changes. Emit a `Rules loaded:` manifest — **no manifest, no findings**
2. **Priority:** project-level `{repo-root}/rules/` overrides package defaults
3. **Standards axis baseline:** apply [`../../rules/common/code-smells.md`](../../rules/common/code-smells.md) (Fowler smell baseline). Two binding rules: a documented repo standard overrides the baseline; every smell is a judgement call (report as "possible Feature Envy"), never a hard violation. Map severity via P0/P1/P2 — default P2, escalate when a repo doc endorses it or it harms data flow/testability.
4. Determine **diff scope** before selecting reviewers
5. Use **`review_router`** tool to select reviewer personas based on diff metadata
6. Read relevant **plan** artifact when exists
7. Run solution search (see `../references/solution-search.md`): extract keywords → `grep -rl "tags:.*keyword" docs/solutions/ ~/.pi/agent/docs/solutions/`; read **frontmatter** only (first 15 lines) of matches → score by severity + tag relevance; fully read top 3 candidates
8. **Spec axis:** determine spec source via [`references/spec-source-detection.md`](references/spec-source-detection.md) (plan → brainstorm → commit issue ref → skip). Against the chosen spec, report **missing** requirements, **scope creep** (unrequested behaviour), and **wrong implementation** (looks done but isn't).
9. Produce structured findings using `references/findings-schema.md`
10. **Autofixable findings:** the main session applies autofixes and re-reviews (cap governed by **Fix loop and chain** below; the isolated reviewer never applies fixes — it only marks `autofixable`)

## Review discipline

Code review is **technical evaluation**, not social performance: **verify before implementing** any suggestion; **YAGNI check** — question features nothing uses; **no performative agreement** — verify before concurring; **push back** with reasoning when findings are incorrect; **evidence before assertions** — cite specific code, not principles; **architecture axis** — audit module depth and seams using `../references/module-design.md`.

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
6. **Close** — when findings are resolved and tests green, flip the reviewed plan's Status header to `done` and move it to `docs/plans/archive/` (skip if no plan artifact)

## Chain entry: isolated review first

The review executes first in an isolated spawned session via the `isolated_review` tool — a fresh pi session with zero author context runs the reviewer workflow and writes a findings artifact. The main session never reviews its own code unless isolation is unavailable.

Main-session responsibilities: call `isolated_review` (repoRoot, diffBase from handoff, fresh findingsPath under `.context/compound-engineering/findings/`); on `completed` read findings and drive the Fix loop and chain; on `degraded` follow its degraded path; on `aborted` surface to the user — never silently re-run. The sections below define what the spawned reviewer (and a degraded in-session review, verbatim) executes.

## Workflow

1. **Load context**: consume latest handoff before any broad file reads — `context_handoff load` or read `.context/compound-engineering/handoffs/latest.md`; use `activeFiles`, `artifacts.plan` as starting point (proceed normally if absent). Read `CONTEXT.md` if it exists at root — see `../references/domain-language.md`.
2. Determine diff scope — prefer `branch`/`base` from latest handoff if present; else from explicit target; else ask user
3. **Load project rules** (blocking — no findings before this completes): detect language from changed files (`.ts`→typescript, `.py`→python, `.go`→golang, `.rs`→rust, `.java`→java) or repo markers, merging `{repo-root}/rules/language-detection.md` (project-level map, same marker wins); mixed-language diffs load per language ([full map](../references/language-detection.md)). Check `{repo-root}/rules/` first (overrides package defaults); load `rules/common/code-review.md`, `code-smells.md`, matching `rules/{lang}/` files including `review-checklist.md`, `rules/web/` for frontend changes. Emit manifest before any finding: `Rules loaded: language=<lang> (via <files/markers>, project-level map), common=<files>, lang=<files>, web=<files or N/A>`. **Same-session re-entry:** if the transcript already has a `Rules loaded:` manifest for the same language, reuse it and note the skip
4. Collect stats (files, insertions, deletions) → call `review_router`
5. Read matching plan artifact; if absent, follow [`references/spec-source-detection.md`](references/spec-source-detection.md) to probe brainstorm and commit issue refs
6. Run solution search
7. Apply each reviewer persona from `review_router`
8. Merge into structured findings — include `rules applied` in the review summary (see `references/findings-schema.md`)
9. Verify each finding against codebase
10. Apply autofixes, re-run tests, re-review if needed

## Optional: QA Test Mode

After code review completes, offer browser QA:

> Code review done. Run browser QA?
> - **A) Done** — stop here
> - **B) Browser QA** — find visual/functional bugs
> - **C) QA + regression tests** — find bugs, fix, add tests

If B or C: read `references/qa-test-mode.md` and execute. After QA: include findings in handoff, note fix commits/test files.

## Fix loop and chain

The spawned reviewer produces findings; the main session (author side) owns every fix:

1. After findings arrive, fix confirmed P0/P1 issues in the main session (subsumes the autofix loop in Core rule 10); verify each fix; run tests
2. Re-review trigger — iff findings contain a P0, or a previous P1 now has a fix diff awaiting verification. Pure P2 findings never re-enter the loop: record them in the handoff instead
3. Re-review is incremental: call `isolated_review` again with `incrementalPreviousFindingsPath` = previous round's artifact. The fresh reviewer verifies only the fix diff against those findings — not the whole codebase
4. The cap of 2 rounds is a ceiling, not a quota: any round that returns all-green (no P0, no P1 fix awaiting verification) ends the loop immediately
5. 2 rounds exhausted with P0/P1 remaining: stop-the-line — hand the user the latest findings artifact plus the full findings chain (paths of every round) as the decision basis. Do not proceed to 05-learn
6. All-green: immediately read `../05-learn/SKILL.md` and execute it in this session — do not wait for user instruction

### Degraded mode

When `isolated_review` returns degraded (frontmatter `isolation: degraded` + `spawn_error`): execute the Workflow below in THIS session (author context, reduced independence); keep the degraded markings in every findings artifact produced; loop semantics unchanged — ceiling of 2, all-green early exit, incremental in-session re-review, same stop-the-line delivery

## Handoff

See `references/handoff.md` for format.

Before finishing this skill, apply the completion checklist in [shared pipeline instructions](../references/pipeline-config.md).
