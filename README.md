# Super Pi

**Turn your AI coding agent from "a tool that writes code" into "a reliable engineer."**

Install it, tell Pi what you want to build, then keep saying "continue" — it walks through the full loop: **think → plan → build → review → compound learnings.**

```bash
pi install npm:@leing2021/super-pi
```

> **Upgrading from v0.21.0 or earlier?** Run `pi uninstall npm:pi-subagents` first, then `pi update`. Since v0.22.0, subagent capabilities are built-in — no separate package needed.

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

## Quick Start

### New idea

```
You: I want to build a tool that helps indie devs find users

→ Auto-enters 01-brainstorm, YC-style interrogation
→ Generates docs/brainstorms/2026-04-18-find-users-requirements.md
→ Recommends next: 02-plan

You: continue

→ 02-plan breaks into units, optional CEO Review
→ 03-work parallel execution, checkpoint resume
→ 04-review code review + optional browser QA
→ 05-learn knowledge compounding
```

### Adding a feature

```
You: I want to add user authentication to the project

→ 01-brainstorm CE mode: OAuth2? JWT? MFA?
→ Requirements doc → 02-plan → 03-work → 04-review → 05-learn
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

---

## The Five-Step Loop

```
01-brainstorm → 02-plan → 03-work → 04-review → 05-learn
    think          plan      build      review      learn
```

Each step has a dedicated skill + tool pair. Not just prompts — structured toolchains.

### 01-brainstorm: Think First

Three modes for three scenarios:

| Mode | For | What it does |
|------|-----|-------------|
| **Startup Diagnostic** | Startup ideas, new products | Six YC-style forcing questions, pushed until you produce specific evidence |
| **Builder Mode** | Side projects, hackathons | Focused on building. Accidentally mention revenue? Auto-upgrades to Startup Diagnostic |
| **CE Brainstorm** | Adding features to existing projects | Multi-round dialog to clarify scope, generates structured requirements doc |

All three run a **premise challenge** (are your assumptions valid?) and **alternatives generation** before you move on.

### 02-plan: Plan Well

Breaks requirements into implementation units with strict **RED → GREEN → REFACTOR**. Requirements changed? `plan_diff` patches incrementally instead of rewriting.

**CEO Review (optional)**: Challenges your plan using Bezos reversible-decision frameworks, Munger inversion, Jobs subtraction. Like having a demanding CTO review for free.

### 03-work: Build Right

- **Parallel execution**: `task_splitter` analyzes file dependencies, feeds conflict-free units to `subagent` for concurrent execution
- **Checkpoint resume**: Interrupted? Next startup auto-loads, skips completed work, continues from breakpoint
- **Strict TDD**: Failing test → minimal implementation → test passes → refactor. Every step requires command output as evidence

### 04-review: Review Thoroughly

`review_router` auto-assigns reviewer personas based on diff metadata. Every finding must cite specific code — no performative agreement.

**Browser QA (optional)**: Opens your app, clicks through pages, screenshots bugs, fixes by severity, up to 3 auto-fix iterations.

### 05-learn: Compound Learnings

Turns "the pitfall we hit this time" into a YAML-tagged solution card in `docs/solutions/`. Two-level storage: project-specific and global (`~/.pi/agent/docs/solutions/`).

Next time `02-plan` or `04-review` runs, relevant past experience is automatically retrieved.

---

## Built-in Capabilities

One package includes everything:

| What | How to Access |
|------|--------------|
| **Agent Manager TUI** | `/agents` or `Ctrl+Shift+A` |
| **CE Agents** (ce-scout, ce-planner, etc.) | Via subagent tool |
| **CE Chains** (scout → planner → worker → reviewer) | Via subagent tool |
| **Parallel execution** | Via subagent tool |
| **Stage Model Sync** | Automatic — set `modelStrategy` / `thinkingStrategy` in `.pi/settings.json` |
| **Diagnostics** | `/subagents-status`, `/subagents-doctor` |

### Stage model routing

Configure once in `.pi/settings.json`:

```json
{
  "modelStrategy": {
    "01-brainstorm": "claude-sonnet-4-20250514",
    "02-plan": "claude-opus-4-20250115",
    "03-work": "claude-sonnet-4-20250514",
    "default": "claude-sonnet-4-20250514"
  },
  "thinkingStrategy": {
    "02-plan": "high",
    "03-work": "medium"
  }
}
```

Model switching is handled automatically — no manual `/model` needed. When you run any CE skill, the extension reads the config and switches before the skill runs. Supported formats: full reference (`"anthropic/claude-opus-4-1"`) or bare model id (`"claude-opus-4-1"`).

---

## Technical Architecture

### Core: Five-Step Loop

| Skill | What | Core Tool |
|-------|------|----------|
| `01-brainstorm` | Three-mode requirements mining (Startup Diagnostic / Builder / CE) | `brainstorm_dialog` |
| `02-plan` | Break into units with TDD gates, incremental `plan_diff` updates | `plan_diff` |
| `03-work` | Parallel execution, checkpoint resume, error recovery | `session_checkpoint`, `task_splitter`, `subagent` |
| `04-review` | Persona-routed review + live browser QA | `review_router` |
| `05-learn` | Pattern extraction → searchable knowledge cards | `pattern_extractor` |

### Utilities

| Skill | One-liner |
|-------|-----------|
| `06-next` | Recommend the best next skill based on workflow state |
| `07-worktree` | Git worktree isolated development |
| `08-status` | Scan artifacts, report progress |
| `09-help` | Usage guide |
| `10-rules` | Progressive rule loading for coding standards |

### Progressive Rule Loading

Built-in `rules/` directory with 13 language layers (TypeScript, Python, Rust, Go, Java, Kotlin, C#, C++, Dart, PHP, Perl, Swift, Elixir) + common + web — 78 Markdown files total.

Rules load **progressively** — never all at once, only what the current task needs. Zero waste.

Customize for your project: create a `rules/` directory in your project root. Project-level rules override package defaults. See `10-rules` skill for details.

### Generated File Structure

```
your-project/
├── docs/
│   ├── brainstorms/                  # Requirements (01-brainstorm)
│   ├── plans/                        # Execution plans (02-plan)
│   └── solutions/                    # Knowledge cards (05-learn)
└── .context/
    └── compound-engineering/
        ├── checkpoints/              # Breakpoint files (session_checkpoint)
        ├── dialogs/                  # Dialog state (brainstorm_dialog)
        └── history/                  # Execution history (session_history)
