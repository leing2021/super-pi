# Context Glossary

An optional project vocabulary file that persists domain terms across sessions.

## When to create

Create `CONTEXT.md` at repo root **only when** the brainstorm reveals 3+ domain-specific terms
that have ambiguous or overloaded meanings. Skip for trivial features.

## Format

```md
# {Project Name}

## Language

**Term**: One-sentence definition.
_Avoid_: aliases to discourage

**Term2**: One-sentence definition.
_Avoid_: aliases to discourage

## Relationships

- **Term** contains many **Term2**

## Example

> Dev: "The materialization cascade is failing."
> Domain expert: "You mean when a lesson gets a filesystem path?"
> Dev: "Yes — 'materialization cascade' is our term for that flow."
```

## Rules

- One definition per term, 1-2 sentences max. Define what it IS, not what it does.
- Pick one canonical term, list alternatives as _Avoid_.
- Only project-specific concepts — general programming terms don't belong.
- Flag ambiguities explicitly.
- No implementation details. This is a glossary, not a spec.

## Multiple bounded contexts

If the project has clearly separated domains (e.g. ordering vs billing), create a
`CONTEXT-MAP.md` at root that lists each context and its `CONTEXT.md` location.
Most projects need only a single root `CONTEXT.md`.
