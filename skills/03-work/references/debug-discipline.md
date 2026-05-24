# Debug Discipline

When stop-the-line triggers, follow this order. Skip phases only when explicitly justified.

## Phase 1 — Build a feedback loop

**This is the skill. Everything else is mechanical.**

If you have a fast, deterministic, agent-runnable pass/fail signal, you will find the cause.
If you don't, no amount of staring at code will save you. Spend disproportionate effort here.

### Strategies (try in order)

1. **Failing test** at the seam closest to the bug
2. **CLI invocation** with fixture input, diff against known-good output
3. **Curl/HTTP script** against running dev server
4. **Throwaway harness** — minimal subset exercising the bug path
5. **Bisection** — `git bisect run` between known-good and known-bad states

### Iterate on the loop itself

- Faster? (Skip unrelated setup, narrow scope)
- Sharper signal? (Assert the specific symptom, not "didn't crash")
- More deterministic? (Pin time, seed RNG, isolate filesystem)

A 2-second deterministic loop is a debugging superpower.
A 30-second flaky loop is barely better than no loop.

## Phase 2 — Reproduce

Confirm the loop produces the **user-described** failure, not a different nearby failure.

## Phase 3 — Hypothesise

Generate 3-5 ranked hypotheses. Each must be falsifiable:

> "If <X> is the cause, then <Y> will make the bug disappear."

Show the ranked list to the user before testing. They often have domain knowledge
that re-ranks instantly.

## Phase 4 — Instrument

One probe per hypothesis. Change one variable at a time.

Tag debug logs with unique prefixes (e.g. `[DEBUG-a4f2]`) so cleanup is a single grep.

## Phase 5 — Fix + regression test

Write regression test BEFORE the fix — but only if a correct seam exists.
If no correct seam exists, that itself is the finding. Note it.

After fix: remove all debug instrumentation (grep for tags).
