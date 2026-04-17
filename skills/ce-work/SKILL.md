---
name: ce-work
description: Execute plan-driven work in a controlled Phase 1 workflow.
---

# ce-work

Use this skill when there is a plan path or a tightly scoped bare prompt ready for execution.

## Core rules

- Distinguish between a **plan path** input and a **bare prompt** input before doing work.
- Prefer deriving execution tasks from plan **implementation units**.
- In Phase 1, execution may be **inline** or via **serial subagents** only.
- Keep verification explicit after each execution slice.
- End by recommending `ce-review`.

## Workflow

1. Detect whether the input is a plan path or a bare prompt.
2. If it is a plan path, read the implementation units and execute from them.
3. If it is a bare prompt, do a small scope scan before deciding whether to proceed.
4. Execute in inline mode or serial subagents only.
5. Record progress using `references/progress-update-format.md`.
6. Run verification after each meaningful task.
7. Hand off to `ce-review` using `references/handoff.md`.
