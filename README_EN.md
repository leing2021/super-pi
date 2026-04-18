# Super Pi

A Pi-native iterative development workflow package, integrating the best ideas from four outstanding open-source projects.

[中文文档](README.md)

## Install

```bash
pi install npm:@leing2021/super-pi
```

---

## Quick Start

After installation, tell Pi what you want to build, then keep saying "continue" to walk through the full workflow.

### Scenario A: Starting a new idea

```
You: I want to build a tool that helps indie devs find users

→ /skill:01-brainstorm
→ AI asks your goal → you pick "Building a startup"
→ Enters Startup Diagnostic mode
→ YC-style forcing questions one at a time: demand evidence? current alternatives? narrowest wedge?
→ Challenges premises, generates 2-3 approaches
→ Generates docs/brainstorms/2026-04-18-find-users-requirements.md
→ Recommends next step: 02-plan

You: continue

→ /skill:02-plan
→ Reads requirements artifact
→ Generates docs/plans/2026-04-18-find-users-plan.md
→ Asks if you want CEO Review → you pick "CEO Review"
→ Challenges plan premises, dream-state mapping, forces alternatives, temporal interrogation
→ Recommends next step: 03-work

You: continue

→ /skill:03-work
→ Parallel execution, checkpoint resume
→ Recommends next step: 04-review

You: continue

→ /skill:04-review
→ Structured code review + autofix
→ Asks if you want browser QA → you pick "Browser QA"
→ Opens your app with agent-browser, tests page by page
→ Fixes bugs found, screenshots as evidence
→ Recommends next step: 05-compound

You: continue

→ /skill:05-compound
→ Extracts reusable patterns
→ Writes to docs/solutions/ for lasting knowledge
```

### Scenario B: Side Project / Hackathon

```
You: I want to make a fun music visualization side project

→ /skill:01-brainstorm
→ AI asks your goal → you pick "Side project / hackathon"
→ Enters Builder Mode
→ Asks: what's the coolest version? fastest path to something you can show?
→ No business validation, focused on building the coolest thing
→ If conversation shifts to revenue → auto-upgrades to Startup Diagnostic
```

### Scenario C: Adding a feature to an existing project

```
You: I want to add user authentication to the project

→ /skill:01-brainstorm
→ AI asks your goal → you pick "Adding a feature"
→ Enters CE Brainstorm (classic requirements discovery)
→ Multi-round dialog to clarify requirements (OAuth2? JWT? MFA?)
→ Generates docs/brainstorms/2026-04-18-auth-requirements.md
→ Recommends next step: 02-plan
```

### Scenario D: Check project status anytime

```
You: /skill:08-status

→ Scans docs/brainstorms/, docs/plans/, docs/solutions/
→ Queries session_history for recent execution records
→ Shows current progress + recommends next step
```

### Scenario E: Requirements changed, update the plan

```
You: Requirements changed, need to add SSO support

→ /skill:02-plan
→ plan_diff compare detects added/removed/modified units
→ plan_diff patch applies incremental changes
→ No need to rewrite the entire plan
```

### Scenario F: Resume after interruption

```
You: /skill:03-work docs/plans/auth-plan.md

→ session_checkpoint.load finds completed units
→ Automatically skips completed parts, resumes from checkpoint
```

### Scenario G: Isolated development

```
You: /skill:07-worktree

→ worktree_manager creates git worktree isolation
→ Execute 03-work within the worktree
→ Merge back to main branch when done
```

---

## Skills (9)

| Skill | Command | Description | Associated Tools |
|-------|---------|-------------|-----------------|
| `01-brainstorm` | `/skill:01-brainstorm` | Requirements discovery, three modes: CE / Startup Diagnostic / Builder | `brainstorm_dialog` |
| `02-plan` | `/skill:02-plan` | Create/update plans, optional CEO Review | `plan_diff` |
| `03-work` | `/skill:03-work` | Execute plans (parallel + checkpoint + recovery) | `session_checkpoint`, `task_splitter`, `parallel_subagent` |
| `04-review` | `/skill:04-review` | Code review + optional browser QA | `review_router` |
| `05-compound` | `/skill:05-compound` | Knowledge compounding | `pattern_extractor` |
| `06-next` | `/skill:06-next` | Recommend next step | `workflow_state`, `session_history` |
| `07-worktree` | `/skill:07-worktree` | Worktree isolated development | `worktree_manager` |
| `08-status` | `/skill:08-status` | Check project status | `workflow_state`, `session_history` |
| `09-help` | `/skill:09-help` | Usage guide | — |

