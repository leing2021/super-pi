# Recommendation logic

Apply these rules in order. Return the first match.

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
