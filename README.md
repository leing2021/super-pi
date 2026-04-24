# Super Pi

**Turn your AI coding agent from "a tool that writes code" into "a reliable engineer."**

Install it, tell Pi what you want to build, then keep saying **"continue"**.
Super Pi guides the default loop:

**think → plan → build → review → compound learnings**

```bash
pi install npm:@leing2021/super-pi
```

---

## What Super Pi does

Bare AI coding agents usually fail in three ways:

1. build before clarifying
2. lose progress after interruption
3. repeat the same mistakes across sessions

Super Pi adds a workflow around those failures:

- **01-brainstorm** — clarify what should be built
- **02-plan** — turn it into implementation units
- **03-work** — execute in a controlled way
- **04-review** — review changes and catch risks
- **05-learn** — save reusable learnings

If you are unsure where you are or what to do next, use **`08-status`**.

---

## Default workflow

```text
01-brainstorm → 02-plan → 03-work → 04-review → 05-learn
```

### Main skills

| Skill | Use it for |
|------|------------|
| `01-brainstorm` | ambiguous requests, new ideas, feature design |
| `02-plan` | turning approved requirements into execution units |
| `03-work` | implementing the plan |
| `04-review` | reviewing code and optional QA |
| `05-learn` | capturing durable learnings |

### Status / helper entry points

| Skill | Role |
|------|------|
| `08-status` | default status + next-step entry |
| `06-next` | compatibility alias for next-step guidance |
| `09-help` | auxiliary usage/documentation helper |
| `07-worktree` | advanced optional path for isolated development |
| `10-rules` | progressive coding rule loading |

---

## Shortest path

### New idea

```text
You: I want to build X
→ 01-brainstorm
You: continue
→ 02-plan
You: continue
→ 03-work
→ 04-review
→ 05-learn
```

### Adding a feature to an existing project

```text
You: I want to add feature X
→ 01-brainstorm
→ 02-plan
→ 03-work
→ 04-review
→ 05-learn
```

### Check progress anytime

```text
You: /skill:08-status
→ shows current workflow state + recommends the single best next step
```

---

## Notes

- `08-status` is the default answer to “where am I?” and “what should I do next?”
- `07-worktree` is **not** part of the default path; use it only when isolation is worth the extra complexity
- `09-help` is documentation-oriented, not a primary workflow step
- `06-next` remains only as a compatibility entry

---

## Where files go

```text
your-project/
├── docs/
│   ├── brainstorms/
│   ├── plans/
│   └── solutions/
└── .context/
    └── compound-engineering/
        ├── checkpoints/
        ├── dialogs/
        └── history/
```

---

## More docs

- Token cost: `docs/token-cost-evaluation.md`
- Plans and reports: `docs/plans/`, `docs/reports/`
- Solutions / learnings: `docs/solutions/`
- Rules: `rules/`

---

## Repository

- **GitHub**: https://github.com/leing2021/super-pi
- **npm**: https://www.npmjs.com/package/@leing2021/super-pi

## Development

```bash
bun test
npm publish --dry-run
```
