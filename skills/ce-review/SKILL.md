---
name: ce-review
description: Review code changes with structured findings using routed reviewer personas and optional autofix.
---

# ce-review

Use this skill after implementation to review changes against the diff, the relevant plan, and prior learnings.

## Core rules

- Determine the **diff scope** before selecting reviewers.
- Use the **`review_router`** tool to automatically select reviewer personas based on diff metadata.
- Read the relevant **plan** artifact when one exists.
- Search `docs/solutions/` for related prior failures or practices.
- Produce **structured findings** using `references/findings-schema.md`.
- When findings are **autofixable**, apply fixes and re-review (max 3 iterations).
- End with a handoff that can point toward fixes, re-review, or `ce-compound`.

## Workflow

1. Determine diff scope from the current branch or explicit review target.
2. Collect diff stats (files changed, insertions, deletions) and call `review_router`.
3. Read the matching plan artifact when one exists.
4. Search `docs/solutions/` for related learnings.
5. Apply each reviewer persona returned by `review_router`.
6. Merge the results into structured findings.
7. If any findings are autofixable, apply fixes, re-run tests, and re-review.
8. Hand off using `references/handoff.md`.
