# Handoff from 04-review

When the review is complete:

1. Summarize the highest-priority structured findings.
2. State whether fixes or re-review are needed.
3. If findings are **autofixable**, apply the fixes and re-review the changes.
4. After autofix, report what was changed and whether re-review confirms the fix.
5. Recommend `05-learn` when the review surfaced a reusable learning or newly solved problem.
6. Mention any relevant plan or solution artifacts referenced during review.

## Autofix loop

When findings have `autofixable: true`:

1. Apply the fix for each autofixable finding.
2. Re-run affected tests.
3. Re-review only the changed lines.
4. If re-review produces new findings, repeat (max 3 iterations).
5. Report final state: fixed, partially fixed, or needs manual intervention.
