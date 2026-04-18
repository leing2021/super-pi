# Pi Compound Engineering

A Pi-native Compound Engineering package for iterative development workflows.

**94 tests passing · 9 skills · 12 tools · CI/CD automated publishing**

[中文文档](README.md)

## Install

```bash
pi install npm:pi-compound-engineering
```

---

## Quick Start

After installation, tell Pi what you want to build, then keep saying "continue" to walk through the full workflow.

### Scenario A: Start a new feature from scratch

```
You: I want to add user authentication to the project

→ /skill:ce-brainstorm
→ Multi-round dialog to clarify requirements (OAuth2? JWT? MFA?)
→ Generates docs/brainstorms/2026-04-18-auth-requirements.md
→ Recommends next step: ce-plan

You: continue

→ /skill:ce-plan
→ Reads requirements artifact
→ task_splitter analyzes dependencies, splits into implementation units
→ Generates docs/plans/2026-04-18-auth-plan.md
→ Recommends next step: ce-work

You: continue

→ /skill:ce-work
→ session_checkpoint loads checkpoint (empty on first run)
→ task_splitter identifies which units can run in parallel
→ parallel_subagent executes independent tasks concurrently
→ session_checkpoint records each completed unit
→ Recommends next step: ce-review

You: continue

→ /skill:ce-review
→ review_router recommends reviewer personas (security, performance...)
→ Structured findings (autofixable issues are automatically fixed)
→ Recommends next step: ce-compound

You: continue

→ /skill:ce-compound
→ pattern_extractor identifies reusable patterns from artifacts
→ Writes docs/solutions/auth/oauth2-solution.md
```

### Scenario B: Check project status anytime

```
You: /skill:ce-status

→ Scans docs/brainstorms/, docs/plans/, docs/solutions/
→ Queries session_history for recent execution records
→ Shows current progress + recommends next step
```

### Scenario C: Don't know what to do next

```
You: /skill:ce-next

→ workflow_state scans artifacts
→ session_history queries history
→ Recommends the single best next skill + reason
```

### Scenario D: Requirements changed, update the plan

```
You: Requirements changed, need to add SSO support

→ /skill:ce-plan
→ plan_diff compare detects added/removed/modified units
→ plan_diff patch applies incremental changes
→ No need to rewrite the entire plan
```

### Scenario E: Resume after interruption

```
You: /skill:ce-work docs/plans/auth-plan.md

→ session_checkpoint.load finds completed units
→ Automatically skips completed parts, resumes from checkpoint
```

### Scenario F: Isolated development

```
You: /skill:ce-worktree

→ worktree_manager creates git worktree isolation
→ Execute ce-work within the worktree
→ Merge back to main branch when done
```

### Scenario G: Recover from execution failure

```
You: /skill:ce-work docs/plans/auth-plan.md

→ session_checkpoint.fail records failure context
→ session_checkpoint.retry returns recovery strategy
  - timeout → retry-with-longer-timeout
  - permission → check-permissions-then-retry
  - TypeError/SyntaxError → fix-code-then-retry
  - file-not-found → verify-files-then-retry
→ Follow strategy to fix and continue execution
```

---

## Skills (9)

| Skill | Command | Description | Associated Tools |
|-------|---------|-------------|-----------------|
| `ce-help` | `/skill:ce-help` | Usage guide | — |
| `ce-status` | `/skill:ce-status` | Check project status | `workflow_state`, `session_history` |
| `ce-next` | `/skill:ce-next` | Recommend next step | `workflow_state`, `session_history` |
| `ce-brainstorm` | `/skill:ce-brainstorm` | Multi-round requirements discovery | `brainstorm_dialog` |
| `ce-plan` | `/skill:ce-plan` | Create/update implementation plans | `plan_diff` |
| `ce-work` | `/skill:ce-work` | Execute plans (parallel + checkpoint + recovery) | `session_checkpoint`, `task_splitter`, `parallel_subagent` |
| `ce-review` | `/skill:ce-review` | Structured code review | `review_router` |
| `ce-compound` | `/skill:ce-compound` | Knowledge compounding | `pattern_extractor` |
| `ce-worktree` | `/skill:ce-worktree` | Worktree isolated development | `worktree_manager` |

---

## Tools (12)

| Tool | Description |
|------|-------------|
| `artifact_helper` | Artifact path resolution + directory creation |
| `ask_user_question` | Structured user questions (free input / fixed options) |
| `subagent` | Serial subagent chain |
| `parallel_subagent` | Parallel subagent execution (`Promise.allSettled`) |
| `workflow_state` | Workflow artifact state scanning |
| `worktree_manager` | Git worktree lifecycle (create/detect/merge/cleanup) |
| `review_router` | Diff analysis + reviewer persona routing (base + conditional) |
| `session_checkpoint` | Plan execution checkpoint + error recovery (save/load/fail/retry) |
| `task_splitter` | File-level dependency analysis + parallel grouping (union-find) |
| `brainstorm_dialog` | Multi-round brainstorm dialog management (start/refine/summarize) |
| `plan_diff` | Plan incremental comparison + patching (compare/patch) |
| `session_history` | Cross-session execution history (record/query/latest) |
| `pattern_extractor` | Artifact pattern extraction + categorization (extract/categorize) |

