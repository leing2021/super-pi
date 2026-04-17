# Pi Compound Engineering

A Pi-native Compound Engineering package for iterative development workflows in Pi.

## Install

### Local development install

```bash
pi install /absolute/path/to/pi-compound-engineering
```

### Project-local install

```bash
pi install /absolute/path/to/pi-compound-engineering -l
```

### Published install

```bash
pi install npm:pi-compound-engineering
```

## Phase 1 commands

- `ce-help` — explain which workflow step to use
- `ce-status` — inspect repo-local workflow state
- `ce-brainstorm` — create requirements artifacts in `docs/brainstorms/`
- `ce-plan` — create implementation plans in `docs/plans/`
- `ce-work` — execute plan-driven work in Phase 1 mode
- `ce-review` — review changes with structured findings
- `ce-compound` — capture reusable learnings in `docs/solutions/`

## Package shape

- `skills/` — workflow semantics
- `extensions/ce-core/` — runtime tools for artifact handling, questions, and subagents

## Artifact conventions

This package uses repo-local workflow artifacts:

- `docs/brainstorms/`
- `docs/plans/`
- `docs/solutions/`
- `.context/compound-engineering/`

## Phase 1 scope

Phase 1 intentionally ships a basic but working CE loop:

- explicit skill entry points
- repo-local artifacts as durable state
- basic `ce-work` and `ce-review`
- `ce-core` runtime tools for artifact handling, structured questions, and serial subagents

It does not yet include richer review autofix flows, worktree orchestration, session-history integrations, or `ce-next` style navigation.

## Development

```bash
bun test
```
