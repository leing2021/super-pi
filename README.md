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
01-brainstorm → 02-plan → 03-work → 04-review → 05-learn
    think          plan      build      review      learn
```

Each step has a dedicated skill + tool pair. Not just prompts — structured toolchains.

### New: Stage model routing

Configure once in `.pi/settings.json`:

```json
{
  "modelStrategy": {
    "01-brainstorm": "claude-sonnet-4-20250514",
    "02-plan": "claude-opus-4-20250115",
    "03-work": "claude-sonnet-4-20250514",
    "04-review": "claude-sonnet-4-20250514",
    "05-learn": "claude-haiku-4-20250414",
    "default": "claude-sonnet-4-20250514"
  }
}
```

How it works:
- Model switching is handled automatically by the ce-core extension `input` hook — no manual `/model` needed.
- When you type `/skill:01-brainstorm` through `/skill:05-learn`, the extension reads `modelStrategy[stage]` (or `modelStrategy.default`) and switches before the skill runs.
- Supported formats: full reference (`"anthropic/claude-opus-4-1"`) or bare model id (`"claude-opus-4-1"`, reuses current provider).
- Every stage prints a `📊 Pipeline Status` block with `Current / Output / Next`.
- A `Switched model for <stage>: <provider>/<model>` notification appears when the model changes.

Quick example:
1. Run `/skill:01-brainstorm` — model auto-switches to the configured brainstorm model
2. Approve the design
3. Run `/skill:02-plan` — model auto-switches to the configured plan model
4. Continue through each stage — model switches automatically at each step

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

### 05-learn: Compound Learnings

`pattern_extractor` scans existing artifacts, extracts and categorizes patterns. Turns "the pitfall we hit this time" into a YAML-tagged solution card in `docs/solutions/`.

Two-level storage: project-specific → inside the project; cross-project → `~/.pi/agent/docs/solutions/` globally searchable.

Next time `02-plan` or `04-review` runs, a grep-first search strategy automatically retrieves relevant past experience.

---

## Technical Architecture

### 8 Skills (workflow nodes)

| Skill | One-liner | Core Tool |
|-------|-----------|-----------|
| `01-brainstorm` | Deep requirements mining in three modes | `brainstorm_dialog` |
| `02-plan` | Break into units, TDD gates, incremental updates | `plan_diff` |
| `03-work` | Parallel execution, checkpoint resume, error recovery | `session_checkpoint`, `task_splitter`, `parallel_subagent` |
| `04-review` | Persona-routed review + live browser testing | `review_router` |
| `05-learn` | Pattern extraction → knowledge card compounding | `pattern_extractor` |
| `06-next` | What to do next + full status report | `workflow_state`, `session_history` |
| `07-worktree` | Git worktree isolated development | `worktree_manager` |
| `08-help` | Usage guide | — |


### 14 Tools + 2 Helpers (underlying capabilities)

| Tool | What it does |
|------|-------------|
| `task_splitter` | Union-Find algorithm analyzes file dependencies, auto-groups parallel-safe units |
| `session_checkpoint` | JSON-persisted checkpoints with save/load/fail/retry operations |
| `plan_diff` | Incremental plans: compare detects diffs, patch applies changes |
| `parallel_subagent` | `Promise.allSettled`-style parallel subagent execution with context slimming |
| `review_router` | Auto-assign reviewer personas from diff metadata |
| `pattern_extractor` | Extract and categorize patterns from artifacts |
| `brainstorm_dialog` | Multi-round dialog state machine (start → refine × N → summarize) |
| `session_history` | Cross-session execution history recording and querying |
| `workflow_state` | Scan docs/ and .context/ to summarize workflow state |
| `worktree_manager` | Full git worktree lifecycle management |
| `artifact_helper` | Artifact path resolution and directory creation |
| `ask_user_question` | Structured user prompts (choices / free input) |
| `subagent` | Serial subagent chain with depth guard and context control |
| `context_handoff` | Cross-stage context handoffs with evidence-first templates (save/load/latest/status) |
| `subagent-depth-guard` | Helper: env-based recursion depth tracking (prevents runaway nesting) |
| `async-mutex` | Helper: serializes `process.env` mutation for concurrency-safe child process spawning |

---

## Token Cost

New conversation overhead: **~2,600 tokens** (1.3% of Claude Sonnet 4's 200K context).

| Component | Tokens | When loaded |
|-----------|--------|-------------|
| 8 skill registrations | ~490 | Every conversation (fixed) |
| 14 tool registrations | ~2,055 | Every conversation (fixed) |
| Hooks & filters | 0 | Runtime interception, zero prompt cost |
| Single skill trigger | ~1,000–4,000 | On-demand via `read` |
| Rules minimal (2 files) | ~900 | Before plan/work |
| Rules + language (7 files) | ~2,600 | Before work with specific language |

| vs bare Pi | vs global rules injection | vs super-pi |
|-----------|----------------------|------------|
| No rules | All rules loaded upfront | Progressive on-demand |
| No output filtering | No output filtering | Auto-compress (bash ~65–98%, read ~30–60%) |
| No TDD gate | No TDD gate | Hard gate prevents rework |
| 0 tokens | ~5,000–36,000 tokens | **~2,600 tokens** |

Single `npm install` output filtered once pays for the entire overhead. Full evaluation → [`docs/token-cost-evaluation.md`](docs/token-cost-evaluation.md)

---

## Code Scale

~2800 lines of TypeScript implementing 14 registered tools + 2 helpers, 23 Markdown reference files + 79 rule files driving 8 skills, 175 tests covering all tool logic.

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
→ 05-learn knowledge compounding
```