```

**Recommendation: commit everything to git** — these files are the project's traceable memory.

---

## Design Philosophy & Acknowledgements

**80% planning and review, 20% execution.**

The goal isn't making AI write code faster — it's making AI think before writing, review after writing, and compound learnings after reviewing. Speed comes from fewer rewrites, not from skipping steps.

The following projects directly inspired this work:

- **[pi-subagents](https://github.com/nicobailon/pi-subagents)** (by Nico Bailon, MIT License) → Full subagent runtime integrated as built-in extension (serial, parallel, chain, async, TUI, agent CRUD)
- **[everything-claude-code](https://github.com/affaan-m/everything-claude-code)** (162K★) → Parallel subagent orchestration, checkpoint resume, continuous learning
- **[superpowers](https://github.com/obra/superpowers)** (161K★) → Strict TDD gates, design checklists, review discipline
- **[gstack](https://github.com/garrytan/gstack)** (78K★) → YC-style forcing questions, CEO Review frameworks, browser QA
- **[compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin)** (14K★) → Five-step loop, knowledge compounding backbone

Not a fork. Not a wrapper. Methodologies extracted and rebuilt with Pi's native tool + skill system.

---

## Best Practices

| Tip | Why |
|-----|-----|
| Start with 01-brainstorm | Thinking first never hurts |
| Use 07-worktree for big features | Isolated dev, no impact on main branch |
| Use CEO Review on plans | Like having a demanding CTO review for free |
| Use browser QA for acceptance | Code review can't catch layout breaks and blank screens |
| Don't panic on interruption | Next 03-work auto-resumes from checkpoint |
| Use 08-status when lost | One glance shows where you are |

---

## Changelog

### 0.22.0 — Source-integrated pi-subagents
- Integrated pi-subagents v0.20.1 source code into `extensions/subagent/` — single package install (`pi install npm:@leing2021/super-pi`).
- Moved `typebox` from peerDependencies to dependencies.
- Removed `pi-subagents` peer dependency — no longer needed.
- Simplified `super-pi-extension/index.ts`: removed faulty installation detection and auto-install logic.
- Pruned slash commands: removed `/run`, `/chain`, `/run-chain`, `/parallel`; kept `/agents` (TUI), `/subagents-status`, `/subagents-doctor`, and `Ctrl+Shift+A` shortcut.
- Added 8 new tests covering subagent extension structure, agent counts, and integration integrity.
- 169 tests passing.

### 0.21.0 — Delegate subagent tools to pi-subagents
- Subagent capabilities now provided by the `pi-subagents` package.
- Removed `subagent` and `parallel_subagent` tool registrations from `ce-core` extension.

### 0.20.0 — Extension API migration
- Migrated `super-pi-extension` to Pi-native factory function format.

<details>
<summary>Older versions</summary>

### 0.19.6 — pi-subagents integration extension
- New `super-pi-extension`: pre-configured CE Agents and CE Chains.
- New `thinkingStrategy` setting: per-stage thinking level sync.

### 0.19.5 — Plan/Work/Review skill rules loading alignment
- Fixed `02-plan` not loading language-specific rules during the planning phase.
- Updated all three skills to use a consistent 4-step progressive loading strategy.

### 0.19.4 — Read output filter markdown truncation fix
- Fixed `read-output-filter` over-truncating markdown files.
- Added 5 new tests. 175 tests passing.

### 0.19.3 — Terminate fix + runtime model routing + autoContinue removal
- Fixed 6 ce-core tools incorrectly returning `terminate: true`.
- Implemented runtime stage model routing via ce-core extension `input` hook.

### 0.19.2 — Evidence-first handoff-lite + docs tracking rule
- Added `context_handoff` with evidence-first default handoff-lite generation.

### 0.19.1 — Pipeline config + typecheck baseline fix
- Added shared pipeline config for stage model routing.

### 0.19.0 — 0.69.0 alignment + learn rename
- TypeBox migration: `@sinclair/typebox` → `typebox`.
- Peer/dev dependency upgrade: pi-coding-agent `0.67.6` → `0.69.0`.
- Skill rename: `05-compound` → `05-learn`.

### 0.18.0 — Progressive rules
- Built-in `rules/` directory with 13 language layers + common + web (78 Markdown files).
- New `10-rules` skill: progressive on-demand loading.

### 0.17.0 — Subagent safety
- Recursion depth guard prevents runaway nesting.
- Async mutex for `process.env` concurrency safety.

### 0.16.0 — Context optimization
- Read output filter: structural compression for large code files.

### 0.15.0 — Output filtering
- Bash output filter: smart truncation by command type.

### 0.14.0 — Structured solution retrieval
- YAML frontmatter tagging + grep-first two-level search.

### 0.13.0 — Superpowers engineering discipline
- Strict TDD gates, design checklists, YAGNI checks.

### 0.12.0 — Error recovery
- session_checkpoint fail/retry operations.

### 0.11.0 — Pattern extraction
- New pattern_extractor tool.

### 0.10.0 — Continuous learning
- New session_history tool.

### 0.9.0 — Incremental planning
- New plan_diff tool.

### 0.8.0 — Multi-round dialog
- New brainstorm_dialog tool.

### 0.7.0 — Parallel grouping
- Union-Find based task_splitter.

### 0.6.0 — Checkpoint resume
- New session_checkpoint tool.

### 0.5.0 — Parallel execution
- New parallel_subagent tool.

### 0.4.0 — Smart review
- New review_router tool.

### 0.3.0 — Isolated development
- New worktree_manager + 07-worktree.

### 0.2.0 — State awareness
- New workflow_state + 06-next.

### 0.1.0 — Initial release
- 7 skills, 3 tools.

</details>

---

## Repository

- **GitHub**: https://github.com/leing2021/super-pi
- **npm**: https://www.npmjs.com/package/@leing2021/super-pi

## Development

```bash
bun test
npm publish --dry-run
```
