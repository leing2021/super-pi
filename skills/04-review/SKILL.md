---
name: 04-review
description: "Review code with structured findings. Optional browser QA and regression tests."
---

# Review

Use this skill after implementation to review changes against the diff, the relevant plan, and prior learnings.

## Core rules

- Determine the **diff scope** before selecting reviewers.
- Use the **`review_router`** tool to automatically select reviewer personas based on diff metadata.
- Read the relevant **plan** artifact when one exists.
- Search `docs/solutions/` for related prior failures or practices.
- Produce **structured findings** using `references/findings-schema.md`.
- When findings are **autofixable**, apply fixes and re-review (max 3 iterations).
- End with a handoff that can point toward fixes, re-review, or `05-compound`.

## Review discipline — technical evaluation

Code review is **technical evaluation**, not social performance:
- **Verify before implementing** any suggestion — check against codebase reality.
- **YAGNI check**: if a suggestion adds a feature nothing uses, question whether it's needed.
- **No performative agreement** — do not agree with findings without technical verification.
- **Push back with reasoning** when a finding is technically incorrect for this codebase.
- **Evidence before assertions** — every finding must cite specific code, not general principles.

## Handling findings

When processing review findings:
1. **Read** — complete all findings without reacting.
2. **Verify** — check each finding against codebase reality.
3. **Evaluate** — is it technically sound for THIS codebase?
4. **Act** — fix confirmed issues, push back on incorrect ones with reasoning.
5. **Test** — verify each fix individually, no regressions.

## Workflow

1. Determine diff scope from the current branch or explicit review target.
2. Collect diff stats (files changed, insertions, deletions) and call `review_router`.
3. Read the matching plan artifact when one exists.
4. Search `docs/solutions/` for related learnings.
5. Apply each reviewer persona returned by `review_router`.
6. Merge the results into structured findings.
7. Verify each finding against the codebase before acting.
8. If any findings are autofixable, apply fixes, re-run tests, and re-review.

## Optional: QA Test Mode

After step 8 (code review complete), offer browser-based QA testing:

> Code review complete. Want me to also run the app through browser-based QA?
>
> - **A) Just code review** — done here
> - **B) Run browser QA** — use agent-browser to test the live app, find visual/functional bugs
> - **C) Browser QA + write regression tests** — find bugs, fix them, add regression tests

If the user picks B or C, read `references/qa-test-mode.md` and execute the QA workflow.

After QA:
1. Include QA findings in the review handoff alongside code review findings.
2. If bugs were fixed, note the fix commits.
3. If regression tests were written, note the test files.

## Handoff

After review (and optional QA) is complete, hand off using `references/handoff.md`:
1. Summarize all findings (code review + QA if run).
2. Note fix commits if any were applied.
3. Recommend `05-compound` if learnings are worth capturing.
4. Recommend `03-work` if fixes need further implementation.
