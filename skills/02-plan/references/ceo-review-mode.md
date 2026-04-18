# CEO Review Mode

After the plan is produced, offer the user an optional CEO-style review. This adds strategic depth without changing the core planning flow.

## When to offer

After the plan artifact is written to `docs/plans/`, ask the user:

> Plan ready. How do you want to review it?
>
> - **Just go** — trust the plan, skip review (existing behavior)
> - **CEO Review** — challenge premises, check for better alternatives, dream-state mapping
> - **Strict Review** — full CEO Review plus error maps, failure modes, test diagrams

If the user picks "Just go", proceed directly to the `03-work` handoff.

## CEO Review steps

### 1. Premise Challenge

Re-examine the plan's assumptions:
- Is this the right problem to solve? Could a different framing yield a simpler solution?
- What is the actual user/business outcome? Is the plan the most direct path?
- What happens if we do nothing? Real pain or hypothetical?

Present findings as premises the user must agree with. Use `ask_user_question` for each.

### 2. Dream State Mapping

Describe the ideal end state 12 months from now. Does this plan move toward it?

```
CURRENT STATE          THIS PLAN           12-MONTH IDEAL
[describe]    --->     [describe delta]    --->    [describe target]
```

### 3. Implementation Alternatives (MANDATORY)

Produce 2-3 distinct approaches. This is NOT optional.

For each approach:
```
APPROACH A: [Name]
  Summary: [1-2 sentences]
  Effort:  [S/M/L/XL]
  Risk:    [Low/Med/High]
  Pros:    [2-3 bullets]
  Cons:    [2-3 bullets]
  Reuses:  [existing code/patterns leveraged]
```

Rules:
- At least 2 approaches required.
- One must be "minimal viable" (fewest files, smallest diff).
- One must be "ideal architecture" (best long-term trajectory).
- Recommend one and explain why.

### 4. Temporal Interrogation

Think ahead to implementation. What decisions should be resolved NOW?

```
HOUR 1 (foundations):     What does the implementer need to know?
HOUR 2-3 (core logic):   What ambiguities will they hit?
HOUR 4-5 (integration):  What will surprise them?
HOUR 6+ (polish/tests):  What will they wish they'd planned for?
```

Surface these as questions NOW, not "figure it out later."

## Strict Review additions

If the user chose "Strict Review", add these on top of CEO Review:

### 5. Error and Rescue Map

For every new method/codepath that can fail:

```
METHOD/CODEPATH    | WHAT CAN GO WRONG     | EXCEPTION CLASS
-------------------|-----------------------|-----------------
ExampleService#call| API timeout           | TimeoutError
                   | Malformed response    | JSONParseError

EXCEPTION CLASS    | RESCUED? | RESCUE ACTION      | USER SEES
-------------------|----------|--------------------|------------------
TimeoutError       | Y        | Retry 2x, then raise | "Temporarily unavailable"
JSONParseError     | N (GAP)  | -                    | 500 error (BAD)
```

### 6. Failure Modes Registry

```
CODEPATH | FAILURE MODE   | RESCUED? | TEST? | USER SEES?  | LOGGED?
---------|----------------|----------|-------|-------------|--------
```

Any row with RESCUED=N, TEST=N, USER SEES=Silent is a **CRITICAL GAP**.

### 7. Test Diagram

Map every new thing the plan introduces:
- New UX flows
- New data flows
- New codepaths
- New error/rescue paths

For each: what test covers it? Happy path? Failure path? Edge case?

## Cognitive patterns

These shape your perspective throughout the review. Don't enumerate them; internalize them:

1. **Classification instinct** — categorize by reversibility x magnitude (Bezos)
2. **Inversion reflex** — for every "how do we win?" also ask "what would make us fail?" (Munger)
3. **Focus as subtraction** — primary value-add is what to NOT do (Jobs)
4. **Speed calibration** — fast is default. Only slow down for irreversible + high-magnitude (Bezos)
5. **Proxy skepticism** — are our metrics still serving users? (Bezos Day 1)
6. **Temporal depth** — think in 5-10 year arcs, regret minimization (Bezos)
7. **Courage accumulation** — confidence comes FROM making hard decisions, not before (Horowitz)
8. **Leverage obsession** — find inputs where small effort creates massive output (Altman)
9. **Edge case paranoia** — what if the name is 47 chars? Zero results? Network fails?
10. **Subtraction default** — "as little design as possible" (Rams)

## Handoff

After CEO/Strict Review:
1. Update the plan artifact with any changes the user approved.
2. Note the review mode and key decisions in the plan.
3. Proceed to the `03-work` handoff via `references/handoff.md`.
