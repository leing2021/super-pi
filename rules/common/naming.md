# Naming Convention

> One rule: **use simple, everyday, low-ambiguity words. Avoid jargon, avoid vagueness.**

---

## Word Selection Priority

When naming anything — variables, types, states, API fields, database columns, queues, errors — follow this order:

| Priority | Strategy | Why |
|----------|----------|-----|
| 1 | Pick an everyday word first | Short, direct, anyone can understand |
| 2 | Check it's not vague | `good`, `ready`, `ok`, `normal` are too ambiguous |
| 3 | Check cross-role clarity | Engineers, reviewers, operators, auditors all understand it |
| 4 | Use a technical term only when precision demands it | Last resort |

**In short: clarity first, stability second, terminology last.**

---

## Recommended vs. Avoid

### ✅ Prefer — short, direct, unambiguous

```
Revise     Blocked     Reject     Approve
Queue      Escalate    Notify     Cancel
reason     owner       action     next_fix
recheck_when
```

### ❌ Avoid — too vague

```
good    ready    ok    normal    done
```

Simple but not specific enough for system fields.

### ❌ Avoid — too technical / abstract

```
orchestration_resolution_state
deferred_adjudication_mode
remediation_projection
resolution_artifact
operationalized_exception_payload
```

May be precise, but poor for cross-role collaboration and audit replay.

### ❌ Avoid — too decorative / emotional

System fields must be stable. Don't use literary, emotional, or decorative names.

---

## Style by Context

| Context | Style | Example |
|---------|-------|---------|
| File names | kebab-case | `task-orchestrator.ts` |
| Type names | PascalCase | `TaskEnvelope` |
| Zod/TypeBox schema variables | PascalCase + `Schema` suffix | `TaskEnvelopeSchema` |
| Function names | camelCase | `evaluatePolicy` |
| Exported constants | camelCase | `stateTransitions`, `finalStates` |
| Database table names | snake_case | `task_records` |
| Database column names | snake_case | `state_version` |
| Environment variables | UPPER_SNAKE_CASE | `DATABASE_URL` |
| Package names | scoped kebab-case | `@org/types` |
| State / enum values | lowercase everyday words, snake_case for multi-word | `created`, `executing`, `result_ready` |
| Error classes | `*Error` (never `*Exception`) | `BudgetExhaustedError` |
| Queue names | semantic, kebab-case | `'task-execution'` (not `'execution_requested'`) |
| API routes | kebab-case, plural nouns | `/api/tasks`, `/api/audit-events` |

---

## Naming by Role

### Public states — conversational

```
Revise    Blocked    Reject    Approved
Pending   Executing  Committed  Cancelled
```

### Governance actions — direct verbs

```
Notify    Approve    Queue     Escalate
Pause     Resume     Discard   Delegate
```

### Supporting fields — read like speech

```
next_fix       → what to fix next
recheck_when   → when to re-check
reason         → why
owner          → who's responsible
action         → what to do
```

---

## Two-Layer Naming

When a name needs different expressions in schema vs. UI:

| Layer | Strategy | Example |
|-------|----------|---------|
| Schema / code / database | More stable, precise | `state: 'revise_requested'` |
| UI / audit log / replay | More human-readable | "Revision needed" |

Connect the two layers with a mapping table. Don't define semantics twice.

---

## Self-Check Checklist

For every name, confirm:

```
□ Can you understand it in 5 seconds?
□ Will different roles (engineer, reviewer, operator, auditor) interpret it the same way?
□ Is it readable in audit replay / logs?
□ Is it NOT a vague word (good/ok/ready/normal)?
□ Is it NOT over-technical jargon?
□ Does it follow the style rules above (case, separator)?
□ Is it consistent with existing names in the same domain?
```

If any answer is "no" → pick a different word and re-check.

---

## Common Anti-Patterns & Fixes

| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| `status: 'good'` | Too vague | `status: 'passed'` |
| `state: 'orchestration_pending_resolution'` | Too technical | `state: 'waiting_approval'` |
| `action: 'the_moon_is_rising_retry'` | Too decorative | `action: 'retry'` |
| `flag: 'ok'` | Too vague | `flag: 'valid'` |
| `type: 'thing'` | Too generic | Use a concrete domain word |
| `err: SomethingException(...)` | Wrong convention | `err: SomethingError(...)` |
| `QUEUE = 'exec_req'` | Unclear abbreviation | `QUEUE = 'task-execution'` |

---

## One-Sentence Rule

> **Default to simple, conversational, low-ambiguity everyday words. If that creates ambiguity, keep the schema term stable and the UI / audit wording more human.**
