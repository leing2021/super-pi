---
name: 03-work
description: Execute plan-driven work in a controlled Phase 1 workflow.
---

# Work

Use this skill when there is a plan path or a tightly scoped bare prompt ready for execution.

## Core rules

- Distinguish between a **plan path** input and a **bare prompt** input before doing work.
- Prefer deriving execution tasks from plan **implementation units**.
- Use **serial subagents** for tasks with dependencies.
- Use **`parallel_subagent`** for independent tasks that can run concurrently.
- Use **`session_checkpoint`** to track plan execution progress. On start, load the checkpoint and skip completed units. After each unit, save the checkpoint.
- On execution failure, use `session_checkpoint` `fail` to record the error, then `retry` to get a retry strategy. Follow the suggested strategy to recover.
- Use **`task_splitter`** to analyze implementation units for file-level dependencies before execution. Run independent units via `parallel_subagent` and dependent units serially.
- If inside a **worktree** (created via `07-worktree`), execute within it. Otherwise, consider recommending `07-worktree` for isolation.
- End by recommending `04-review`.

## Hard gates — TDD enforcement

Every execution step must follow **RED → GREEN → REFACTOR**:
- No production code before a verified failing test.
- No skipping RED or GREEN verification.
- No completion claim without command output evidence.
- Evidence before assertions — always.

**Blocking violations** — stop and ask if:
- code is written before the RED test
- a RED step fails for the wrong reason
- missing evidence that the test failed before implementation
- missing evidence that the test passed after implementation
- tests added only after code

## Workflow

1. Detect whether the input is a plan path or a bare prompt.
2. If it is a plan path, read the implementation units and execute from them.
3. If it is a bare prompt, do a small scope scan before deciding whether to proceed.
4. Use `session_checkpoint` to load progress and skip completed units.
5. Use `task_splitter` to identify parallel-safe vs dependent units.
6. Execute in inline mode, serial subagents, or parallel subagents depending on task dependencies.
7. For each unit, follow strict TDD:
   a. Run the RED test and confirm expected failure.
   b. Apply minimal implementation.
   c. Run the GREEN test and confirm pass.
   d. Refactor only while tests stay green.
   e. Run unit-level verification.
8. Record progress using `references/progress-update-format.md`.
9. After each unit, save `session_checkpoint`.
10. On failure, use `session_checkpoint` `fail` then `retry`.
11. Provide a **completion report** when done.
12. Hand off to `04-review` using `references/handoff.md`.

## Completion report

When all units are done, provide:

- **Completed units**: list of unit names
- **Files changed**: all files created or modified
- **Commands run**: all verification commands executed
- **Verification results**: pass/fail status for each
- **Follow-up work**: any remaining risks or open questions
