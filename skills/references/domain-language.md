# Domain Language — CONTEXT.md + ADR consumption contract

A shared vocabulary layer that runs beneath every skill. Two artifacts hold it: `CONTEXT.md` (the glossary) and `docs/adr/` (architectural decisions). This file defines what they are and how every skill consumes them.

## CONTEXT.md — the glossary

A project-level glossary of domain terms. Lives at the repo root. Persists domain language across sessions so every skill speaks the project's vocabulary, not generic substitutes.

### What it is

- **Pure glossary** — definitions of domain terms only. One definition per term, 1–2 sentences.
- **No implementation details** — not a spec, not a scratchpad, not a repository for decisions. Define what a term *is*, not what it *does*.
- **Canonical term + _Avoid_ list** — pick one name, list aliases to discourage.

### When to create

Create `CONTEXT.md` when the user uses project-specific terms that have ambiguous or overloaded meanings, and no glossary exists yet. Skip for trivial features with no domain jargon.

### Single vs multiple contexts

- **Single context (default)** — one `CONTEXT.md` at repo root. Fits almost every repo.
- **Multiple contexts (monorepo)** — a root `CONTEXT-MAP.md` points to per-context `CONTEXT.md` files (e.g. `src/ordering/CONTEXT.md`, `src/billing/CONTEXT.md`). Use only when the repo has genuinely separated domains.

### Format

See `skills/01-brainstorm/references/context-glossary.md` for the creation template.

## ADR — architectural decision records

Records of decisions that are hard to reverse. Live at `docs/adr/` (or per-context `docs/adr/` in a multi-context repo). Numbered: `0001-slug.md`.

### When to create an ADR

Only when **all three** are true:

1. **Hard to reverse** — the cost of changing the decision later is meaningful.
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **Real trade-off** — there were genuine alternatives and you picked one for specific reasons.

If any is missing, skip the ADR. Most decisions don't qualify.

## Consumption rules (every skill)

1. **Before broad project reads**, check if `CONTEXT.md` exists at the repo root (or the relevant context in a multi-context repo). If it exists, read it first so you use the project's vocabulary.
2. **Respect ADRs** — before proposing a design that touches an area with existing ADRs, read them. Don't re-litigate a settled decision unless the friction is real enough to warrant reopening.
3. **Update inline** — when a term is resolved during a session, update `CONTEXT.md` right there. Don't batch.
4. **Flag conflicts** — if the user uses a term that conflicts with the glossary, surface it: "Your CONTEXT.md defines 'cancellation' as X, but you seem to mean Y — which is it?"
5. **Challenge fuzzy language** — if the user uses an overloaded term, propose a precise canonical term.

## Where this is used

- **01-brainstorm** — creates/updates `CONTEXT.md` as domain terms emerge.
- **02-plan** — reads `CONTEXT.md` for vocabulary; offers ADRs when a decision meets the three-condition threshold.
- **03-work** — reads `CONTEXT.md` so test names and interface vocabulary match; respects ADRs in the area being touched.
- **04-review** — checks whether the diff uses consistent domain vocabulary; flags ADR conflicts.
