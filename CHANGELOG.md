# Changelog

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
