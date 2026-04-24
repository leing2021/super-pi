# Recommendation logic

Apply these rules in order. Return the first match.

## Context pre-check

If `context.recommendNewSession === true`, keep normal stage recommendation but add guidance:
- Continue in a **new session**
- Use `context.latestHandoffPath` as the first runtime input
- Keep output concise (lite mode)

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
- Recommend `08-status`
- Reason: State is ambiguous. Get a detailed report before deciding.

## Output constraints

- Recommend exactly one skill.
- Include a one-line context status: health + handoff path + new-session recommendation.
- Keep response short (target <= 300 tokens).
