---
name: 06-next
description: Inspect workflow state and recommend the single best next Compound Engineering skill.
---

# Next

Use this skill when the user wants to know what to run next in the Compound Engineering workflow.

## Core rules

- Use the `workflow_state` tool to scan repo artifacts before making a recommendation.
- Use the `session_history` tool to check recent executions and avoid recommending already-completed steps.
- Recommend exactly **one** next skill with a clear reason.
- Do not execute the recommended skill — only suggest it.
- If the workflow state suggests multiple valid paths, pick the one closest to completing a full loop.

## Workflow

1. Call `workflow_state` with the repo root.
2. Read the structured state: brainstorm count, plan count, solution count, run count, and latest artifact per category.
3. Apply the recommendation logic from `references/recommendation-logic.md`.
4. Return the recommended skill and why.

## Output format

- Recommended skill name
- Why this is the next step
- Brief summary of current workflow state

## Available skills

- `01-brainstorm` — clarify the problem and produce requirements
- `02-plan` — turn requirements into implementation units
- `03-work` — execute the plan
- `04-review` — review changes with structured findings
- `05-learn` — capture learnings as solution artifacts
