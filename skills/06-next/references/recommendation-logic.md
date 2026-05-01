# Recommendation logic

Apply these rules in strict priority order. Return the first match.

## Context-first priority chain

`06-next` must call `workflow_state` and inspect `workflow_state.context` **before** applying artifact-count rules. Context health and runtime state override stale artifact counts.

Field mapping: the requirement uses `context.health` as a conceptual alias. Use the actual field name `workflow_state.context.contextHealth`.

### Priority 1: Critical context health

If `context.contextHealth` is `"critical"`:
- Recommend: save a `context_handoff` with full handoff-lite template, then open a **new session**.
- Reason: Current session context is critically inflated. Continuing will degrade decision quality and waste tokens.
- Output: handoff-save guidance + copyable new-session prompt with repo path and artifact references.

### Priority 2: Active blocker

If `context.blocker` exists and is not `"N/A"` or a placeholder:
- Recommend: return to the current stage (`context.currentStage`) and resolve the blocker before advancing.
- Reason: A known blocker exists in the current pipeline stage.
- Output: `/skill:<currentStage>` with blocker description.

### Priority 3: New session recommended

If `context.recommendNewSession === true`:
- Recommend: open a new Pi session.
- Reason: The previous stage determined that context health + phase transition warrant a fresh session.
- Output: copyable new-session prompt referencing `context.latestHandoffPath`, artifacts, and next stage.

### Priority 4: Explicit next stage

If `context.nextStage` exists, is meaningful, and differs from `context.currentStage`:
- Recommend: `/skill:<context.nextStage>`.
- Reason: The previous stage explicitly requested this transition.
- Output: recommended skill command.

### Priority 5: Stage mismatch detection

If `context.currentStage` does not match the most recent artifact state (e.g. a plan exists but context says `"01-brainstorm"`):
- Recommend: the skill that matches the most recent artifact, or ask the user to clarify.
- Reason: Runtime context and artifact state are out of sync.
- Output: suggested correction with explanation of the mismatch.

### Priority 6: Fallback — artifact-count rules

If none of the above context rules triggered, fall back to the artifact-count rules below.

## Rule 1: No brainstorm artifacts

If `brainstorms.count === 0`:
- Recommend `01-brainstorm`
- Reason: No requirements have been captured. Start by clarifying the problem.

## Rule 2: Brainstorm exists, no plan

If `brainstorms.count > 0` and `plans.count === 0`:
- Recommend `02-plan`
- Reason: Requirements exist but no implementation plan. Turn them into actionable units.

## Rule 3: Plan exists, no recent review

If `plans.count > 0` and the latest plan has no corresponding review artifact:
- Recommend `03-work`
- Reason: A plan is ready for execution. Run `03-work` to implement it.

## Rule 4: After work, review

If code changes have been made (detected by git diff) and no recent review exists:
- Recommend `04-review`
- Reason: Implementation is done. Review the changes with structured findings.

## Rule 5: After review, learn

If a review has been completed and `solutions.count` has not increased since the last workflow cycle:
- Recommend `05-learn`
- Reason: A review was completed. Capture key learnings as a durable solution artifact.

## Rule 6: All artifacts exist

If brainstorm, plan, and solution all exist:
- Recommend `05-learn` if no recent solution was added
- Otherwise recommend `01-brainstorm` for a new cycle
- Reason: A full loop may be complete. Either learn learnings or start a new cycle.

## Fallback

If no rule matches cleanly:
- Summarize the ambiguous state
- Ask the user what they want to focus on

---

# Skill registry

## Available skills

| Skill | Purpose | When to use |
|---|---|---|
| `01-brainstorm` | Clarify problem, produce requirements | Ambiguous request, new idea |
| `02-plan` | Turn requirements into implementation units | Requirements clear |
| `03-work` | Execute the plan | Plan ready |
| `04-review` | Review changes with structured findings | After implementation |
| `05-learn` | Capture learnings as solution artifacts | After solving a problem |
| `07-worktree` | Isolated git worktree development | Large/risky/parallel work |

## Artifact locations

| Artifact | Project path | Global path |
|---|---|---|
| Brainstorm | `docs/brainstorms/` | — |
| Plan | `docs/plans/` | — |
| Solution | `docs/solutions/` | `~/.pi/agent/docs/solutions/` |
| Handoff | `.context/compound-engineering/handoffs/` | — |
| Runtime | `.context/compound-engineering/` | — |

## Skill to artifact mapping

When `workflow_state` returns artifacts, map them back to skills:

- Files in `docs/brainstorms/` → produced by `01-brainstorm`
- Files in `docs/plans/` → produced by `02-plan`
- Files in `docs/solutions/` → produced by `05-learn`
- `.context/compound-engineering/` runtime artifacts → produced by `03-work` or `04-review`

## Recommendation priority

When multiple conditions are met, prioritize:

1. `01-brainstorm` — if nothing exists yet
2. `02-plan` — if brainstorm exists but no plan
3. `03-work` — if plan exists but no execution
4. `04-review` — if execution exists but no review
5. `05-learn` — if review exists but no learning captured
6. Loop back to `01-brainstorm` or `06-next` for full cycle completion
