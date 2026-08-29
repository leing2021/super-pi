---
name: 03-work
description: "Execute plan units with TDD enforcement and checkpoint resume. Use when a plan path is ready for implementation."
---

# Work

Use this skill when there is a plan path or tightly scoped bare prompt ready for execution.

See [shared pipeline instructions](../references/pipeline-config.md) for model routing and pipeline behavior.

## Core rules

1. Load project rules before writing any code: detect language via repo markers (map in Workflow step 2), then load `rules/common/development-workflow.md`, `rules/common/testing.md`, matching `rules/{lang}/` files, plus `rules/web/` for frontend/browser concerns. Emit a `Rules loaded:` manifest — **no manifest, no implementation**
2. **Priority:** project-level `{repo-root}/rules/` overrides package defaults
3. **Distinguish input:** plan path vs bare prompt
4. Derive tasks from plan **implementation units**
5. **Execution mode:** **inline mode** — all plan units execute inline in the current session. No built-in subagent tools.
6. Use **`session_checkpoint`** to track progress and enable resume
7. Use **`task_splitter`** to analyze dependencies before execution
8. If in **worktree** (via `07-worktree`), execute inside it
9. End by recommending `04-review`
10. When designing/restructuring modules, use the deep-module vocabulary (`../references/module-design.md`) — evaluate depth and seam placement.

> **Advanced:** If you need external child agent delegation (background runs, parallel audits), install `pi-subagents` separately. Super Pi does not require it.

## Hard gates — TDD enforcement

Every step follows **RED → GREEN → REFACTOR**:

**Blocking violations** — stop and ask if:
- Code written before RED test
- RED fails for wrong reason
- Missing evidence test failed before implementation
- Missing evidence test passed after implementation
- Tests added only after code

## Stop-the-line rule (Hard gate)

When any unexpected failure occurs during execution:

1. **STOP** adding features or making changes
2. **PRESERVE** evidence (error output, repro steps)
3. **DIAGNOSE** root cause — follow debug discipline (`references/debug-discipline.md`): build feedback loop first, then reproduce → hypothesise → instrument → fix
4. **FIX** the root cause, not the symptom
5. **GUARD** with a regression test
6. **RESUME** only after verification passes

Anti-rationalization — when a gate fails or evidence is missing:
- Do not rationalize, downgrade, or explain away the failure.
- Stop, report the blocker with evidence, and either fix the root cause or ask for direction.
- Do not continue unrelated implementation after failed verification.

Common rationalizations and their reality:

| Excuse | Reality |
|--------|---------|
| "Close enough — the gate almost passed" | A failed gate means not done. Fix it or stop and report; those are the only exits. |
| "One more retry will converge" | Past the 3-failure cap, retries do not converge — the failure is structural. Ask for direction. |
| "The fix is tiny, skip re-verification" | Unverified fixes are how regressions land. Every fix ends with verification. |
| "This failure is a special case" | No evidence, no exception. Treat it like every other failure. |

This is a hard gate — do not push past a failing test or broken build to continue implementation. Errors compound.

## Error compaction after recovery

After a stop-the-line failure is diagnosed, fixed, and verified:

1. Replace full traces in handoff/context with `ERROR(resolved): <root cause>`
2. Keep only the final repro, root cause, fix summary, and verification result
3. Remove intermediate debug output and failed exploratory runs that are no longer relevant
4. Update `session_checkpoint` with the compacted state only

If the same tool, command, or implementation unit fails 3 consecutive times, stop retrying and ask the user for direction with a concise evidence summary.

## Workflow

1. **Load context**: consume latest handoff before any broad file reads — `context_handoff load` or read `.context/compound-engineering/handoffs/latest.md`. If found, use `activeFiles`, `blocker`, `verification`, `activeRules` as starting point; `activeRules` may already list loaded rules — verify against the repo, do not blindly trust. If not found, proceed normally. Read `CONTEXT.md` if it exists at root — see `../references/domain-language.md`.
2. **Load project rules** (blocking — no implementation before this completes):
   - Detect language: `tsconfig.json`/`package.json`→typescript, `Cargo.toml`→rust, `go.mod`→golang, `pyproject.toml`/`requirements.txt`→python, `pom.xml`/`build.gradle(.kts)`→java/kotlin; others in [language detection](../references/language-detection.md)
   - Check `{repo-root}/rules/` first (overrides package defaults); then load `rules/common/development-workflow.md`, `rules/common/testing.md`, matching `rules/{lang}/` files, `rules/web/` only for frontend/browser concerns
   - Emit manifest before any code: `Rules loaded: language=<lang> (via <marker>), common=<files>, lang=<files>, web=<files or N/A>`
   - **Same-session re-entry:** if the transcript already contains a `Rules loaded:` manifest for the same language, do not re-read the rule files — reuse them, cite the earlier manifest, and note the skip
3. Detect input type (plan path vs bare prompt)
4. Read implementation units if plan path
5. Load `session_checkpoint` to skip completed units
6. Use `task_splitter` for dependency analysis
7. Execute: **inline mode** — all units run in the current session
8. Follow TDD per unit: RED → minimal code → GREEN → refactor → unit-level **verification**
9. **Source-driven gate:** Before implementing framework/library-specific code, verify the API or pattern against official documentation. Flag unverified patterns as UNVERIFIED in output.
10. Record progress via `references/progress-update-format.md`
11. Save `session_checkpoint` after each unit
12. On failure: `session_checkpoint` `fail` → `retry` → follow strategy
13. Provide completion report (see `references/completion-report.md`) — include the `Rules applied` section
14. **Save handoff**: `context_handoff save` with current stage, next stage, activeFiles, blocker, verification, activeRules (carry loaded rules in `activeRules`)
15. Handoff to `04-review` using `references/handoff.md`

Before finishing this skill, apply the completion checklist in [shared pipeline instructions](../references/pipeline-config.md).