---

## Generated File Structure

After usage, the following files are generated in your project:

```
your-project/
├── docs/
│   ├── brainstorms/                        # Generated by ce-brainstorm
│   │   └── 2026-04-18-auth-requirements.md
│   ├── plans/                              # Generated by ce-plan
│   │   └── 2026-04-18-auth-plan.md
│   └── solutions/                          # Generated by ce-compound
│       └── auth/
│           └── oauth2-solution.md
└── .context/
    └── compound-engineering/
        ├── checkpoints/                    # Generated by session_checkpoint
        │   └── docs-plans-auth-plan.json
        ├── dialogs/                        # Generated by brainstorm_dialog
        │   └── docs-brainstorms-auth.json
        └── history/                        # Generated by session_history
            └── 1745000000-ce-brainstorm.json
```

---

## Core Workflow

```
ce-brainstorm → ce-plan → ce-work → ce-review → ce-compound
      ↑              ↑         ↑          ↑           ↑
 brainstorm_dialog  plan_diff  task_splitter  review_router  pattern_extractor
                              parallel_subagent
                              session_checkpoint (save/fail/retry)
                              session_history
```

`ce-help`, `ce-status`, `ce-next`, `ce-worktree` can be used at any stage.

---

## Best Practices

| Tip | Description |
|-----|-------------|
| **Always start with ce-brainstorm** | Even if requirements seem clear, it's worth a quick pass |
| **Use ce-status to check progress** | Not sure where you are? Use ce-status |
| **Use ce-next for direction** | Don't know the next step? Use ce-next |
| **Commit artifacts to git** | Both `docs/` and `.context/` should be committed |
| **Use ce-worktree for big features** | Isolated development without affecting main branch |
| **Don't panic on interruption** | Next ce-work will auto-resume from checkpoint |
| **Use retry after failure** | session_checkpoint recommends recovery strategy based on error type |

---

## Changelog

### 0.13.0

- Merged Superpowers skills精华 into CE
- `ce-brainstorm`: design checklist, stop conditions, user approval gate
- `ce-plan`: strict TDD gates (RED→GREEN→REFACTOR), TDD violation rejection
- `ce-work`: TDD execution discipline, structured completion report
- `ce-review`: review discipline (technical evaluation), YAGNI check
- 94 tests passing

### 0.12.0

- Extended `session_checkpoint` with `fail` and `retry` operations for error recovery
- `fail` records error context (failed unit, error message) on a checkpoint
- `retry` returns a retry strategy based on error type (timeout, permission, syntax, file-not-found)
- Updated `ce-work` with error recovery workflow
- 94 tests passing

### 0.11.0

- Added `pattern_extractor` tool: extract recurring patterns from artifacts and categorize them
- Updated `ce-compound` to use `pattern_extractor` for smarter solution generation
- 92 tests passing

### 0.10.0

- Added `session_history` tool: record, query, and list CE skill execution history
- Updated `ce-status` and `ce-next` to leverage session history
- 87 tests passing

### 0.9.0

- Added `plan_diff` tool: compare and patch plan units for incremental plan updates
- Updated `ce-plan` with incremental update workflow
- 83 tests passing

### 0.8.0

- Added `brainstorm_dialog` tool: manage multi-round brainstorm conversations
- Updated `ce-brainstorm` with iterative refinement workflow
- 79 tests passing

### 0.7.0

- Added `task_splitter` tool: file-based dependency analysis with union-find
- Updated `ce-work` to use `task_splitter` for parallel vs serial execution
- 74 tests passing

### 0.6.0

- Added `session_checkpoint` tool: resume-from-checkpoint behavior
- Updated `ce-work` for automatic resume on interrupted execution
- 68 tests passing

### 0.5.0

- Added `parallel_subagent` tool: concurrent task execution
- Updated `ce-work` to recommend parallel execution for independent units
- 63 tests passing

### 0.4.0

- Added `review_router` tool: diff-based reviewer routing
- Updated `ce-review` with autofix loop guidance
- 59 tests passing

### 0.3.0

- Added `worktree_manager` tool and `ce-worktree` skill
- 53 tests passing

### 0.2.0

- Added `workflow_state` tool and `ce-next` skill
- 46 tests passing

### 0.1.0–0.1.2

- Initial release: 7 skills, 3 tools, CI/CD
- 32–41 tests passing

---

## Repository

- **GitHub**: https://github.com/leing2021/pi-compound-engineering
- **npm**: https://www.npmjs.com/package/pi-compound-engineering

## Development

```bash
bun test
npm publish --dry-run
```

## CI/CD

- **Test**: runs `bun test` on every push/PR to main
- **Publish**: runs `bun test` + `npm publish` on version tags (`v*`)

### Release process

1. Bump version in `package.json`
2. Update README Changelog
3. `git commit -m "chore: bump to x.y.z"`
4. `git tag vx.y.z`
5. `git push origin main --tags`

### Required secrets

Set `NPM_TOKEN` in GitHub → Settings → Secrets → Actions.
