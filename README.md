# Super Pi

![Super Pi Workflow](docs/assets/super-pi.webp)

[中文](README_CN.md) | [English](README.md) 



**Turn your AI coding agent into a reliable engineer.**

Super Pi is a Pi-native engineering workflow layer: it adds stage discipline, durable artifacts, TDD gates, checkpoints, review, and learning loops on top of your coding agent.

Install, describe what you want to build, then keep saying "continue." Super Pi drives the full loop:

 **think → plan → build → review → compound learnings.**

```bash
pi install npm:@leing2021/super-pi
```

> **Project trust (pi ≥ 0.79):** Pi asks before loading project-local settings, resources, and packages. On first use, approve the project trust prompt so Super Pi can read `.pi/settings.json` and load its skills/extensions. Use `pi --approve` for non-interactive runs.

## Highlights

- **Five-step loop** — brainstorm → plan → work → review → learn, with automatic skill routing
- **Checkpoint resume** — interrupted? Resume from the exact unit you left off
- **TDD enforcement** — every unit follows RED → GREEN → REFACTOR with hard gates
- **Evidence-first review** — auto-assigned reviewers across five axes, autofix loop
- **Knowledge compounding** — solved problems become searchable solution artifacts
- **Token-efficient** — ~4,200 tokens new-conversation overhead; progressive loading

---

## Quickstart

```bash
pi install npm:@leing2021/super-pi
```

Then in Pi:

```
You: I want to build a CLI tool that helps indie devs find early users

→ 01-brainstorm: structured discovery → requirements artifact
→ 02-plan: TDD-gated implementation units → plan artifact
→ 03-work: inline execution, checkpoint resume
→ 04-review: five-axis findings, autofix loop
→ 05-learn: knowledge compounding

You: continue
→ Next skill recommended via /skill:06-next
```

**Resume after interruption:**

```
You: /skill:03-work docs/plans/plan.md
→ Loads checkpoint, skips completed units, resumes from breakpoint
```

---

## The Five-Step Loop

```
01-brainstorm → 02-plan → 03-work → 04-review → 05-learn
    think         plan      build      review      learn
```

| Skill | What it does | Core tool |
|-------|-------------|-----------|
| **01-brainstorm** | Structured multi-round discovery, domain vocabulary persistence | `brainstorm_dialog` |
| **02-plan** | TDD-gated implementation units, optional CEO Review | `plan_diff` |
| **03-work** | Inline execution, checkpoint resume, strict TDD, stop-the-line | `session_checkpoint`, `task_splitter` |
| **04-review** | Auto-assigned reviewers, six-axis findings (Standards + Spec), autofix loop | `review_router` |
| **05-learn** | Pattern extraction → searchable solution artifacts | `pattern_extractor` |
| **06-next** | Next-step recommendation + workflow status | `workflow_state` |
| **07-worktree** | Isolated git worktree development | `worktree_manager` |

### Model & Thinking Routing

Configure in `.pi/settings.json`:

```json
{
  "modelStrategy": {
    "01-brainstorm": "anthropic/claude-sonnet-4-20250514",
    "02-plan": "anthropic/claude-opus-4-20250115"
  },
  "thinkingStrategy": {
    "01-brainstorm": "high",
    "02-plan": "high",
    "03-work": "medium"
  }
}
```

Model and thinking level switch automatically — no manual `/model` needed.

Routing triggers on explicit `/skill:` commands **and** when the agent reads a stage's `SKILL.md` on its own. If no strategy is configured, routing is a no-op — the session model is never touched. Project-level settings take precedence; missing keys fall back to global `~/.pi/agent/settings.json`.

## Design Philosophy & Acknowledgements

**80% planning and review, 20% execution.**

The goal is not to make AI write code faster. The goal is to make AI think before writing, review after writing, and compound what it learns.

Super Pi is not a fork or wrapper. It extracts useful methods from the projects below and rebuilds them with Pi-native skills, tools, artifacts, checkpoints, and handoffs.

