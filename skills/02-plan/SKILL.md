---
name: 02-plan
description: Turn requirements or a clear request into an implementation plan. Optionally run a CEO-style strategic review after the plan is ready.
---

# Plan

Use this skill when requirements are ready to become an execution-ready plan.

## Core rules

- Search `docs/brainstorms/` for a relevant requirements artifact first.
- Search `docs/solutions/` for prior learnings before structuring the plan.
- Write the final plan to `docs/plans/`.
- Break the work into implementation units instead of writing an execution script.
- If a plan already exists, use **`plan_diff`** to compare existing units with new requirements and apply incremental changes instead of rewriting.
- End by recommending `03-work` once the plan is ready.

## Hard gates — TDD enforcement

Every implementation unit must follow **RED, GREEN, REFACTOR**:
- No production code step may appear before a failing test step.
- Every unit must include exact verification commands.
- No placeholders allowed — replace "handle edge cases" with concrete steps.

**TDD violation rejection criteria** — stop and revise the plan if any unit:
- implements code before a failing test
- lacks a command proving the RED step
- lacks a command proving the GREEN step
- skips verification
- relies on unstated tools or assumptions

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
7. Verify every unit follows strict TDD — reject units that violate the gates above.

## Optional: CEO Review

After the plan artifact is written (step 5 or 6 above), offer the user a strategic review:

> Plan ready. How do you want to review it?
>
> - **A) Just go** — trust the plan, skip review
> - **B) CEO Review** — challenge premises, check for better alternatives, dream-state mapping
> - **C) Strict Review** — full CEO Review plus error maps, failure modes, test diagrams

If the user picks A, proceed directly to the `03-work` handoff.
If the user picks B or C, read `references/ceo-review-mode.md` and execute the review flow.

After CEO/Strict Review:
1. Update the plan artifact with any changes the user approved.
2. Note the review mode and key decisions in the plan.
3. Proceed to the `03-work` handoff.

## Implementation unit format

Every unit must include:
- **Purpose**: what this unit accomplishes
- **Files**: exact paths to create, modify, or test
- **Steps** as checkboxes:
  1. Write or update a failing test
  2. Run the targeted test and confirm it fails for the expected reason (RED)
  3. Write the minimal implementation needed to pass
  4. Run the targeted test and confirm it passes (GREEN)
  5. Refactor if needed while keeping tests green
  6. Run unit-level verification
- **Verification commands**: exact commands to run
- **Expected results**: what success looks like
