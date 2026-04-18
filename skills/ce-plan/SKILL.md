---
name: ce-plan
description: Turn requirements or a clear request into an implementation plan.
---

# ce-plan

Use this skill when requirements are ready to become an execution-ready plan.

## Core rules

- Search `docs/brainstorms/` for a relevant requirements artifact first.
- Search `docs/solutions/` for prior learnings before structuring the plan.
- Write the final plan to `docs/plans/`.
- Break the work into implementation units instead of writing an execution script.
- If a plan already exists, use **`plan_diff`** to compare existing units with new requirements and apply incremental changes instead of rewriting.
- End by recommending `ce-work` once the plan is ready.

## Planning flow

1. Read the most relevant brainstorm artifact from `docs/brainstorms/` when one exists.
2. Search `docs/solutions/` for related learnings and fold them into the planning context.
3. Gather repository context from the affected areas.
4. If a plan already exists:
   a. Use `plan_diff` `compare` to identify added, removed, modified, and unchanged units.
   b. Review the diff with the user.
   c. Use `plan_diff` `patch` to apply approved changes.
5. If no plan exists, write a new plan artifact under `docs/plans/` using `references/plan-template.md`.
6. Structure the work using `references/implementation-unit-template.md`.
7. Hand off to `ce-work` using `references/handoff.md`.
