---
name: 03-work
description: "Execute plan units with TDD enforcement and checkpoint resume. Use when a plan path is ready for implementation."
---

# Work

Use this skill when there is a plan path or tightly scoped bare prompt ready for execution.

See [shared pipeline instructions](../references/pipeline-config.md) for model routing and pipeline behavior.

## Core rules

1. Load project rules (4 steps):
   - Load `rules/common/development-workflow.md` and `rules/common/testing.md`
   - Detect project language via [language detection](../references/language-detection.md)
   - Load matching language-specific rules
   - If frontend/browser concerns, also load `rules/web/` files
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

1. **Load context**: consume latest handoff before any broad file reads — `context_handoff load` or read `.context/compound-engineering/handoffs/latest.md`. If found, use `activeFiles`, `blocker`, `verification`, `activeRules` as starting point. If not found, proceed normally. Read `CONTEXT.md` if it exists at root — see `../references/domain-language.md`.
2. Detect input type (plan path vs bare prompt)
3. Read implementation units if plan path
4. Load `session_checkpoint` to skip completed units
5. Use `task_splitter` for dependency analysis
6. Execute: **inline mode** — all units run in the current session
7. Follow TDD per unit: RED → minimal code → GREEN → refactor → unit-level **verification**
8. **Source-driven gate:** Before implementing framework/library-specific code, verify the API or pattern against official documentation. Flag unverified patterns as UNVERIFIED in output.
9. Record progress via `references/progress-update-format.md`
9. Save `session_checkpoint` after each unit
10. On failure: `session_checkpoint` `fail` → `retry` → follow strategy
11. Provide completion report (see `references/completion-report.md`)
12. **Save handoff**: `context_handoff save` with current stage, next stage, activeFiles, blocker, verification, activeRules
13. Handoff to `04-review` using `references/handoff.md`

Before finishing this skill, apply the completion checklist in [shared pipeline instructions](../references/pipeline-config.md).
