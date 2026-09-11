---
name: 02-plan
description: "Turn requirements into an execution-ready plan with TDD-gated implementation units. Use when a brainstorm artifact exists and is ready for planning."
---

# Plan

Use this skill when requirements are ready to become an execution-ready plan.

See [shared pipeline instructions](../references/pipeline-config.md) for model routing and pipeline behavior.

## Core rules

1. Load project rules (4 steps):
   - Load `rules/common/development-workflow.md` and `rules/common/testing.md`
   - Detect project language via [language detection](../references/language-detection.md)
   - Load matching language-specific rules (e.g., `rules/typescript/`)
   - If frontend/browser concerns, also load `rules/web/` files
2. **Priority:** project-level `{repo-root}/rules/` overrides package defaults
3. Search `docs/brainstorms/` for relevant requirements first
4. Run solution search (see `../references/solution-search.md`):
   - Extract keywords → `grep -rl "tags:.*keyword" docs/solutions/ ~/.pi/agent/docs/solutions/`
   - Read **frontmatter** only (first 15 lines) of matches → score by severity + tag relevance
   - Fully read top 3 candidates
5. Write plan to `docs/plans/` with the `> Status: draft` header (closed vocabulary: draft → ready → executing → done → deprecated); flip to `ready` when the plan is finalized
6. If plan exists, use **`plan_diff`** to compare and patch incrementally
7. End by recommending `03-work` — see the **Work gate and chaining** section below.
8. Every question to the user ships with a **recommended answer**: mark exactly one option with a `✓ 推荐` prefix in `ask_user_question` and give a one-line reason before asking. Questions without a recommendation are a blocking violation.

## Work gate and chaining

When the plan is finalized (`Status: ready`), present a brief plan summary (units, files, verification strategy), then ask via `ask_user_question` with the review choice folded into the gate options: `✓ 开工` (recommended), `CEO Review`, `Strict Review`. Recommend by change scale: small/safe change → `✓ 开工`, cross-cutting or risky change → CEO/Strict. **This is the default path's only human confirmation point — no other prompt may precede or follow it.** On `✓ 开工`, immediately read `../03-work/SKILL.md` and execute it in this session — do not wait for further user input. If CEO/Strict is chosen, run `references/ceo-review-mode.md`, update the plan artifact, then re-ask the gate. The four valves (defined in 03-work) apply chain-wide from this point.

## Hard gates — TDD enforcement

Every unit follows **RED → GREEN → REFACTOR**:

**TDD violation rejection criteria** — reject and revise if any unit:
- Implements code before failing test
- Lacks RED step verification
- Lacks GREEN step verification
- Skips verification
- Uses placeholders or unstated assumptions

## Planning flow

1. **Load context**: consume latest handoff before any broad file reads — `context_handoff load` or read `.context/compound-engineering/handoffs/latest.md`. If found, use `activeFiles` and `blocker` as starting point. If not found, proceed normally (new project). Read `CONTEXT.md` if it exists at root — see `../references/domain-language.md`.
2. Read relevant brainstorm from `docs/brainstorms/`. If no relevant requirements artifact exists AND the user hasn't provided requirements inline in this conversation, stop and ask via `ask_user_question` (recommended option `✓ 转 01-brainstorm`) — never draft a plan from verbal intent alone; the spec chain must start from an approved artifact
3. Run solution search (keywords → grep frontmatter → read top 3)
4. Grep `docs/out-of-scope/` for prior rejections of features in this plan
5. Gather repository context
6. **Source-driven check:** For each unit that involves framework/library APIs, add a note: "Verify against official docs before implementing."
7. If plan exists: use `plan_diff` `compare` → review with user → `patch`
8. If no plan: write new plan under `docs/plans/` using `references/plan-template.md`
9. Structure work using `references/implementation-unit-template.md`
8. Verify every unit follows TDD gates

## Optional: CEO Review

Folded into the work gate (above): the gate's options include `CEO Review` and `Strict Review`. If chosen, read `references/ceo-review-mode.md`, execute the review flow, update the plan artifact, then re-run the gate. No separate pre-gate review prompt.

## Artifact output

- Plan: `docs/plans/<slug>.md`
- Use `references/plan-template.md` structure
- Implementation units follow `references/implementation-unit-template.md`

Before finishing this skill, apply the completion checklist in [shared pipeline instructions](../references/pipeline-config.md).
