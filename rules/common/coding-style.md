# Coding Style

## Immutability (CRITICAL)

ALWAYS create new objects, NEVER mutate existing ones:

```
// Pseudocode
WRONG:  modify(original, field, value) → changes original in-place
CORRECT: update(original, field, value) → returns new copy with change
```

Rationale: Immutable data prevents hidden side effects, makes debugging easier, and enables safe concurrency.

## Core Principles

### KISS (Keep It Simple)

- Prefer the simplest solution that actually works
- Avoid premature optimization
- Optimize for clarity over cleverness

### DRY (Don't Repeat Yourself)

- Extract repeated logic into shared functions or utilities
- Avoid copy-paste implementation drift
- Introduce abstractions when repetition is real, not speculative

### YAGNI (You Aren't Gonna Need It)

- Do not build features or abstractions before they are needed
- Avoid speculative generality
- Start simple, then refactor when the pressure is real

### The Ladder

Before writing code, stop at the **first rung that holds**:

1. Does this need to exist at all? → No: skip it, say so in one line (YAGNI)
2. Already in this codebase? → Reuse it. Search before writing; re-implementing what exists a few files over is the most common slop
3. stdlib does it? → Use it
4. Platform-native feature covers it? → Use it (native input over a picker lib, CSS over JS, DB constraint over app code)
5. Already-installed dependency solves it? → Use it. Never add a new one for what a few lines can do
6. Can it be one line? → One line
7. Only then: the minimum code that works

Meta-rules:
- The ladder runs **after** understanding the problem, not instead of it. Lazy about writing, never about reading — trace every file the change touches first.
- Bug fix = **root cause**, not symptom. The root-cause fix is usually the smaller diff: one guard in the shared function beats a guard in every caller.

Never simplify away: trust-boundary validation, error handling that prevents data loss, security, accessibility, anything explicitly requested.

### Debt marker

When deliberately cutting a corner with a known ceiling (global lock, O(n²) scan, naive heuristic), mark it:

```
// debt: global lock, upgrade when per-account throughput matters
```

Name the ceiling and the trigger. A `debt:` marker with no upgrade condition is rot risk, not minimalism. Audit with `rg 'debt:'`.

## File Organization

MANY SMALL FILES > FEW LARGE FILES:
- High cohesion, low coupling
- 200-400 lines typical, 800 max
- Extract utilities from large modules
- Organize by feature/domain, not by type

## Error Handling

ALWAYS handle errors comprehensively:
- Handle errors explicitly at every level
- Provide user-friendly error messages in UI-facing code
- Log detailed error context on the server side
- Never silently swallow errors

## Input Validation

ALWAYS validate at system boundaries:
- Validate all user input before processing
- Use schema-based validation where available
- Fail fast with clear error messages
- Never trust external data (API responses, user input, file content)

## Naming Conventions

- Variables and functions: `camelCase` with descriptive names
- Booleans: prefer `is`, `has`, `should`, or `can` prefixes
- Interfaces, types, and components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Custom hooks: `camelCase` with a `use` prefix

## Code Smells to Avoid

### Deep Nesting

Prefer early returns over nested conditionals once the logic starts stacking.

### Magic Numbers

Use named constants for meaningful thresholds, delays, and limits.

### Long Functions

Split large functions into focused pieces with clear responsibilities.

## Code Quality Checklist

Before marking work complete:
- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No hardcoded values (use constants or config)
- [ ] No mutation (immutable patterns used)