---

## Tools (13)

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

## Core Workflow

```
01-brainstorm → 02-plan → 03-work → 04-review → 05-compound
   Three modes      CEO Review    Parallel      Browser QA     Knowledge
   (CE/Startup/     (optional)    Checkpoint    (optional)    compounding
    Builder)                       Resume
```

`06-next`, `07-worktree`, `08-status`, `09-help` can be used at any stage.

---

## Generated File Structure

```
your-project/
├── docs/
│   ├── brainstorms/                        # Generated by 01-brainstorm
│   │   └── 2026-04-18-auth-requirements.md
│   ├── plans/                              # Generated by 02-plan
│   │   └── 2026-04-18-auth-plan.md
│   └── solutions/                          # Generated by 05-compound
│       └── auth/
│           └── oauth2-solution.md
└── .context/
    └── compound-engineering/
        ├── checkpoints/                    # Generated by session_checkpoint
        │   └── docs-plans-auth-plan.json
        ├── dialogs/                        # Generated by brainstorm_dialog
        │   └── docs-brainstorms-auth.json
        └── history/                        # Generated by session_history
            └── 1745000000-01-brainstorm.json
```

---

## Best Practices

| Tip | Description |
|-----|-------------|
| **Start with 01-brainstorm** | New ideas → Startup/Builder Mode, features → CE Mode |
| **Use 08-status to check progress** | Not sure where you are? Use 08-status |
| **Use 06-next for direction** | Don't know the next step? Use 06-next |
| **Commit artifacts to git** | Both `docs/` and `.context/` should be committed |
| **Use 07-worktree for big features** | Isolated development without affecting main branch |
| **Don't panic on interruption** | Next 03-work will auto-resume from checkpoint |
| **Use CEO Review to stress-test plans** | After planning, pick CEO Review to challenge premises and find blind spots |
| **Use Browser QA for acceptance** | After code review, pick Browser QA for real-app testing |

---

## Acknowledgments & Sources

Super Pi integrates ideas and practices from four outstanding open-source projects. This is not a fork — it's a Pi-native reimplementation of their core insights.

### [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) — Every Inc.

> "Each unit of engineering work should make subsequent units easier — not harder."

The foundational workflow of Super Pi comes directly from Compound Engineering's core philosophy: the **brainstorm → plan → work → review → compound** cycle. The "80% planning and review, 20% execution" philosophy is the backbone of the entire package.

**What we adopted:**
- Five-step workflow architecture (brainstorm → plan → work → review → compound)
- Knowledge compounding: every engineering cycle produces a reusable solution artifact
- Artifact-driven state management (tracking progress through persistent docs under `docs/`)
- Structured review methodology (reviewer persona routing, findings schema)

### [Superpowers](https://github.com/obra/superpowers) — Jesse Vincent

> "A complete software development methodology for your coding agents."

Superpowers' main contribution to Super Pi is **engineering discipline**: strict TDD gates, design checklists, and the anti-performative-agreement principle in reviews.

**What we adopted:**
- Strict TDD gates (RED → GREEN → REFACTOR) with violation rejection criteria
- Design checklist (what/why/boundaries/failure/verification)
- Review discipline: technical evaluation over performative agreement, YAGNI checks
- User approval gates: no advancing to the next step without explicit confirmation
- Subagent-driven development patterns

### [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) — Affaan Mustafa

> "The performance optimization system for AI agent harnesses. Not just configs — a complete system."

