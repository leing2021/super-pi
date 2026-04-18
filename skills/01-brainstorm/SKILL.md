---
name: 01-brainstorm
description: "Brainstorm requirements with three modes: CE discovery, Startup Diagnostic, Builder Mode."
---

# Brainstorm

Use this skill when the request is ambiguous, needs requirements discovery before planning, or the user describes a new idea/product.

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
- End by recommending `02-plan` when the requirements are ready.
- **Do not proceed to planning without explicit user approval** of the design.

## Mode selection

After initial context gathering, determine which mode to use. Use `ask_user_question`:

> Before we dig in, what's your goal with this?
>
> - **Building a startup** (or thinking about it)
> - **Intrapreneurship** — internal project, need to ship fast
> - **Side project / hackathon / learning** — building for fun or exploration
> - **Adding a feature** — already have a project, need to design a change

**Mode mapping:**
- Startup, intrapreneurship → **Startup Diagnostic** (see `references/startup-diagnostic.md`)
- Side project, hackathon, learning → **Builder Mode** (see `references/builder-mode.md`)
- Adding a feature → **CE Brainstorm** (the existing requirements discovery flow below)

If the user's request already makes the mode obvious (e.g., "I have a startup idea"), skip the question and go directly to the matching mode.

## Startup Diagnostic mode

Read `references/startup-diagnostic.md` for the full YC-style forcing questions, pushback patterns, and anti-sycophancy rules.

Key differences from CE mode:
- **Operating principles:** Specificity is the only currency. Interest is not demand. The status quo is your real competitor. Narrow beats wide, early.
- **Ask the six forcing questions** one at a time, pushing until answers are specific and uncomfortable.
- **Smart routing:** Pre-product (Q1-Q3), Has users (Q2, Q4, Q5), Paying customers (Q4, Q5, Q6).
- **End with the assignment:** One concrete action the founder should take next.

After the diagnostic, run Premise Challenge (see `references/premise-challenge.md`), then proceed to Alternatives Generation and design checklist.

## Builder Mode

Read `references/builder-mode.md` for the full generative question set and response posture.

Key differences from CE mode:
- **Operating principles:** Delight is the currency. Ship something you can show. Solve your own problem. Explore before you optimize.
- **Ask generative questions** one at a time (coolest version, who would you show, fastest path, what's different, 10x version).
- **End with concrete build steps**, not business validation tasks.
- **Vibe shift detection:** If the user starts talking about customers/revenue, upgrade to Startup Diagnostic.

After the questions, run Premise Challenge (see `references/premise-challenge.md`), then proceed to Alternatives Generation and design checklist.

## CE Brainstorm mode (existing flow)

This is the original Compound Engineering brainstorm. Use when adding a feature to an existing project.

1. Scan the repository for nearby context.
2. Use `brainstorm_dialog` `start` to begin multi-round refinement.
3. Present initial analysis and open questions to the user.
4. Use `brainstorm_dialog` `refine` to incorporate user responses and refine analysis.
5. Repeat step 4 until all questions are resolved.

## Premise Challenge (all modes)

After the mode-specific questions are complete, run the Premise Challenge. See `references/premise-challenge.md`.

## Design checklist

Before summarizing, ensure the design answers:
- What are we building?
- Why does it exist?
- What files/modules are likely to change?
- What are the boundaries between responsibilities?
- What can fail, and how should failure be handled?
- How will we verify success?

## Stop conditions

Stop and ask the user instead of guessing when:
- requirements conflict
- success criteria are unclear
- the task spans multiple independent systems
- the user has not approved the design yet

## Approval gate

Before handing off to `02-plan`:
1. Present the final design to the user.
2. Ask for explicit approval.
3. Only proceed after the user confirms.

## Workflow

1. Scan the repository for nearby context.
2. Determine mode (Startup / Builder / CE) via the mode selection step.
3. Run mode-specific questions using the appropriate reference file.
4. Run Premise Challenge.
5. Generate 2-3 alternatives (at least one "minimal viable" and one "ideal architecture").
6. Validate against the design checklist.
7. Use `brainstorm_dialog` `summarize` to finalize the conversation.
8. Capture the agreed direction in a requirements artifact under `docs/brainstorms/`.
9. Get explicit user approval before handing off.
10. Hand off to `02-plan` using `references/handoff.md`.

## Artifact contract

Use `references/requirements-template.md` to structure the requirements document. Keep implementation details out unless the brainstorm is specifically about architecture or technical direction.
