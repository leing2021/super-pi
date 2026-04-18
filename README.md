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
- `ce-next` — get a recommendation for the next workflow step
- `ce-worktree` — create and manage git worktrees for isolated feature development
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

## Changelog

### 0.4.0

- Added `review_router` extension tool: analyzes diff metadata (file types, change size, paths) and recommends reviewer personas
- Updated `ce-review` skill to use `review_router` for automatic reviewer routing
- Added autofix loop guidance: autofixable findings are automatically applied and re-reviewed (max 3 iterations)
- Updated `findings-schema.md` with autofix tracking fields
- Updated `reviewer-selection.md` with richer persona definitions and `review_router` integration
- Updated `handoff.md` with autofix loop support
- 59 tests passing

### 0.3.0

- Added `worktree_manager` extension tool: git worktree lifecycle (create, detect, merge, cleanup) with dependency injection
- Added `ce-worktree` skill: standalone worktree management using `worktree_manager`
- Updated `ce-work` to detect and recommend worktree isolation
- 53 tests passing

### 0.2.0

- Added `workflow_state` extension tool: scans artifact directories and returns structured workflow state
- Added `ce-next` skill: uses `workflow_state` to recommend the single best next skill
- Updated `ce-status` to reference `workflow_state` tool
- 46 tests passing

### 0.1.2

- Added GitHub Actions CI/CD: `test.yml` (push/PR to main) and `publish.yml` (tag-triggered npm publish)
- Fixed npm publish authentication: added `setup-node` with `registry-url` and `permissions: contents: read`
- Added workflow tests to package-structure test suite
- Added CI/CD documentation and release process to README
- First full CE demo: `brainstorm → plan → work → review → compound` producing real artifacts
- 41 tests passing

### 0.1.1

- Added `references/` directories to `ce-help` and `ce-status` for structural consistency
- Fixed `artifact_helper` run-type `ensureDir` to create the parent directory, not the run path itself
- Cleaned up `index.ts` exports to only expose public API functions
- Added `bun.lock` to version control
- Strengthened test suite: subagent edge cases, run-type ensureDir, explicit exports check

### 0.1.0

- Initial release
- Phase 1 skills: `ce-brainstorm`, `ce-plan`, `ce-work`, `ce-review`, `ce-compound`, `ce-help`, `ce-status`
- `ce-core` extension with `artifact_helper`, `ask_user_question`, and `subagent` tools
- Repo-local artifact conventions
- 32 tests passing

## Repository

- GitHub: `https://github.com/leing2021/pi-compound-engineering`
- npm: `https://www.npmjs.com/package/pi-compound-engineering`

## Development

```bash
bun test
npm publish --dry-run
```

## CI/CD

### Test workflow

`test.yml` runs `bun test` on every push and pull request to `main`.

### Publish workflow

`publish.yml` runs `bun test` then `npm publish` when a version tag (`v*`) is pushed.

### Release process

1. Bump version in `package.json`
2. Update `README.md` Changelog
3. Commit: `git commit -m "chore: bump to x.y.z"`
4. Tag: `git tag vx.y.z`
5. Push: `git push origin main --tags`
6. GitHub Actions runs tests and publishes to npm

### Required secrets

Set `NPM_TOKEN` in GitHub repo settings → Secrets → Actions.
