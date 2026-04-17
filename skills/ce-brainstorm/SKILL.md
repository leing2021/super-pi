---
name: ce-brainstorm
description: Brainstorm feature requirements and produce a durable requirements artifact.
---

# ce-brainstorm

Use this skill when the request is ambiguous and needs requirements discovery before planning.

## Core rules

- Ask **one question at a time**.
- Compare **2-3 approaches** when multiple directions are plausible.
- Keep the artifact focused on **what** should be built, not implementation details by default.
- Write the result to `docs/brainstorms/` as a durable requirements document.
- End by recommending `ce-plan` when the requirements are ready.

## Workflow

1. Scan the repository for nearby context.
2. Clarify the user goal one question at a time.
3. Summarize the problem and compare 2-3 approaches with tradeoffs.
4. Capture the agreed direction in a requirements artifact under `docs/brainstorms/`.
5. Hand off to `ce-plan` using `references/handoff.md`.

## Artifact contract

Use `references/requirements-template.md` to structure the requirements document. Keep implementation details out unless the brainstorm is specifically about architecture or technical direction.
