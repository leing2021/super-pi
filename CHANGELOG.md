# Changelog

### 0.30.6 — solution retirement + rationalization table: absorb CE #1540 & superpowers v6.2
- **Solution retirement** (`skills/05-learn/references/overlap-rules.md` + `SKILL.md`): `docs/solutions/` had an entrance gate (necessity check) but no exit — artifacts describing code/APIs that no longer exist kept polluting every future solution search. Three retirement exits when staleness is discovered: **superseded** → fold into the replacing artifact (keep old tags searchable there) and delete; **dead reference** → delete outright (git is the archive, no tombstones); **scope narrowed** → update `applies_when` instead of deleting. Sourced from [compound-engineering-plugin #1540](https://github.com/EveryInc/compound-engineering-plugin/pull/1540) — their measured glossary grew +380/−11 across 25 commits because nothing could leave.
- **Rationalization table** (`skills/03-work/SKILL.md`): the one-line anti-rationalization rule ("do not rationalize, downgrade, or explain away") is now backed by a four-row Excuse → Reality table: "close enough" → failed gate means not done; "one more retry converges" → past the 3-failure cap, failure is structural; "tiny fix, skip verify" → unverified fixes are how regressions land; "special case" → no evidence, no exception. Sourced from [superpowers](https://github.com/obra/superpowers) v6.2 SDD (Common Rationalizations), trimmed to 03-work's non-subagent context.
- **README dead-link fix**: the `everything-claude-code` acknowledgement link 404s — the repo was renamed to [ECC](https://github.com/affaan-m/ECC). Link updated in both READMEs; scanned ECC's recent history (installer hardening, host adapters, TasteForge/Nasiko vertical skills) — nothing further to absorb, direction conflicts with minimalism. Acknowledgement rows for superpowers and compound-engineering-plugin updated to credit the two new adoptions.
- Out of scope by minimalism: CE STRATEGY.md (project governance), CE #1537 (skill-editing restatement rules), superpowers five-round breaker + ruling ledger (subagent-specific; 3-failure cap + ask-user already covers it), agent-skills Phase 0 capability map (task_splitter already groups by file dependency). 5 files, +26/−7, zero new skills/tools/commands. 211 tests passing.

### 0.30.5 — absorb ponytail: The Ladder, debt marker, dependency-axis review tags
- **The Ladder** (`rules/common/coding-style.md`): a 7-rung ordered decision chain to run before writing code — (1) does it need to exist (YAGNI) → (2) already in this codebase → (3) stdlib → (4) platform-native → (5) installed dependency → (6) one line → (7) only then, the minimum that works. Two meta-rules anchor it: the ladder runs *after* understanding the problem (lazy about writing, never about reading), and bug fixes target the *root cause* (usually the smaller diff). A never-lazy list (trust-boundary validation, data-loss guards, security, accessibility) is explicitly fenced off.
- **Debt marker** (same file): deliberate shortcuts with a known ceiling (global lock, O(n²) scan) are marked `// debt: <ceiling>, upgrade when <trigger>`. A marker without an upgrade condition is rot risk, not minimalism. Auditable via `rg 'debt:'`.
- **Dependency-axis review tags** (`rules/common/code-smells.md`): three new tags alongside the Fowler 12 — `stdlib:` (hand-rolled what the standard library ships), `native:` (code/dependency doing what the platform provides), `dependency:` (new package for what a few lines can do). They inherit the baseline's binding rules (repo overrides, judgement call, default P2) and flow into 04-review's Standards axis automatically — no SKILL.md changes needed, since the review skill already loads this file.
- Sourced from [ponytail](https://github.com/DietrichGebert/ponytail) (113k stars; measured -54% LOC / -20% cost / 100% safe). Out of scope by minimalism: intensity tiers, hooks/MCP distribution, standalone debt/audit skills, ledger tooling. README / README_CN acknowledgement table updated.
- Test coverage (`tests/skill-contracts.test.ts`): two new contract tests asserting the ladder's rungs, meta-rules, debt convention, and the three tags — 211 tests passing, 0 regressions. 3 files, +70 lines, zero SKILL.md edits.

### 0.30.4 — thinkingStrategy `max` level fix + unknown-value warning
- **Bug fix (medium severity, silent downgrade)**: the hardcoded `levelMap` in `extensions/ce-core/index.ts` (input hook thinking-level switching) was missing the `max` key. Any `thinkingStrategy` value of `"max"` (e.g. `{"02-plan": "max"}`) silently fell back to `medium` via the `?? "medium"` catch-all — no error, no warning. Pi core fully supports `max` (`EXTENDED_THINKING_LEVELS` includes it; GLM-5.3 / DeepSeek V4 Pro recommend `max` for complex agent scenarios), so users on those models could never reach the intended level through super-pi.
- **Unknown values now warn instead of silently downgrading**: a typo like `"ultra"` still falls back to `medium` (behavior preserved) but now emits `Unknown thinking level for <stage>: <value>, falling back to medium` via `ctx.ui.notify` (warning level, TUI/RPC modes only, consistent with the existing notify guard).
- **Type-level safety**: `max: "max"` is valid against `ReturnType<ExtensionAPI["getThinkingLevel"]>` (= `ModelThinkingLevel`, which includes `max`) — the map key was the only gap.
- **Test coverage** (`tests/ce-core-extension.test.ts`): three new tests — (1) `max` maps through and notifies `Switched thinking level for 02-plan: max`; (2) unknown value `"ultra"` produces the warning + medium fallback, in that order; (3) full level matrix regression (off/minimal/low/medium/high/xhigh/max + case-insensitivity `MAX` + numeric aliases `"0"/"1"/"2"`). The unknown-value test mock uses `getThinkingLevel() → "high"` so the fallback switch actually fires (verified via a distinct sentinel in the matrix test).
- 209 tests passing, 0 regressions. Models without a `max` tier (GPT-5.x, Claude) are unaffected: pi core `clampThinkingLevel` maps `max` down to the nearest supported tier as before.

### 0.30.3 — remove stray `grilling` token from premise-challenge
- **Token hygiene (P2)**: the heading `## Interview discipline (from grilling)` in `skills/01-brainstorm/references/premise-challenge.md` referenced `grilling` — a methodology name that was never an independent skill and has been fully absorbed into the Interview discipline section. The dangling token caused LLMs in non-brainstorm sessions (e.g. `03-work`) to hallucinate "grilling" as a callable skill/action (e.g. "which candidate to grill?"). Removed the `(from grilling)` annotation; the three discipline rules themselves are unchanged.
- `rg -i grill` across the repo now returns zero hits. No behavior change; no test impact.

### 0.30.2 — self-contained regression net for skill-level references
- **Test gap closed (P2)**: the existing self-contained scan only covered the top-level `skills/references/` directory. Skill-level references (`skills/*/references/`, `skills/*/assets/`) had no regression net, so a future `~/.pi/...` external-path leak or `/Users/...` absolute path could land silently.
- **New contract test** (`tests/skill-contracts.test.ts`): scans every `.md` under each skill's `references/` and `assets/` directories. Uses a **whitelist** instead of a flat ban — `~/.pi/agent/docs/solutions/` is permitted (the global solution-library convention, legitimately used by 4 solution-search files), while any other `~/.pi` path or any `/Users/` absolute path is a violation. Failure messages pinpoint the offending file.
- **Reverse-verified**: injected a non-whitelisted `~/.pi` path and confirmed the test catches it with a precise `non-whitelisted ~/.pi path` message, then removed the injection. The net is not decorative.
- 206 tests passing, 0 regressions.

### 0.30.1 — extract Spec axis probe into spec-source-detection reference
- **Refactor (P2)**: the four-level spec-source probe (plan → brainstorm → commit issue ref → skip) previously lived inline as a dense single line in `skills/04-review/SKILL.md` Core rule 8, and was duplicated in Workflow step 4. Extracted into `skills/04-review/references/spec-source-detection.md` (35 lines): full probe order, artifact-driven guard (no auto-fetch rationale), standalone-invocation coverage explanation, and the three Spec-axis output classes (missing / scope creep / wrong implementation).
- **SKILL.md slimmed**: Core rule 8 and Workflow step 4 now both point to the reference via a single-line link, removing the duplication. SKILL.md stays at 87 lines (well under the 100-line budget). Behavior unchanged.
- **Test coverage** (`tests/skill-contracts.test.ts`): new contract test asserts the reference exists with the four probe levels and the no-auto-fetch guard, and that SKILL.md links to it. The pre-existing `trace back` assertion migrated from checking SKILL.md to checking the reference (the wording now lives there).
- 205 tests passing, 0 regressions.

### 0.30.0 — 04-review Spec axis issue-ref detection + handoff Git Context
- **04-review Spec axis source chain** (`skills/04-review/SKILL.md`): the Spec axis previously only compared the diff against a plan artifact and skipped when none existed. In standalone-invocation scenarios (no brainstorm, no plan), this left the Spec axis inert. Added a four-level spec-source probe: (a) plan artifact → (b) brainstorm artifact (trace back to original wording) → (c) issue references in commit messages via `git log <base>..HEAD --oneline` (scan for `#123` / `Closes #45` / `!67`) — identify the ref and **ask the user** whether to treat it as spec source, do **not** auto-fetch → (d) skip if none.
- **Artifact-driven preserved**: the issue-ref probe deliberately uses only local `git log` (no `gh issue view`, no network, no tracker as source of truth) — consistent with the four-filter evaluation in solution `2026-07-22-absorbing-external-skill-repos`. The decision to adopt a ref as spec stays with the user.
- **Workflow wiring**: step 2 (diff scope) now prefers `branch`/`base` from the latest handoff before falling back to explicit target or asking; step 4 (read plan) falls through to the commit-issue-ref probe when no plan artifact is present.
- **Handoff schema extension** (`skills/references/pipeline-config.md`): the handoff-lite template gains a `## Git Context` section (`branch` + `base`) so diff scope can flow across stages without re-derivation. Optional field with `N/A` fallback — backward compatible.
- **Test coverage** (`tests/context-handoff.test.ts`): added contract assertions for `## Git Context` and `- branch:` in the handoff-lite template test, guarding the new field against silent removal.
- 204 tests passing, 0 regressions.

### 0.29.0 — Fowler smell baseline for review Standards axis
- **Review Standards axis baseline** (new `rules/common/code-smells.md`): the 04-review Standards axis previously had a severity ladder (P0/P1/P2) and a precision gate but **no check list** — agents reviewed by vibes. Added a fixed baseline of 12 diff-friendly Fowler code smells (_Refactoring_, ch.3): Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man, Refused Bequest. Each entry reads *what it is → how to fix*.
- **Two binding rules** keep the baseline safe: (1) a documented repo standard overrides the baseline; (2) every smell is a judgement call ("possible Feature Envy"), never a hard violation. Severity maps onto the existing P0/P1/P2 ladder — default P2, escalate when a repo doc endorses it or it harms data flow/testability.
- **Not a third axis**: deliberately folded into the existing Standards axis (Matt Pocock's design warns against axis sprawl). File-level smells (Long Method, Large Class, Long Parameter List, Dead Code) are excluded from the diff-based review baseline and routed to the architecture axis via `module-design.md` vocabulary (shallow module, missing seam).
- **04-review wiring**: `SKILL.md` Core rules step 3 now references the baseline; rule-loading step loads both `code-review.md` and `code-smells.md`; fixed a step-numbering collision.
- **tsc hygiene**: resolved a pre-existing `tsc --noEmit` error in `ce-core-extension.test.ts` (control-flow narrowing of a closure-assigned variable) — `bunx tsc --noEmit` is now clean.
- 204 tests passing, 0 regressions.

### 0.28.0 — absorb mattpocock insights into references (minimalism: no new skills)
- **Minimalism principle**: evaluated mattpocock/skills for grafting as standalone skills, then **reversed** — super-pi's existing 01-brainstorm (brainstorm_dialog + Premise Challenge + ask_user_question) already covers `grilling`; 04-review's architecture axis + module-design.md already covers `improve-codebase-architecture`'s diff-time use. Instead of adding 3 skills, absorbed the genuine deltas into existing `skills/references/` content.
- **`module-design.md` strengthened**: merged `codebase-design` vocabulary — added Relationships section, Rejected framings (Ousterhout depth-as-lines, TS `interface` keyword, "boundary"), internal seams concept, and testability code examples. No dangling refs (Going deeper refs to DEEPENING.md/DESIGN-IT-TWICE.md dropped — those files weren't self-contained).
- **`domain-language.md` strengthened**: ADR section gains a concrete template + "What qualifies" catalog (architectural shape, integration patterns, lock-in tech, boundary decisions, deliberate deviations, invisible constraints, rejected alternatives).
- **`premise-challenge.md` strengthened**: absorbed grilling's interview discipline — facts-vs-decisions (look up facts, ask decisions), one-question-at-a-time, walk the decision tree branch-by-branch with recommended answers, don't act until shared understanding.
- **Not grafted (avoided skill sprawl)**: `grilling` (subset of 01-brainstorm), `domain-modeling` (its active-discipline prose merged into domain-language.md; FORMAT files redundant with context-glossary.md), `improve-codebase-architecture` (project-level periodic task, not pipeline stage — better as a standalone install), `grill-with-docs` (7-line router shell), `codebase-design` (merged into module-design.md).
- 204 tests passing, 0 regressions. Evaluation trail preserved in `docs/reports/super-pi-vs-mattpocock-evaluation.md` + `docs/integrate-mattpocock-skills-plan.md` (both carry 2025-07-30 fact-revision notes).

### 0.27.0 — precision-over-recall review discipline + learn necessity gate
- **Review philosophy** (`rules/common/code-review.md`, `04-review/SKILL.md`): added **Precision Discipline** — favor precision over recall, with 5 gate-keeping rules (verify before asserting, do not duplicate deterministic tools, stay silent when context is unclear, distinguish blocking vs non-blocking, no cargo-cult patterns). Inspired by [alibaba/open-code-review](https://github.com/alibaba/open-code-review)'s battle-tested design.
- **Review checklists** (new file type): `rules/golang/review-checklist.md` and `rules/python/review-checklist.md` hold precise, language-specific defect patterns with explicit "do not report" boundaries. Distinct from `patterns.md` (reusable design patterns). `rules/README.md` updated to document the new file type.
- **Learn necessity gate** (`05-learn/SKILL.md`): added **Necessity gate** as the first decision — most solved problems are NOT worth a solution artifact. Worth-preserving criteria (non-trivial + reusable + not already documented) and disqualifying red lines (one-off, common knowledge, already captured, trivial refactor, no root-cause insight). "Silence is acceptable; noise is not."
- 204 tests passing, 0 regressions.

### 0.26.0 — absorb Matt Pocock skills methodology + external-resource verification gates
- **Skill methodology absorbed**: Evaluated [Matt Pocock skills](https://github.com/mattpocock/skills) against super-pi's self-contained + artifact-driven constraints via a four-filter test (self-contained / artifact-driven / SKILL.md line-budget / testability). Six concepts passed, three deferred (wayfinder, tracer-bullet tickets, triage — all depend on issue trackers).
- **New shared references** (all self-contained, no external path deps):
  - `skills/references/domain-language.md` — `CONTEXT.md` glossary + ADR three-condition threshold + single/multi-context consumption contract.
  - `skills/references/module-design.md` — deep-module vocabulary (module / interface / depth / seam / adapter / leverage / locality) + deletion test + interface-is-test-surface.
- **Debug discipline strengthened** (`03-work/references/debug-discipline.md`, 53→123 lines): full diagnosis loop with 10 feedback-loop construction strategies, Phase 1 completion criterion (red-capable / deterministic / fast / agent-runnable), non-deterministic bug reproduction-rate strategy, minimise step, Phase 6 post-mortem handoff to `05-learn`.
- **Review Spec axis**: `04-review` gains a sixth axis — spec-reviewer persona compares the diff against the originating plan (missing requirements / scope creep / wrong implementation) and traces back to the user's original brainstorm wording to catch directional misunderstandings the plan itself encoded.
- **Out-of-scope knowledge base**: `05-learn` can now record rejected or already-implemented requests to `docs/out-of-scope/`, consumed by `01-brainstorm` and `02-plan` to prevent re-proposing settled work. Template at `skills/05-learn/assets/out-of-scope-template.md`; convention README tracked (static), runtime instances gitignored.
- **External-resource verification gate** (`01-brainstorm/references/premise-challenge.md` rule 5): when the user references an existing resource, reverse-verify intent (incorporate vs already-handled) before scoping. Prevents the failure mode where a misunderstood signal propagates through all pipeline stages and surfaces only at merge.
- **Tests**: 196 → 204 (+8 content-contract tests including a self-contained path scan and SKILL.md line-count guard).
- **gitignore**: `docs/` exclusion refined to `docs/*` + explicit exceptions so static convention docs (out-of-scope/README) are tracked while runtime artifacts stay ignored.

### 0.25.3 — align with pi 0.79–0.80: CONFIG_DIR_NAME, accurate compaction hook docs, peerDep floor
- **pi adaptation**: `readSettings` now uses pi's exported `CONFIG_DIR_NAME` (default `.pi`, user-configurable since pi 0.79.7) instead of hardcoded `.pi` paths, so super-pi reads `settings.json` correctly when the project config directory is customized.
- **Fix (dead code + misleading comments)**: The `compaction-optimizer` previously claimed to hook `session_before_compact` but actually hooked `session_before_tree`. Comments now accurately describe which hook consumes `COMPACTION_FOCUS_INSTRUCTIONS` (`session_before_tree`, whose `customInstructions` return value pi consumes on `/tree` navigation) and why regular context compaction is NOT covered (pi's `SessionBeforeCompactResult` only accepts `cancel` or a full `compaction` replacement — no prompt-only injection field). Removed a no-op `session_before_compact` handler that added `emit()` overhead with zero benefit.
- **Peer dependencies**: Floor raised from `>=0.74.0` to `>=0.79.10` to match the APIs now in use (`CONFIG_DIR_NAME` + `session_before_compact` `reason`/`willRetry`). devDependencies bumped to `^0.80.0`.
- **Docs**: README / README_CN add a project-trust note (pi 0.79+) for first-run approval and `pi --approve` non-interactive runs.
- 196 tests passing, 0 regressions.

### 0.25.2 — ask_user_question option label length guideline
- Add `Tool Usage Constraints` to `rules/common/development-workflow.md`: keep `ask_user_question` option labels under 30 chars to avoid pi TUI `truncateToWidth` clipping.

### 0.25.1 — fix ask_user_question crash: bind fg to this.theme
- **Bug fix**: `AskUserQuestionSelector.render()` extracted `this.theme.fg` as a bare function, losing `this` binding. Calling `fg("accent", ...)` threw `TypeError: Cannot read properties of undefined (reading 'fgColors')`, crashing Pi on `ask_user_question` invoke. Fixed by adding `.bind(this.theme)`.
- 193 tests passing, 0 regressions.

### 0.25.0 — ask_user_question hardening: serialized prompts, option normalization, scrollable TUI, prompt metadata
- **Bug fix (parallel silent failure)**: `ask_user_question` now serializes interactive UI calls via a module-level promise queue (`runAskUserQuestionExclusive`), preventing the Pi singleton-selector race that caused parallel `ask_user_question` calls to silently return `No result provided`. See `docs/bug/ask-user-question-parallel-call-silent-failure.md`.
- **Bug fix (long option truncation)**: Options are normalized to single-line short display labels (`normalizeQuestionOptions`) while the full original option is still returned to the agent. Duplicate labels are disambiguated with `(#n)` suffixes; the `Other` custom sentinel never collides with a user option. See `docs/bug/ask-user-question-long-options-truncated.md`.
- **Feature (scrollable TUI)**: In `tui` mode with `ctx.ui.custom` available, `ask_user_question` now renders a scrollable custom selector (`AskUserQuestionSelector`) that wraps long questions and scrolls long option lists. Falls back to `ctx.ui.select()` otherwise. See `docs/bug/ask-user-question-long-text-not-scrollable.md`.
- **Prompt metadata**: Registered `ask_user_question` with `promptSnippet` and `promptGuidelines` that explicitly warn against parallel calls.
- **Docs**: Updated all four bug statuses; `ceo-review-mode.md` notes one-at-a-time `ask_user_question`.
- 191 tests passing (+12), 0 regressions.

### 0.24.0 — remove built-in subagent tools, adopt pi 0.78.x ctx.mode/streamingBehavior
- **Breaking**: Remove `ce_subagent` and `ce_parallel_subagent` tools and all subagent infrastructure (runner, events, renderer, depth guard, 6 tool modules, 5 test files). Net -3,660 lines.
- **Breaking**: Remove `08-help` skill (README covers the same information). Pipeline skills reduced from 8 to 7.
- **Pi 0.78.x adaptation**: `ctx.mode` replaces `ctx.hasUI` for notification guards; `streamingBehavior === "steer"` skips model/thinking switching during mid-stream interrupts.
- **Documentation**: `03-work` returns to inline-first; all `pi-subagents` references removed from README/README_CN (极简主义).
- **Exports removed**: `createSubagentTool`, `createParallelSubagentTool`, `createJsonRunner`, `checkSubagentDepth`, `getChildDepthEnv`, `DEFAULT_MAX_SUBAGENT_DEPTH`, `AsyncMutex`, `renderSubagentCall`, `renderSubagentResult`, `formatToolCall`, event parser types.

### 0.23.13 — fix parallel subagent inheritSkills default mismatch with ce_subagent
- **Bug fix**: `ce_parallel_subagent` now defaults `inheritSkills` to `true` (matching `ce_subagent` behavior). Previously, omitting `inheritSkills` caused `--no-skills` to be passed to child processes, silently disabling skill inheritance in all parallel subagent tasks.
- Updated tool schema description, interface JSDoc, and test expectations.

### 0.23.12 — adopt context glossary/ADR/debug discipline + tsc fixes + parallel progress
- **Skills (mattpocock/skills)**: `01-brainstorm` optional CONTEXT.md vocabulary, `02-plan` lightweight ADR template, `03-work` feedback-loop-first debug discipline. Zero new skills/tools.
- **Type fixes**: resolve 5 `bunx tsc --noEmit` errors (mode union, onUpdate bridge, pi.cwd, SingleResult import, unknown assertions).
- **Parallel TUI**: progress bar now shows total count (`1/3✓` instead of `1✓`).

### 0.23.11 — compact parallel subagent TUI with progress bar and summary cards
- **Call phase**: show all agents with numbered list instead of folding at 3.
- **Running phase**: live progress bar (█░) with done/running count.
- **Completed collapsed**: one-line summary per agent (icon + name + conclusion).
- **Completed expanded (Ctrl+O)**: full Markdown output per agent.
- **Content text**: compact summary instead of full output dump, reducing LLM context waste.
- 6 new renderer tests. 285 tests passing, 0 regressions.

### 0.23.10 — subagent TUI live status via spawn-based JSON runner
- **New architecture**: `ce_subagent` and `ce_parallel_subagent` now spawn `pi --mode json` child processes with per-process env, replacing `pi.exec()` + global `process.env` mutation.
- **Real-time TUI updates**: tool calls, status icons (⏳/✓/✗), usage stats, and Markdown output rendered live during subagent execution.
- **Collapsed/expanded views**: collapsed shows agent + status + recent tool calls; Ctrl+O expands to full output + usage.
- **Parallel vertical layout**: each `ce_parallel_subagent` task displayed in its own box with per-task status.
- **Concurrency control**: `mapWithConcurrencyLimit` (from pi official example) limits parallel spawns to 4.
- **Shared event model**: `subagent-events.ts` provides `parseJsonEvent`, `applyEventToResult`, `invokeRunner`, `isSingleResult` used by both tools.
- **Per-process env**: no more `AsyncMutex` or `process.env` mutation; env passed via `spawn({ env })` options.
- **Renderer**: `subagent-renderer.ts` with `formatToolCall` (adapted from pi official example) for bash/read/write/edit/ls/find/grep.
- 284 tests passing, 72 new, 0 regressions.

### 0.23.9 — context hygiene rules
- Added shared Phase 1 context hygiene guidance for compacting resolved errors, fetching obvious prerequisites, capping repeated failures, and pruning handoffs before save.
- Added `03-work` recovery guidance to replace resolved stop-the-line traces with `ERROR(resolved): <root cause>` and stop after 3 repeated failures on the same tool, command, or unit.
- Added `humanlayer/12-factor-agents` to Design Philosophy & Acknowledgements as the inspiration source for context hygiene.
- Bumped package version to `0.23.9` for npm publishing and local upgrade detection.
- 212 tests passing, 0 regressions.

### 0.23.8 — constrain CE subagent pipeline-stage delegation
- `ce_subagent` now rejects pipeline-stage skills (`01-brainstorm` through `05-learn`) and tells users to run those stages directly with `/skill:<stage>`.
- `ce_parallel_subagent` applies the same guard before spawning parallel tasks.
- `03-work` is now documented as inline-first, with CE subagents scoped to bounded, non-interactive, easily verifiable leaf tasks.
- README and README_CN clarify that Super Pi is a Pi-native engineering workflow layer, not a general-purpose multi-agent executor.
- 212 tests passing, 0 regressions.

### 0.23.7 — ask_user_question: default allowCustom to true
- `ask_user_question` now defaults `allowCustom` to `true` when `options` are provided, automatically appending an "Other" option that lets users enter custom text.
- Existing callers can opt out by explicitly setting `allowCustom: false`.
- Updated tests to cover the new default behavior and the explicit opt-out path.

### 0.23.5 — Agent-skills micro-patterns: embedded behavioral gates, skill routing, repo hygiene
- **Skill descriptions** — all 8 skills now include "Use when" trigger conditions for accurate automatic skill routing.
- **Source-driven gate** — embedded in 3 locations: `rules/common/development-workflow.md` (rule) + `02-plan` workflow step + `03-work` workflow step. When implementation depends on a framework/library API or version-specific behavior, verify against official docs before implementing.
- **Stop-the-line rule (Hard gate)** — embedded in `03-work` Hard gates section. On unexpected failure: STOP → PRESERVE evidence → DIAGNOSE root cause → FIX → GUARD with regression test → RESUME.
- **Anti-rationalization** — when a gate fails or evidence is missing: do not rationalize, downgrade, or explain away the failure. Stop and report with evidence.
- **Review five-axis baseline** — added to `04-review` reviewer-selection: all reviewers evaluate across correctness, readability, architecture, security, performance.
- **Typo fix** — `performan04-reviewer` → `performance-reviewer`.
- **Repo hygiene** — `docs/` no longer tracked; `bun.lock` untracked.
- Approach B: all changes are edits to existing files, no new skills/tools/commands. ~410 tokens added.
- 209 tests passing, 0 regressions.

### 0.23.4 — Memory Optimization Phase 2: activeRules, context-first skills, handoff lifecycle
- Added `activeRules?: string[]` field to `context_handoff` for preserving 1-5 continuation-critical rules across sessions.
- `activeRules` persisted in state, returned by load/latest/status, rendered in default handoff template.
- Backward compatible: old state files without `activeRules` normalize to `[]`.
- Soft constraint: >5 rules allowed without failure.
- Updated `pipeline-config.md` with "Start of skill: context loading" guidance (handoff-first before broad reads) and "End of skill: save handoff" lifecycle.
- Updated `02-plan`, `03-work`, `04-review` SKILL.md to load handoff as workflow step 1.
- Rewrote `06-next` recommendation logic with context-first priority chain: health → blocker → recommendNewSession → nextStage → mismatch → artifact-count fallback.
- 6 new tests for activeRules (round-trip, template, default, soft constraint, backward compat, custom markdown).
- 209 tests passing, 0 regressions.

### 0.23.3 — Context handoff deterministic validation probes (Route B-lite)
- Added `context_handoff` `operation: "validate"` for deterministic continuation-readiness validation.
- 4 probes: `recall`, `continuation`, `artifact`, `decision`.
- `ok` requires `recall` + `continuation` only; `artifact` / `decision` gaps are warnings.
- Explanatory `checks` array for each probe with name, passed, reason.
- Placeholder filtering: `N/A`, `- N/A`, `Not run` do not count as evidence in markdown or structured state.
- All public output paths normalized to repo-relative.
- Tightened continuation: `verification` / `blocker` alone cannot pass continuation.
- 203 tests passing, 0 regressions.

### 0.23.2 — Context handoff structured runtime-memory anchor
- Added 5 new optional structured fields to `context_handoff`: `currentTruth`, `invalidatedAssumptions`, `openDecisions`, `recentlyAccessedFiles`, `compressionRisk`.
- Persisted new fields in `.context/compound-engineering/context-state.json` for machine-readable runtime state.
- Extended default handoff-lite markdown template with matching sections.
- Added `workflow_state.context` that reads structured state from `context-state.json` with safe defaults.
- Added state normalization layer (`normalizeStateEntry`, `toStringArray`) for backward compatibility with legacy state files.
- Fixed `workflow_state` to filter non-string array entries from context state.
- Updated `pipeline-config.md` handoff-lite template with 5 new sections.
- 191 tests passing, 0 regressions.

### 0.23.1 — SKILL.md size minimization + thinkingStrategy support
- Minimized 8 SKILL.md files from 28KB to 18KB (-35% reduction) by moving detailed rules, templates, and examples to `references/` for on-demand loading.
- Created new reference files:
  - `ce-brainstorm-mode.md` (01-brainstorm): standard CE mode workflow
  - `solution-search.md` (02-plan, 04-review): grep-first strategy for solutions
  - `completion-report.md` (03-work): completion report template
- Expanded existing references:
  - `workflow-sequence.md` (08-help): detailed CE pipeline guide
  - `recommendation-logic.md` (06-next): merged skill-registry
- Added `thinkingStrategy` support for per-skill thinking level control.
- Extended settings loading to support global `~/.pi/agent/settings.json` as fallback when project-level `.pi/settings.json` lacks `modelStrategy`/`thinkingStrategy`.
- Simplified README.md and README_CN.md to essential content.
- Updated `.gitignore` to exclude all `docs/` content except `token-cost-evaluation.md`.

### 0.23.0 — CE extension tool namespace isolation for third-party compatibility
- Renamed `ce-core` subagent tools from `subagent`/`parallel_subagent` to `ce_subagent`/`ce_parallel_subagent` to avoid runtime tool-name conflicts with third-party extensions like `pi-subagents`.
- Updated `03-work` skill documentation and `README.md`/`README_CN.md` to reference the new `ce_`-prefixed tool names.
- Added TDD tests confirming tool names and runtime registration guard (no bare `subagent`/`parallel_subagent`).
- Added README compatibility section documenting coexistence of `ce_subagent`/`ce_parallel_subagent` with generic `pi-subagents`.
- Added `05-learn` solution artifact documenting the three approaches to extension tool overlap: delegation, source integration, and namespace isolation.
- Fixed user-facing error message in `ce_parallel_subagent` to use the correct tool name.

### Unreleased — Workflow simplification and rule loading cleanup
- Merged `08-status` into `06-next`; `06-next` now supports both next-step recommendations and verbose full status reports.
- Removed standalone `10-rules`; `02-plan`, `03-work`, and `04-review` now load project rules directly and share `skills/references/language-detection.md`.
- Renamed `09-help` to `08-help` so skill numbering remains continuous after removing `08-status`.
- Added `rules/common/naming.md` for simple, everyday, low-ambiguity naming conventions.
- Registered `context_handoff` as an official ce-core tool and export.
- Clarified `07-worktree` as an optional isolation utility that requires user confirmation before create/merge/cleanup actions.
- Clarified `subagent` as a low-level utility for valuable dependent serial chains; small work should stay inline and independent work should use `parallel_subagent`.
- Split changelog history from README into `CHANGELOG.md` and `CHANGELOG_CN.md`.

### 0.19.5 — Plan/Work/Review skill rules loading alignment
- Fixed `02-plan` not loading language-specific rules (e.g. `rules/typescript/`) during the planning phase — only `common/` rules were loaded.
- Fixed `03-work` Core rules missing explicit `common/` loading and `web/` conditional loading (10-rules defined them but the skill's own instructions didn't).
- Fixed `04-review` Core rules missing explicit language detection method and `web/` conditional loading.
- Updated all three skills to use a consistent 4-step progressive loading strategy (common → language detect → language rules → web rules).
- Updated `10-rules` SKILL.md Pre-flight to include complete language detection mapping for all three phases.
- Synced `README.md` and `README_CN.md` skill tables to reflect the unified loading strategy.

### 0.19.4 — Read output filter markdown truncation fix
- Fixed `read-output-filter` over-truncating markdown files: raised markdown threshold from 2KB → 8KB.
- Improved `filterMarkdown()` to fully preserve list items (`-`, `*`, numbered) and keep first 3 lines of paragraphs (was 1).
- Filter notice now includes actual file path in actionable guidance (`bash cat <path>`).
- Added 5 new tests covering list preservation, markdown threshold gate, and path-in-notice.
- 175 tests passing.

### 0.19.3 — Terminate fix + runtime model routing + autoContinue removal
- Fixed 6 ce-core tools (`brainstorm_dialog`, `workflow_state`, `review_router`, `session_checkpoint`, `session_history`, `pattern_extractor`) incorrectly returning `terminate: true`, which caused agent turns to end prematurely (brainstorm questions not shown, "type continue to proceed" interruptions).
- Implemented runtime stage model routing via ce-core extension `input` hook: reads `.pi/settings.json` `modelStrategy`, auto-switches model before skill execution. Supports full reference (`anthropic/claude-opus-4-1`) and bare model id (`claude-opus-4-1`).
- Removed `pipeline.autoContinue` configuration (never had runtime implementation; Pi lacks `skill_end` event for auto-continue).
- Updated `skills/references/pipeline-config.md`, `README.md`, `README_CN.md` to reflect runtime model routing behavior.
- Added 4 new tests covering terminate regression, input hook model routing, and bare model id parsing.

### 0.19.2 — Evidence-first handoff-lite + docs tracking rule
- Added `context_handoff` with evidence-first default handoff-lite generation when markdown is omitted.
- Standardized the shared handoff-lite template across 01-05 workflow handoffs via `skills/references/pipeline-config.md`.
- Added tests protecting default handoff generation and the shared handoff docs contract.
- Updated docs tracking so Git only uploads `docs/token-cost-evaluation.md` while other `docs/` artifacts stay local.

### 0.19.1 — Pipeline config + typecheck baseline fix
- Added shared pipeline config (`skills/references/pipeline-config.md`) for stage model routing via `.pi/settings.json`.
- Added runtime stage model routing via ce-core extension `input` hook (reads `modelStrategy` from `.pi/settings.json`, auto-switches model before skill execution).
- Fixed TypeScript baseline issues so `bunx tsc --noEmit` passes.

### 0.19.0 — 0.69.0 alignment + learn rename
- TypeBox migration: `@sinclair/typebox` → `typebox` (zero old-path imports)
- Peer/dev dependency upgrade: pi-coding-agent `0.67.6` → `0.69.0`
- Tool termination: 6 pure-query tools now return `terminate: true` to reduce unnecessary LLM rounds
- Skill rename: `05-compound` → `05-learn` for clarity

### 0.18.0 — Progressive rules
- Built-in `rules/` directory with 13 language layers + common + web (78 Markdown files)
- New `10-rules` skill: progressive on-demand loading, zero waste
- `02-plan`, `03-work`, `04-review` auto-trigger rule loading at entry points
- Users can add/remove languages and edit rules freely — plain Markdown, no config
- 10 skills, 15 tools, 162 tests passing

### 0.17.0 — Subagent safety
- Recursion depth guard (`PI_SUBAGENT_DEPTH` / `PI_SUBAGENT_MAX_DEPTH`) prevents runaway nesting
- Async mutex for `process.env` concurrency safety during parallel subagent execution
- Context slimming: `inheritSkills` parameter, parallel workers default to slim context (`--no-skills`)
- Shared `createSubagentRunner` factory (deduped runner closures)
- 162 tests passing

### 0.16.0 — Context optimization
- Read output filter: structural compression for large code files, lock files, markdown
- Compaction optimizer: focused summary instructions for session compaction
- Bash output filter improvements

### 0.15.0 — Output filtering
- Bash output filter: smart truncation by command type (install, test, build)
- Read output filter: preserves structure while cutting verbosity

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
