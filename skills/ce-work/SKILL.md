---
name: ce-work
description: Execute plan-driven work in a controlled Phase 1 workflow.
---

# ce-work

Use this skill when there is a plan path or a tightly scoped bare prompt ready for execution.

## Core rules

- Distinguish between a **plan path** input and a **bare prompt** input before doing work.
- Prefer deriving execution tasks from plan **implementation units**.
- Use **serial subagents** for tasks with dependencies.
- Use **`parallel_subagent`** for independent tasks that can run concurrently.
- Use **`session_checkpoint`** to track plan execution progress. On start, load the checkpoint and skip completed units. After each unit, save the checkpoint.
- Keep verification explicit after each execution slice.
- If inside a **worktree** (created via `ce-worktree`), execute within it. Otherwise, consider recommending `ce-worktree` for isolation.
- End by recommending `ce-review`.

## Workflow

1. Detect whether the input is a plan path or a bare prompt.
2. If it is a plan path, read the implementation units and execute from them.
3. If it is a bare prompt, do a small scope scan before deciding whether to proceed.
4. Execute in inline mode, serial subagents, or parallel subagents depending on task dependencies.
5. Use `parallel_subagent` when implementation units have no dependencies on each other.
5. Record progress using `references/progress-update-format.md`.
6. Run verification after each meaningful task.
7. Hand off to `ce-review` using `references/handoff.md`.