With 140K+ stars, ECC demonstrated best practices for AI agent toolchains. Super Pi adopted its systematic approach to token optimization, continuous learning, parallelization, and subagent orchestration.

**What we adopted:**
- Session history management and continuous learning mechanisms
- Parallel subagent orchestration patterns (`Promise.allSettled` style)
- Checkpoint-based resume and error recovery strategies
- Systematic tool design: each skill paired with a dedicated tool

### [gstack](https://github.com/garrytan/gstack) — Garry Tan / Y Combinator

> "One person's software factory. 23 specialist roles and 8 power tools."

gstack is Y Combinator CEO Garry Tan's personal AI toolchain, representing the "AI-native founder" way of working. Super Pi integrated the methodology from three core gstack modules in v1.2.0.

**What we adopted:**
- **office-hours → 01-brainstorm Startup Diagnostic**: YC-style six forcing questions (demand evidence, status quo alternatives, narrowest wedge), anti-sycophancy rules, per-question pushback patterns
- **plan-ceo-review → 02-plan CEO Review**: CEO cognitive frameworks (Bezos irreversible decisions, Munger inversion, Jobs subtraction), dream-state mapping, mandatory alternative generation, error maps and failure mode registries
- **qa → 04-review Browser QA**: Browser-driven QA testing workflow (using Pi-native `agent-browser` instead of gstack's `$B`), health scoring system, diff-aware test scoping, fix loops and regression test generation

**Design decisions:** gstack depends on its own infrastructure (`$B` browser binary, `gstack-*` scripts, `~/.gstack/` directory, telemetry). Super Pi replaces all of these with Pi-native tools — zero external infrastructure. All gstack capabilities are integrated as optional branch points within the existing flow; not selecting a new path = identical to the original behavior.

---

## Changelog

### 1.2.0

**Integrated three gstack modules**

- `01-brainstorm`: Added Startup Diagnostic mode (YC-style six forcing questions) and Builder Mode (design thinking for side projects)
- `02-plan`: Added CEO Review (premise challenge, dream-state mapping, mandatory alternatives) and Strict Review (error maps, failure modes, test diagrams)
- `04-review`: Added Browser QA mode (agent-browser-driven testing, health scoring, fix loops, regression test generation)
- `09-help`: Updated skill descriptions and workflow diagram
- Added 5 reference files: `startup-diagnostic.md`, `builder-mode.md`, `premise-challenge.md`, `ceo-review-mode.md`, `qa-test-mode.md`

### 1.0.0

🚀 **First stable release**

- 9 Skills, 12 Tools, 94 tests all passing
- Complete brainstorm → plan → work → review → compound workflow
- Merged Superpowers insights: strict TDD gates, design checklist, review discipline
- CI/CD auto-test + npm publish

### 0.13.0

- Merged Superpowers insights into CE skills
- `01-brainstorm`: design checklist, stop conditions, user approval gate
- `02-plan`: strict TDD gates (RED→GREEN→REFACTOR), TDD violation rejection
- `03-work`: TDD execution discipline, structured completion report
- `04-review`: review discipline (technical evaluation), YAGNI check

### 0.12.0

- Extended `session_checkpoint` with `fail` and `retry` operations

### 0.11.0

- Added `pattern_extractor` tool

### 0.10.0

- Added `session_history` tool

### 0.9.0

- Added `plan_diff` tool: incremental plan updates

### 0.8.0

- Added `brainstorm_dialog` tool

### 0.7.0

- Added `task_splitter` tool: union-find parallel grouping

### 0.6.0

- Added `session_checkpoint` tool: resume-from-checkpoint

### 0.5.0

- Added `parallel_subagent` tool

### 0.4.0

- Added `review_router` tool

### 0.3.0

- Added `worktree_manager` tool and `07-worktree` skill

### 0.2.0

- Added `workflow_state` tool and `06-next` skill

### 0.1.0–0.1.2

- Initial release: 7 skills, 3 tools, CI/CD

---

## Repository

- **GitHub**: https://github.com/leing2021/super-pi
- **npm**: https://www.npmjs.com/package/@leing2021/super-pi

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
