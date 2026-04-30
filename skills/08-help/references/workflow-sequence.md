# Workflow Sequence

## Full CE pipeline

1. `01-brainstorm` → clarify the problem
2. `02-plan` → break into units (optionally + CEO Review / Strict Review)
3. `03-work` → execute the plan
4. `04-review` → inspect changes (optionally + Browser QA / QA + Regression Tests)
5. `05-learn` → save key learnings

Use `06-next` at any point to see where you are and what to do next.
Use `07-worktree` for isolated feature development on a separate branch.

---

## Phase 1 skill guide

### 01-brainstorm
**Use when:** request is ambiguous, needs requirements discovery, or user has a new idea.

**Three modes:**
- **CE Brainstorm** — standard requirements discovery for feature additions
- **Startup Diagnostic** — YC-style forcing questions for founders/intrapreneurs
- **Builder Mode** — generative brainstorming for side projects/hackathons/learning

**Key outputs:**
- Requirements document in `docs/brainstorms/`
- Explicit user approval before handoff

### 02-plan
**Use when:** requirements are clear enough to turn into implementation units.

**Optional reviews after planning:**
- **CEO Review** — challenge premises, check dream-state alignment
- **Strict Review** — CEO Review + error maps, failure modes, test diagrams

**Key outputs:**
- Plan artifact in `docs/plans/`
- Implementation units following TDD RED→GREEN→REFACTOR

### 03-work
**Use when:** plan is ready or task is tightly scoped.

**Execution modes:**
- Inline execution for small units
- `ce_parallel_subagent` for independent CE skill units
- `ce_subagent` only for dependent serial chains

**Key outputs:**
- Completion report with verification evidence
- Checkpoint state for resume

### 04-review
**Use when:** after code changes to produce structured findings.

**Optional extensions:**
- **Browser QA** — find visual/functional bugs with agent-browser
- **Browser QA + Regression Tests** — also generate automated coverage

**Key outputs:**
- Structured findings per `references/findings-schema.md`
- Optional QA report with fix commits

### 05-learn
**Use when:** after solving a problem to capture reusable learning.

**Key outputs:**
- Solution artifact in `docs/solutions/` or global `~/.pi/agent/docs/solutions/`
- Handoff-lite for workflow closure

### 06-next
**Use when:** user wants to know what to run next, or wants full status.

**Two modes:**
- **Default** — recommend one next step with reason
- **Verbose** (`--verbose` or "show status") — full artifact details + recent history

### 07-worktree
**Use when:** need isolated git worktree development.

**Use for:** large, risky, or parallel feature work.

**Flow:** create → execute via 03-work → merge → cleanup

---

## Skill routing decision tree

```
Is the request clear and specific?
├── No → 01-brainstorm (clarify requirements)
└── Yes → Is there a plan?
    ├── No → 02-plan (create implementation units)
    └── Yes → Is work complete?
        ├── No → 03-work (execute)
        └── Yes → Has it been reviewed?
            ├── No → 04-review (structured findings)
            └── Yes → Is there a learning worth capturing?
                ├── Yes → 05-learn
                └── No → Check status with 06-next
```

---

## Output format for help responses

When explaining skills to users, keep it concise:

**Short form** (one skill recommendation):
```
Next step: `/skill:02-plan`

Reason: You have a clear idea. Let's turn it into implementation units.
```

**Medium form** (context + recommendation):
```
Status: Requirements captured in docs/brainstorms/2024-01-idea.md

Next step: `/skill:02-plan`

Why: Requirements exist but no implementation plan yet.
```

**Verbose form** (full sequence):
```
Workflow sequence:
1. ✅ Brainstorm: requirements captured
2. ⏳ Plan: ready to create
3. ⏸ Work: waiting for plan
4. ⏸ Review: waiting for work
5. ⏸ Learn: waiting for review

Recommended: `/skill:02-plan` to turn requirements into implementation units.
```
