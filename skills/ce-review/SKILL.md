---
name: ce-review
description: Review code changes with structured Phase 1 findings.
---

# ce-review

Use this skill after implementation to review changes against the diff, the relevant plan, and prior learnings.

## Core rules

- Determine the **diff scope** before selecting reviewers.
- Read the relevant **plan** artifact when one exists.
- Search `docs/solutions/` for related prior failures or practices.
- Produce **structured findings** using `references/findings-schema.md`.
- Select reviewers conditionally using `references/reviewer-selection.md`.
- End with a handoff that can point toward fixes, re-review, or `ce-compound`.

## Workflow

1. Determine diff scope from the current branch or explicit review target.
2. Read the matching plan artifact when one exists.
3. Search `docs/solutions/` for related learnings.
4. Choose reviewer personas using `references/reviewer-selection.md`.
5. Merge the results into structured findings.
6. Hand off using `references/handoff.md`.