### Adding a feature

```
You: I want to add user authentication to the project

→ 01-brainstorm CE mode, multi-round dialog: OAuth2? JWT? MFA?
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

### Check progress anytime

```
You: /skill:06-next

→ Scans all artifacts, shows progress + recommends next step
```

---

## Generated File Structure

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

### Progressive Rule Loading

Built-in coding rules live under `rules/` in the package. Rules are loaded **progressively** by each skill — never all at once, only what the current task needs.

**How it works:**

```
system prompt (30 tokens: skill name + description)
  → skill SKILL.md (~200 tokens: loading decision tree)
    → specific rule files via read tool (on-demand, 900–2600 tokens)
```

Three skills auto-trigger rule loading at their entry points:

| Skill | Rules pre-loaded |
|-------|-----------------|
| `02-plan` | `common/` rules + language detection + matching language rules (e.g. `rules/typescript/`) |
| `03-work` | `common/` rules + language detection + matching language rules + `web/` if frontend |
| `04-review` | `common/code-review.md` + language detection + matching language rules + `web/` if frontend |

Language detection uses file heuristics (see `skills/references/language-detection.md`): `tsconfig.json` → TypeScript, `Cargo.toml` → Rust, `go.mod` → Go, etc.

**Rule precedence** (when layers overlap on the same topic):

```
language-specific  >  web  >  common
```

No rules are loaded when you brainstorm, check status, or do non-code tasks. Zero waste.

#### Included rule layers

| Layer | Files | When loaded |
|-------|-------|------------|
| `common/` | 11 files (includes `naming.md`) | Always (baseline for all tasks) |
| `typescript/`, `python/`, `cpp/`, `csharp/`, `dart/`, `golang/`, `java/`, `kotlin/`, `perl/`, `php/`, `rust/`, `swift/` | 5 files each | When the task touches that language |
| `web/` | 7 files (includes `design-quality.md`, `performance.md`) | When frontend/browser is relevant |

#### Customizing rules for your project

Two rule sources exist, with project-level taking priority:

| Source | Location | Survives `pi update`? |
|--------|----------|----------------------|
| **Project-level** | `{your-project-root}/rules/` | ✅ Yes |
| Package-level | Inside `node_modules/@leing2021/super-pi/rules/` | ❌ No |

To customize, create a `rules/` directory in your project root. Skills check it first — if a file exists there, it overrides the package default for that topic.

**Add a language** — create a new directory with the 5 standard topics:

```bash
mkdir rules/elixir
touch rules/elixir/{coding-style,testing,patterns,security,hooks}.md
```

Each file should start with:

```markdown
> This file extends [common/xxx.md](../common/xxx.md) with Elixir-specific content.
```

**Remove unused languages** — just delete the directory:

```bash
rm -rf rules/perl rules/cpp  # don't need these? remove them
```

**Tweak a rule** — edit the `.md` file directly:

```bash
# Override testing conventions for your team
vim rules/common/testing.md

# Override for a specific language
vim rules/typescript/testing.md
```

**Add a new topic** — create a new `.md` in the appropriate layer:

```bash
# Common topic
vim rules/common/api-design.md

# Language-specific override
vim rules/python/api-design.md
```

Skills will pick up any `.md` file in `rules/` — no configuration needed. If a language directory exists, it's available for loading. If it's gone, it's simply never loaded.

---

## Design Philosophy & Acknowledgements

**80% planning and review, 20% execution.**

The goal isn't making AI write code faster — it's making AI think before writing, review after writing, and compound learnings after reviewing. Speed comes from fewer rewrites, not from skipping steps.

The following projects directly inspired this work:

- **[everything-claude-code](https://github.com/affaan-m/everything-claude-code)** (162K★) → Parallel subagent orchestration, checkpoint resume, continuous learning
- **[superpowers](https://github.com/obra/superpowers)** (161K★) → Strict TDD gates, design checklists, review discipline
- **[gstack](https://github.com/garrytan/gstack)** (78K★) → YC-style forcing questions, CEO Review frameworks, browser QA
- **[compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin)** (14K★) → Five-step loop, knowledge compounding backbone

Not a fork. Not a wrapper. Methodologies extracted and rebuilt with Pi's native tool + skill system.

---

## Best Practices

| Tip | Why |
|-----|-----|
| Start with 01-brainstorm | Whatever the scenario, thinking first never hurts |
| Use 07-worktree for big features | Isolated dev, no impact on main branch |
| Use CEO Review on plans | Like having a demanding CTO review for free |
| Use browser QA for acceptance | Code review can't catch layout breaks and blank screens |
| Don't panic on interruption | Next 03-work auto-resumes from checkpoint |
| Use 06-next when lost | One glance shows where you are and what to do next |

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

---

## Repository

- **GitHub**: https://github.com/leing2021/super-pi
- **npm**: https://www.npmjs.com/package/@leing2021/super-pi

## Development

```bash
bun test
npm publish --dry-run
```
