# Super Pi

**Turn your AI coding agent from "a tool that writes code" into "a reliable engineer."**

Install it, tell Pi what you want to build, then keep saying "continue" — it walks through the full loop: **think → plan → build → review → compound learnings.**

```bash
pi install npm:@leing2021/super-pi
```

---

## Why Super Pi

Using a bare AI agent to write code has three common failure modes:

1. **Builds before thinking** — you finish and realize it's not what you wanted
2. **Loses context on interruption** — close the terminal, lose the progress
3. **Repeats the same mistakes** — every session starts from zero

Super Pi's answers:

- **Forces clarity before action** — not a form to fill out, but an AI that interrogates you like a YC partner demanding specific evidence
- **Auto-resume from checkpoints** — restart after interruption, skip completed work, continue from where you left off
- **Auto-compounds experience** — every solved problem becomes a searchable knowledge card; next time, the agent finds and reuses it

---

## The Five-Step Loop

```
01-brainstorm → 02-plan → 03-work → 04-review → 05-compound
    think          plan      build      review      compound
```

Each step has a dedicated skill + tool pair. Not just prompts — structured toolchains.

---

## What Each Step Does

### 01-brainstorm: Think First

Not "describe your requirements." Three modes for three scenarios:

| Mode | For | What it does |
|------|-----|-------------|
| **Startup Diagnostic** | Startup ideas, new products | Six YC-style forcing questions, pushed until you produce specific evidence (not "people are interested" — "who would freak out if this disappeared tomorrow?") |
| **Builder Mode** | Side projects, hackathons | Only focused on building the coolest thing. If you accidentally mention revenue, it auto-upgrades to Startup Diagnostic |
| **CE Brainstorm** | Adding features to existing projects | Multi-round dialog to clarify scope boundaries, generates a structured requirements doc |

All three modes run a **premise challenge** (are your assumptions valid?) and **alternatives generation** (at least one minimal + one ideal approach) before you're allowed to move on.

### 02-plan: Plan Well

Breaks requirements into implementation units, each following strict **RED → GREEN → REFACTOR** (no production code without a failing test first).

**Incremental updates**: Requirements changed? `plan_diff` detects added/removed/modified units and patches the plan instead of rewriting it.

**CEO Review (optional)**: After planning, you can request a CEO Review. It challenges your plan using Bezos reversible-decision frameworks, Munger inversion, Jobs subtraction, forces alternative approaches, and draws error maps. Like having a demanding CTO review your proposal for free.

### 03-work: Build Right

**Parallel execution**: `task_splitter` uses a Union-Find algorithm to analyze file dependencies, feeds conflict-free units to `parallel_subagent` for concurrent execution.

**Checkpoint resume**: After each unit, a checkpoint is saved. Interrupted? Next startup auto-loads, skips completed work, continues from the breakpoint. Failed? `fail` records the error → `retry` suggests a recovery strategy (timeout? extend timeout. Permission issue? check permissions first. Code error? fix then retry).

**Strict TDD**: Run failing test → write minimal implementation → test passes → refactor. Every step requires command output as evidence. No skipping.

### 04-review: Review Thoroughly

**Structured code review**: `review_router` auto-assigns reviewer personas based on diff metadata (changed payment code? bring in the security reviewer). Review discipline is technical evaluation, not theater — every finding must cite specific code, YAGNI checks, no performative agreement.

**Browser QA (optional)**: Uses `agent-browser` to open your app, click through pages, screenshot bugs, fix by severity, up to 3 auto-fix iterations. Can auto-generate regression tests. Like having a QA engineer run acceptance tests.

### 05-compound: Compound Learnings

`pattern_extractor` scans existing artifacts, extracts and categorizes patterns. Turns "the pitfall we hit this time" into a YAML-tagged solution card in `docs/solutions/`.

Two-level storage: project-specific → inside the project; cross-project → `~/.pi/agent/docs/solutions/` globally searchable.

Next time `02-plan` or `04-review` runs, a grep-first search strategy automatically retrieves relevant past experience.

---

## Technical Architecture

### 9 Skills (workflow nodes)

| Skill | One-liner | Core Tool |
|-------|-----------|-----------|
| `01-brainstorm` | Deep requirements mining in three modes | `brainstorm_dialog` |
| `02-plan` | Break into units, TDD gates, incremental updates | `plan_diff` |
| `03-work` | Parallel execution, checkpoint resume, error recovery | `session_checkpoint`, `task_splitter`, `parallel_subagent` |
| `04-review` | Persona-routed review + live browser testing | `review_router` |
| `05-compound` | Pattern extraction → knowledge card compounding | `pattern_extractor` |
| `06-next` | Not sure what to do next? Ask this | `workflow_state`, `session_history` |
| `07-worktree` | Git worktree isolated development | `worktree_manager` |
| `08-status` | Scan artifacts, report progress | `workflow_state`, `session_history` |
| `09-help` | Usage guide | — |

### 13 Tools (underlying capabilities)

