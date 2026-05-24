# ADR Template

Lightweight Architecture Decision Records. Only create when ALL THREE are true:

1. **Hard to reverse** — changing your mind later costs meaningfully
2. **Surprising without context** — a future reader will wonder "why this way?"
3. **Real trade-off** — genuine alternatives existed and you picked one for a reason

If any is missing, skip the ADR.

## File location

`docs/adr/0001-slug.md`, sequential numbering. Create `docs/adr/` lazily.

## Template

```md
# {Short title}

{1-3 sentences: context, decision, and why.}
```

That's it. A single paragraph is fine. The value is recording THAT a decision was made and WHY.

## Optional sections

Only when they add genuine value:
- **Considered Options** — when rejected alternatives are worth remembering
- **Consequences** — when downstream effects are non-obvious

## What qualifies

- Architectural shape (monorepo, event-sourced, etc.)
- Technology choices with lock-in (database, message bus, auth provider)
- Boundary/scope decisions
- Deliberate deviations from the obvious path
- Constraints not visible in code (compliance, latency SLA)

## What doesn't qualify

- Easy-to-reverse decisions — just reverse them
- Obvious choices — nobody will wonder why
- No real alternative — nothing to record
