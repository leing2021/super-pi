# Shared pipeline instructions

Use these rules in all Phase 1 skills: `01-brainstorm` → `02-plan` → `03-work` → `04-review` → `05-learn`.

## Start of skill: model routing

Run this checklist before normal skill workflow:

1. Read `.pi/settings.json` from the project root.
2. Parse `modelStrategy` (if missing, skip switching).
3. Resolve current stage key:
   - `01-brainstorm`
   - `02-plan`
   - `03-work`
   - `04-review`
   - `05-learn`
4. Pick `targetModel = modelStrategy[stageKey] ?? modelStrategy.default`.
5. If `targetModel` exists and differs from the current model, run `/model <targetModel>`.
6. If switching fails, continue with current model and mention the failure once.

## End of skill: status + optional auto-continue

Before final completion, always output this block (replace placeholders with real values, never output angle-bracket placeholders literally):

```
---
📊 Pipeline Status
- Current: <stageKey>
- Output: <main artifact path or N/A>
- Next: <next skill command or Completed>
---
```

Next step mapping:
- `01-brainstorm` → `/skill:02-plan`
- `02-plan` → `/skill:03-work`
- `03-work` → `/skill:04-review`
- `04-review` → `/skill:05-learn`
- `05-learn` → `Completed`

Then read `.pi/settings.json` → `pipeline.autoContinue`:
- If `false` or missing, stop after the status block and wait for user input.
- If current stage is `05-learn`, stop after status block.
- If `true` and current stage is not `05-learn`, auto-continue is allowed only after stage-specific gates are satisfied:
  - `01-brainstorm`: user has explicitly approved the design handoff.
  - `02-plan`: review choice is resolved (A/B/C flow completed) and user confirmed to proceed.
  - `04-review`: optional QA choice is resolved (A/B/C flow completed) and user confirmed to proceed.
  - Any unclear/ambiguous state: do not auto-continue; stop and ask.
- When gates are satisfied, automatically trigger the mapped next skill command.
