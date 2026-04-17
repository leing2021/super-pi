---
name: ce-help
description: Explain when to use each Compound Engineering Phase 1 skill and how they connect.
---

# ce-help

Use this skill when the user asks how to use the package, which workflow step comes next, or which Compound Engineering skill fits the current task.

## Phase 1 skill guide

- `ce-brainstorm` — use when the request is ambiguous and needs requirements discovery before planning.
- `ce-plan` — use when requirements are clear enough to turn into implementation units, files, test scenarios, and verification steps.
- `ce-work` — use when there is a plan or a tightly scoped task ready for controlled execution.
- `ce-review` — use after code changes to produce structured findings tied to the diff and, when available, the plan.
- `ce-compound` — use after solving a problem so the repo gains a durable learning in `docs/solutions/`.
- `ce-status` — use when the user wants to know which artifact already exists and what the next workflow step should be.

## Recommended flow

1. Start with `ce-brainstorm` when the problem is still fuzzy.
2. Move to `ce-plan` once the desired behavior is clear.
3. Use `ce-work` to execute the plan.
4. Run `ce-review` after implementation.
5. Capture key learnings with `ce-compound`.
6. Use `ce-status` at any point to inspect repo-local workflow state.

## Output

When responding, explain the smallest useful next step instead of forcing the full sequence.
