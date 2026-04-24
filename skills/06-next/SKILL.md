---
name: 06-next
description: Inspect workflow state and recommend the single best next Compound Engineering skill.
---

# Next

Use this skill only as a **compatibility shortcut** when the user asks what to do next.

## Core rule

- The primary status + next-step entry is now **`08-status`**.
- Do not present `06-next` as a separate main workflow skill.
- If the user invokes `06-next`, answer with the same behavior as `08-status`'s next-step recommendation path: inspect workflow state, recommend exactly one next skill, and keep the output lite.

## Workflow

1. Call `workflow_state` with the repo root.
2. Use `session_history` to avoid recommending already-completed steps.
3. Apply the same recommendation logic used by `08-status`.
4. Recommend exactly one next skill with a clear reason.
5. Briefly note that `08-status` is the default entry for status + next step.

## Output format

- Recommended skill name
- Why this is the next step
- Brief summary of current workflow state
- Short note: `08-status` is the default status/next-step entry

## Available skills

- `01-brainstorm` — clarify the problem and produce requirements
- `02-plan` — turn requirements into implementation units
- `03-work` — execute the plan
- `04-review` — review changes with structured findings
- `05-learn` — capture learnings as solution artifacts