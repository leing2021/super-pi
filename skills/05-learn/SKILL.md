---
name: 05-learn
description: Capture solved problems as reusable solution artifacts.
---

# Learn

Use this skill after solving a problem so the repository gains a reusable learning in `docs/solutions/`.

See [shared pipeline instructions](../references/pipeline-config.md) for model routing and pipeline behavior.

## Core rules

- Every solution MUST include YAML frontmatter per `references/solution-schema.yaml` (title, category, severity, tags, applies_when).
- Use `references/category-map.md` to map the problem to the correct solution category.
- Check for overlap with nearby solution docs before creating a new artifact.
- Use `references/overlap-rules.md` to decide whether to create, update, or consolidate.
- Use **`pattern_extractor`** to identify recurring patterns across existing artifacts before writing a new solution.
- Structure the document with `assets/solution-template.md`.
- Determine storage level:
  - **Project-specific** → `{project-root}/docs/solutions/` (only relevant to current project)
  - **Cross-project (global)** → `~/.pi/agent/docs/solutions/` (applicable to any project)
  - Default to **global** when uncertain.
- Make the result useful to future `02-plan` and `04-review` runs via the search strategy in `references/solution-search-strategy.md`.

## Workflow

1. Identify the recently solved problem or learning.
2. Use `pattern_extractor` `extract` to scan existing artifacts for recurring patterns.
3. Use `pattern_extractor` `categorize` to group patterns by type.
4. Search `docs/solutions/` for related artifacts and perform an overlap check.
5. Choose the correct category using `references/category-map.md`.
6. Write or update the solution artifact under `docs/solutions/<category>/`.
7. Mention how future `02-plan` and `04-review` runs should benefit from the new learning.

Before finishing this skill, apply the completion checklist in [shared pipeline instructions](../references/pipeline-config.md).