| Tool | What it does |
|------|-------------|
| `task_splitter` | Union-Find algorithm analyzes file dependencies, auto-groups parallel-safe units |
| `session_checkpoint` | JSON-persisted checkpoints with save/load/fail/retry operations |
| `plan_diff` | Incremental plans: compare detects diffs, patch applies changes |
| `parallel_subagent` | `Promise.allSettled`-style parallel subagent execution |
| `review_router` | Auto-assign reviewer personas from diff metadata |
| `pattern_extractor` | Extract and categorize patterns from artifacts |
| `brainstorm_dialog` | Multi-round dialog state machine (start → refine × N → summarize) |
| `session_history` | Cross-session execution history recording and querying |
| `workflow_state` | Scan docs/ and .context/ to summarize workflow state |
| `worktree_manager` | Full git worktree lifecycle management |
| `artifact_helper` | Artifact path resolution and directory creation |
| `ask_user_question` | Structured user prompts (choices / free input) |
| `subagent` | Serial subagent chain |

---

## Code Scale

~2000 lines of TypeScript implementing 13 tools, 22 Markdown reference files driving 9 skills' behavioral strategies, 95 tests covering all tool logic.

Not a heavy framework. Each tool has a single responsibility, each skill works independently, and together they form a complete workflow.

---

## Quick Start

### New idea

```
You: I want to build a tool that helps indie devs find users

→ Auto-enters 01-brainstorm, YC-style interrogation
→ Generates docs/brainstorms/2026-04-18-find-users-requirements.md
→ Recommends next: 02-plan

You: continue

→ 02-plan breaks into units, optional CEO Review
→ Generates docs/plans/2026-04-18-find-users-plan.md

You: continue

→ 03-work parallel execution, checkpoint resume
→ 04-review code review + optional browser QA
→ 05-compound knowledge compounding
```

### Adding a feature

```
You: I want to add user authentication to the project

→ 01-brainstorm CE mode, multi-round dialog: OAuth2? JWT? MFA?
→ Requirements doc → 02-plan → 03-work → 04-review → 05-compound
```

### Resume after interruption

```
You: /skill:03-work docs/plans/auth-plan.md

→ Auto-loads checkpoint, skips completed units, resumes from breakpoint
```

### Requirements changed

```
You: Requirements changed, need to add SSO support

→ 02-plan uses plan_diff to detect changes, patches incrementally
```

### Check progress anytime

```
You: /skill:08-status

→ Scans all artifacts, shows progress + recommends next step
```

---

## Generated File Structure

```
your-project/
├── docs/
│   ├── brainstorms/                  # Requirements (01-brainstorm)
│   ├── plans/                        # Execution plans (02-plan)
│   └── solutions/                    # Knowledge cards (05-compound)
└── .context/
    └── compound-engineering/
        ├── checkpoints/              # Breakpoint files (session_checkpoint)
        ├── dialogs/                  # Dialog state (brainstorm_dialog)
        └── history/                  # Execution history (session_history)
```

**Recommendation: commit everything to git** — these files are the project's traceable memory.

---

## Design Philosophy

**80% planning and review, 20% execution.**

The goal isn't making AI write code faster — it's making AI think before writing, review after writing, and compound learnings after reviewing. Speed comes from fewer rewrites, not from skipping steps.

**The best ideas from four projects, reimplemented natively for Pi:**

- **Compound Engineering** (Every Inc.) → The five-step loop + knowledge compounding backbone
- **Superpowers** (Jesse Vincent) → Strict TDD gates + design checklists + review discipline
- **Everything Claude Code** (140K+ stars) → Parallel subagent orchestration + checkpoint resume + continuous learning
- **gstack** (Garry Tan / YC) → YC-style forcing questions + CEO Review cognitive frameworks + browser QA

Not a fork. Not a wrapper. The methodologies are extracted and rebuilt with Pi's native tool + skill system.

---

## Best Practices

| Tip | Why |
|-----|-----|
| Start with 01-brainstorm | Whatever the scenario, thinking first never hurts |
| Use 07-worktree for big features | Isolated dev, no impact on main branch |
| Use CEO Review on plans | Like having a demanding CTO review for free |
| Use browser QA for acceptance | Code review can't catch layout breaks and blank screens |
| Don't panic on interruption | Next 03-work auto-resumes from checkpoint |
| Use 08-status when lost | One glance shows where you are |

---

## Changelog

### 0.14.0 — Structured solution retrieval
- YAML frontmatter tagging + grep-first two-level search
- 95 tests passing

### 0.13.0 — Superpowers engineering discipline
- Strict TDD gates, design checklists, YAGNI checks

### 0.12.0 — Error recovery
- session_checkpoint fail/retry operations

### 0.11.0 — Pattern extraction
- New pattern_extractor tool

### 0.10.0 — Continuous learning
- New session_history tool

### 0.9.0 — Incremental planning
- New plan_diff tool

### 0.8.0 — Multi-round dialog
- New brainstorm_dialog tool

### 0.7.0 — Parallel grouping
- Union-Find based task_splitter

### 0.6.0 — Checkpoint resume
- New session_checkpoint tool

### 0.5.0 — Parallel execution
- New parallel_subagent tool

### 0.4.0 — Smart review
- New review_router tool

### 0.3.0 — Isolated development
- New worktree_manager + 07-worktree

### 0.2.0 — State awareness
- New workflow_state + 06-next

### 0.1.0 — Initial release
- 7 skills, 3 tools

---

## Repository

- **GitHub**: https://github.com/leing2021/super-pi
- **npm**: https://www.npmjs.com/package/@leing2021/super-pi

## Development

```bash
bun test
npm publish --dry-run
```
