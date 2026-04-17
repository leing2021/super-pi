---
name: ce-compound
description: Capture solved problems as reusable solution artifacts.
---

# ce-compound

Use this skill after solving a problem so the repository gains a reusable learning in `docs/solutions/`.

## Core rules

- Write the final learning to `docs/solutions/` using the schema in `references/solution-schema.yaml`.
- Use `references/category-map.md` to map the problem to the correct solution category.
- Check for overlap with nearby solution docs before creating a new artifact.
- Use `references/overlap-rules.md` to decide whether to create, update, or consolidate.
- Structure the document with `assets/solution-template.md`.
- Make the result useful to future `ce-plan` and `ce-review` runs.

## Workflow

1. Identify the recently solved problem or learning.
2. Search `docs/solutions/` for related artifacts and perform an overlap check.
3. Choose the correct category using `references/category-map.md`.
4. Write or update the solution artifact under `docs/solutions/<category>/`.
5. Mention how future `ce-plan` and `ce-review` runs should benefit from the new learning.
