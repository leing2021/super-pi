# Skill Design — writing-great-skills methodology

This project's skills follow a vocabulary-first methodology. The core principle: a skill exists to wrangle determinism out of a stochastic system — the agent should take the same **process** every run, not produce the same **output**.

## Root virtue: Predictability

Every design decision below serves predictability. Cost, maintainability, and token efficiency are symptoms of it, not rivals. When evaluating any skill decision, ask: does this make the agent's process more or less predictable?

## Core levers

- **Need Test** — before adding any instruction: "What would the agent get wrong without this?" If nothing, don't add it.
- **Leading Word** — anchor repeated behavior with a pretrained token, not restated prose. Recruits priors the model already holds. This project's leading words: `tight loop`, `tracer bullet`, `hard gate`, `stop-the-line`, `fog of war`.
- **Information Hierarchy** — steps (ordered actions) > in-skill reference > external reference (`references/`). Push detail down to keep SKILL.md legible; inline what every branch needs.
- **Completion Criterion** — every step ends on a checkable + exhaustive condition. "Every modified model accounted for", not "produce a change list".
- **Failure Mode annotation** — every rule carries "what goes wrong if skipped" so the agent doesn't underestimate it.

## Five failure modes to hunt

| Mode | Symptom | Cure |
|---|---|---|
| **Premature Completion** | Agent rushes to "done" before the step is genuinely finished | Sharpen the completion criterion (cheap, local); only if irreducibly fuzzy, hide later steps by splitting |
| **Duplication** | Same meaning in more than one place → drift | Single source of truth; reference by path |
| **Sediment** | Stale layers accumulate because adding feels safe | Run Need Test on every line periodically; delete what fails |
| **Sprawl** | Skill simply too long, even if every line is live | Push reference behind pointers; split by branch |
| **No-op** | Instruction the model already obeys by default | Delete it; or upgrade a weak leading word to a stronger one |

A sixth lever: **Negation**. Steering by prohibition ("don't do X") drags the forbidden behavior into context and makes it *more* available. Prompt the positive target behavior instead; keep a prohibition only as a hard guardrail paired with a positive alternative.

## This repo's conventions

- `SKILL.md` under 100 lines; split into `references/` otherwise.
- `references/` is plural; no `REFERENCE-` prefix; lowercase-hyphen filenames.
- `name` frontmatter must match parent directory.
- Description must say "Use when [specific triggers]" — pushy, not passive.
- Annotate each instruction with its Failure mode.

For live examples of these levers in action, read any Phase 1 skill in this repo (`skills/01-brainstorm` through `skills/07-worktree`) — each demonstrates leading words, information hierarchy, and completion criteria.
