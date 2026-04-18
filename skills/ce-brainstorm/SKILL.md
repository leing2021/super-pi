---
name: ce-brainstorm
description: Brainstorm feature requirements and produce a durable requirements artifact.
---

# ce-brainstorm

Use this skill when the request is ambiguous and needs requirements discovery before planning.

## Core rules

- Use **`brainstorm_dialog`** to manage multi-round conversations.
- Start with `start` operation: present initial analysis and open questions.
- Use `refine` operation: incorporate user responses and produce refined analysis with new questions.
- Repeat refine rounds until all open questions are resolved.
- End with `summarize` operation: finalize into a requirements-ready artifact.
- Ask **one question at a time** within each round.
- Compare **2-3 approaches** when multiple directions are plausible.
- Keep the artifact focused on **what** should be built, not implementation details by default.
- Write the result to `docs/brainstorms/` as a durable requirements document.
- End by recommending `ce-plan` when the requirements are ready.

## Workflow

1. Scan the repository for nearby context.
2. Use `brainstorm_dialog` `start` to begin multi-round refinement.
3. Present initial analysis and open questions to the user.
4. Use `brainstorm_dialog` `refine` to incorporate user responses and refine analysis.
5. Repeat step 4 until all questions are resolved.
6. Use `brainstorm_dialog` `summarize` to finalize the conversation.
7. Capture the agreed direction in a requirements artifact under `docs/brainstorms/`.
8. Hand off to `ce-plan` using `references/handoff.md`.

## Artifact contract

Use `references/requirements-template.md` to structure the requirements document. Keep implementation details out unless the brainstorm is specifically about architecture or technical direction.