| Project | What Super Pi adopted |
|---------|------------------------|
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | "Use when" skill trigger conditions, source-driven verification, stop-the-line hard gate, anti-rationalization, and the five-axis review baseline. Adopted as embedded micro-patterns only — no new skills, tools, commands, or agents. |
| [everything-claude-code (ECC)](https://github.com/affaan-m/ECC) | Checkpoint resume, continuous learning loops, and token-conscious agent workflow design. (Repo renamed; original link dead.) |
| [humanlayer/12-factor-agents](https://github.com/humanlayer/12-factor-agents) | Context window ownership, compacting resolved errors, retry caps, and pre-fetching obvious prerequisites. Adopted as lightweight context hygiene rules inside the existing Phase 1 pipeline. |
| [superpowers](https://github.com/obra/superpowers) | Strict TDD gates, design checklists, review discipline, the rationalization table (excuse → reality), and the idea that agents need hard gates instead of gentle suggestions. |
| [compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) | The five-step think → plan → build → review → learn loop, the knowledge-compounding backbone, and solution retirement (knowledge must be able to leave, not only accumulate). |
| [gstack](https://github.com/garrytan/gstack) | YC-style forcing questions, CEO Review cognitive frameworks, browser QA patterns, failure maps, and evidence-first validation. |
| [mattpocock/skills](https://github.com/mattpocock/skills) | Context glossary (`CONTEXT.md`), lightweight ADR (three-condition threshold + "What qualifies" catalog), feedback-loop-first debug discipline, deep-module vocabulary (module/interface/depth/seam/adapter/leverage/locality + internal seams + rejected framings), interview discipline (facts-vs-decisions, one-question-at-a-time), the review Spec axis, and the out-of-scope knowledge base. Absorbed as self-contained `skills/references/` content — no external path deps, no issue-tracker deps, no standalone skills grafted (super-pi's existing 01-brainstorm/domain-language/module-design already cover the active disciplines). |
| [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | The Ladder (7-rung minimalism decision chain: need-to-exist → codebase reuse → stdlib → platform-native → installed dep → one line → minimum), the `debt:` marker convention (name the ceiling and upgrade trigger), and dependency-axis review tags (`stdlib:` / `native:` / `dependency:`) flowing into the 04-review Standards axis. Embedded into `rules/common/` — no intensity tiers, no hooks/MCP, no standalone skills. |

---

## Behavioral Gates

### Stop-the-line (Hard gate)

When an unexpected failure occurs during `03-work`:

1. **STOP** adding features
2. **PRESERVE** evidence
3. **DIAGNOSE** root cause — build a feedback loop first, then reproduce → hypothesise → instrument → fix
4. **FIX** the root cause, not the symptom
5. **GUARD** with a regression test
6. **RESUME** only after verification passes

Anti-rationalization: do not rationalize, downgrade, or explain away failures. Stop and report with evidence.

### Source-driven verification

When implementation depends on a framework/library API, version-specific behavior, or a recommended pattern: verify against official documentation before implementing. Pure logic, renaming, or in-project pattern reuse does not require external citation.

### Review five axes

All reviewers evaluate changes across: **correctness, readability, architecture, security, performance.**

---

## Token Cost

New conversation overhead: **~4,130 tokens** (2.1% of 200K context).

| Component | Tokens |
|-----------|--------|
| 17 skill registrations | ~1,710 |
| 22 tool schemas | ~2,420 |
| Skill inlining (per invocation) | ~300–1,200 |

Progressive loading: only needed skills loaded on-demand.

See [docs/token-cost-evaluation.md](docs/token-cost-evaluation.md) for detailed per-skill breakdown and measurement methodology.

---

## Generated Structure

```
your-project/
├── docs/
│   ├── brainstorms/      # Requirements
│   ├── plans/             # Execution plans
│   ├── adr/               # Architecture decisions (lazy)
│   └── solutions/         # Knowledge cards
└── .context/
    └── compound-engineering/
        ├── checkpoints/   # Breakpoint files
        ├── handoffs/      # Cross-stage context
        └── history/       # Execution history
```

Commit everything to git — these files are the project's traceable memory.

---

## Architecture

| Component | Count |
|-----------|------:|
| Skills | 7 |
| Tools | 12 CE + 10 Pi built-in |
| Rules | 78 |
| TypeScript lines | ~4,100 |
| Tests | 180 (727 assertions) |

Rules in `rules/` cover 11 common topics + language-specific sets (TypeScript, Rust, Go, Python, Java, Kotlin, C++, C#, Dart, Swift, Perl, PHP). Project-level overrides take priority.

---

## Commands

| Command | Description |
|---------|-------------|
| `bun test` | Run all tests |
| `npm publish --dry-run` | Preview package contents |

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

## Links

- **npm**: https://www.npmjs.com/package/@leing2021/super-pi
- **GitHub**: https://github.com/leing2021/super-pi
- **License**: MIT
