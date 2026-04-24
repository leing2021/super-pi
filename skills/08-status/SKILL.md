---
name: 08-status
description: Inspect repo-local workflow artifacts and recommend the next Compound Engineering step.
---

# Status

Use this skill when the user wants to know the current state of the Compound Engineering workflow in this repository, or wants the single best next step.

## What to scan

Use the `workflow_state` tool to get structured artifact state. It scans these repo-local locations:

- `docs/brainstorms/`
- `docs/plans/`
- `docs/solutions/`
- `.context/compound-engineering/`

Use the `session_history` tool to check recent CE skill executions and their outcomes.

Also inspect `workflow_state.context` for:
- `currentStage`
- `nextStage`
- `contextHealth`
- `latestHandoffPath`
- `recommendNewSession`

If `workflow_state` is not available, fall back to `bash` with `ls` and `find` to check which directories and recent files exist, then use `read` on the most relevant recent artifact.

## Recommendation logic

`08-status` is the default entry for both **current status** and **what to do next**.

- If `context.recommendNewSession=true`, keep normal next-step recommendation but prepend: "建议在新 Session 中继续（使用 latest handoff）".
- If `context.latestHandoffPath` exists, include it in output without expanding file content.

- If there is no recent `docs/brainstorms/` artifact and the request is still ambiguous, recommend `01-brainstorm` next.
- If a recent brainstorm exists but there is no matching plan in `docs/plans/`, recommend `02-plan` next.
- If a recent plan exists and implementation appears incomplete, recommend `03-work` next.
- If code has changed after planning, recommend `04-review` next.
- If a problem was just solved and there is no matching learning in `docs/solutions/`, recommend `05-learn` next.
- If multiple artifacts exist, summarize them briefly and name the single best next step.

## Output format

Return (lite, target <= 500 tokens):

- latest relevant brainstorm
- latest relevant plan
- latest relevant solution
- latest relevant runtime artifact under `.context/compound-engineering/`
- context status (health, latest handoff path, new-session recommendation)
- recommended next step
- why this is the next step

## Compatibility note

- If the user asks for `06-next`, treat it as a compatibility alias for the next-step part of `08-status`.
- Do not frame `06-next` as a separate main workflow entry.
