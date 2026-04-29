---
name: 06-next
description: "Inspect workflow state and recommend the single best next Compound Engineering skill. Use --verbose for a full status report."
---

# Next

Use this skill when the user wants to know what to run next in the Compound Engineering workflow, or wants a full status report of the current project state.

## Core rules

- Use the `workflow_state` tool to scan repo artifacts before making a recommendation.
- Use the `session_history` tool to check recent executions and avoid recommending already-completed steps.
- Recommend exactly **one** next skill with a clear reason.
- Do not execute the recommended skill — only suggest it.
- If the workflow state suggests multiple valid paths, pick the one closest to completing a full loop.

## Two modes

### Default mode: "what's next?"

When the user asks "what should I do next?", "continue", or runs `/skill:06-next`:

1. Call `workflow_state` with the repo root.
2. Apply the recommendation logic from `references/recommendation-logic.md`.
3. Return:
   - **Recommended skill name**
   - **Why** this is the next step
   - **Brief** summary of current workflow state (1-2 lines)

### Verbose mode: "full status"

When the user asks "show status", "what's the current state", or explicitly requests a detailed report:

1. Call `workflow_state` with the repo root.
2. Call `session_history` with `latest` operation to check recent executions.
3. Return:
   - Latest relevant brainstorm (path + brief summary)
   - Latest relevant plan (path + brief summary)
   - Latest relevant solution (path + brief summary)
   - Latest runtime artifacts under `.context/compound-engineering/`
   - Recommended next step with reason
   - Overall workflow phase summary

## Artifact locations

| Artifact | Path |
|---|---|
| Brainstorm | `docs/brainstorms/` |
| Plan | `docs/plans/` |
| Solution | `docs/solutions/` |
| Runtime | `.context/compound-engineering/` |

If `workflow_state` is not available, fall back to `bash` with `ls` and `find` to check which directories and recent files exist, then use `read` on the most relevant recent artifact.

## Available skills

- `01-brainstorm` — clarify the problem and produce requirements
- `02-plan` — turn requirements into implementation units
- `03-work` — execute the plan
- `04-review` — review changes with structured findings
- `05-learn` — capture learnings as solution artifacts
- `07-worktree` — isolated git worktree development

Before finishing this skill, apply the completion checklist in [shared pipeline instructions](../references/pipeline-config.md).
