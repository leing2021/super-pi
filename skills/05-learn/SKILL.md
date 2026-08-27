---
name: 05-learn
description: "Capture solved problems as searchable solution artifacts. Use after a workflow loop completes or a non-trivial problem is solved."
---

# Learn

Use this skill after solving a problem so the repository gains a reusable learning in `docs/solutions/`.

See [shared pipeline instructions](../references/pipeline-config.md) for model routing and pipeline behavior.

## Necessity gate (decide FIRST)

**Before writing anything, decide whether this learning is worth preserving.** Most solved problems are NOT worth a solution artifact. Silence is acceptable; noise is not.

### Worth preserving (ALL must hold)

1. **Non-trivial** — the solution required real investigation, not a one-glance fix.
2. **Reusable** — the root cause or fix pattern could recur in this or another project.
3. **Not already documented** — the knowledge is not trivially findable in framework docs, the codebase, a prior solution artifact, or a commit message.

### Not worth preserving (any ONE is disqualifying)

- **One-off** — a typo, a rename, a personal-environment quirk unlikely to recur.
- **Common knowledge** — standard framework usage, language basics, or anything a competent practitioner would know or find in official docs in under a minute.
- **Already captured** — the learning is fully expressed in the code, its tests, a commit message, or an existing `docs/solutions/` artifact.
- **Trivial refactor** — formatting, import sorting, or mechanical changes with no insight.
- **No root cause insight** — the fix worked but you cannot explain *why* it worked; without the "why", the artifact will not help future readers.

### Outcome

- If **not worth preserving**: respond concisely (e.g. "No solution artifact needed: <one-line reason>") and stop. Do not create a file.
- If **worth preserving**: proceed to Core rules below.

## Core rules

- Every solution MUST include YAML frontmatter per `references/solution-schema.yaml` (title, category, severity, tags, applies_when).
- Use `references/category-map.md` to map the problem to the correct solution category.
- Check for overlap with nearby solution docs before creating a new artifact.
- Use `references/overlap-rules.md` to decide whether to create, update, consolidate, or retire.
- Use **`pattern_extractor`** to identify recurring patterns across existing artifacts before writing a new solution.
- Structure the document with `assets/solution-template.md`.
- Determine storage level:
  - **Project-specific** → `{project-root}/docs/solutions/` (only relevant to current project)
  - **Cross-project (global)** → `~/.pi/agent/docs/solutions/` (applicable to any project)
  - Default to **global** when uncertain.
- **Out-of-scope branch:** if the request was rejected or already implemented, write to `docs/out-of-scope/` (template: `assets/out-of-scope-template.md`, convention: `../../docs/out-of-scope/README.md`) instead of `docs/solutions/`.
- Make the result useful to future `02-plan` and `04-review` runs via the search strategy in `references/solution-search-strategy.md`.

## Workflow

1. Identify the recently solved problem or learning.
2. Use `pattern_extractor` `extract` to scan existing artifacts for recurring patterns.
3. Use `pattern_extractor` `categorize` to group patterns by type.
4. Search `docs/solutions/` for related artifacts and perform an overlap check.
5. Choose the correct category using `references/category-map.md`.
6. Write or update the solution artifact under `docs/solutions/<category>/`.
7. Mention how future `02-plan` and `04-review` runs should benefit from the new learning.
8. Include `🧠 Context Status` (health, handoff path, active files, new-session recommendation) for workflow closure.
9. Save/mention handoff-lite path under `.context/compound-engineering/handoffs/` using the shared `Handoff-lite template` in `skills/references/pipeline-config.md`.

Before finishing this skill, apply the completion checklist in [shared pipeline instructions](../references/pipeline-config.md).
