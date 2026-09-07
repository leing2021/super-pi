# Super Pi Token Cost Evaluation

> Evaluated: 2026-06-08
> Version baseline: 0.24.0 (17 skills, 22 tools, 78 rule files)

## Summary

New-conversation fixed cost: **~4,130 tokens**, or **2.1%** of Claude Sonnet 4 (200K). A single Bash output filter pays for itself.

Down from ~4,350 tokens in v0.23.13, mainly due to removing `ce_subagent` and `ce_parallel_subagent` (net -3,660 lines). Skill and rule counts unchanged.

---

## 1. Fixed Cost Breakdown (per new conversation)

### Skill Registration (17 skills)

| Source | Count | Notes |
|--------|-------|-------|
| Pipeline skills | 7 | 01-brainstorm through 07-worktree |
| Global skills | 9 | agent-browser, caveman, cli-tool, context7, git, handoff, html-write, skill-write, playwright |
| Project-local skill | 1 | github-commit-super-pi |
| External npm skill | 1 | super-cli |
| **Total** | **18** | |

| Item | Tokens |
|------|--------|
| 17 skill descriptions | ~870 |
| 17 skill names | ~41 |
| 17 location paths | ~300 |
| 17 XML tag wrappers | ~350 |
| Wrapper + separator + envelope overhead | ~149 |
| **Subtotal** | **~1,710** |

### Tool Registration (22 tools)

| Source | Count | Notes |
|--------|-------|-------|
| CE extension tools | 12 | artifact_helper, ask_user_question, workflow_state, worktree_manager, review_router, session_checkpoint, task_splitter, brainstorm_dialog, plan_diff, session_history, pattern_extractor, context_handoff |
| Pi built-in tools | 10 | read, bash, edit, write, generate_image, sandbox_exec, search, web_search, web_fetch, research_search |
| **Total** | **22** | |

| Item | Tokens |
|------|--------|
| 22 tool descriptions | ~920 |
| 82 parameter descriptions | ~990 |
| JSON Schema structural overhead | ~350 |
| Parameter names | ~165 |
| Tool name + label | ~96 |
| **Subtotal** | **~2,421** |

### Hooks / Filters

| Item | Tokens | Notes |
|------|--------|-------|
| bash-output-filter | 0 | Runtime interception |
| read-output-filter | 0 | Runtime interception |
| compaction-optimizer | 0 | session_before_tree hook |
| input stage-routing (model/thinking) + streamingBehavior guard | 0 | Auto-switch per pipeline stage; skip during mid-stream interrupts |
| **Subtotal** | **0** | |

### Total Fixed Cost

```
Skills      ~1,710
Tools       ~2,421
Hooks           ~0
────────────────
Total       ~4,131 tokens
```

### Context Usage by Model

| Model | Context Length | Usage |
|-------|---------------|-------|
| Claude Sonnet 4 | 200,000 | 2.101% |
| Claude Opus 4 | 200,000 | 2.101% |
| GPT-4o | 128,000 | 3.283% |
| Gemini 2.5 Pro | 1,048,576 | 0.401% |

---

## 2. Runtime On-Demand Loading (not counted in fixed cost)

| Scenario | Tokens |
|----------|--------|
| Full SKILL.md load (all 7 pipeline skills, ~20 KB) | ~5,000 |
| Typical single skill invocation | ~300–1,200 |
| Rules minimum (common, 2 files, ~2.9 KB) | ~750 |
| Rules + language layer (common + TypeScript, 7 files, ~10 KB) | ~2,700 |
| Rules full load (78 files, extreme, never happens) | ~36,000 |

> **v0.24.0 change**: `03-work` reverted to inline-first strategy (no subagent references). SKILL.md is more compact. Subagent functionality moved to external extension `pi-subagents`.

---

## 3. Token Savings (vs bare Pi)

| Mechanism | Typical Savings |
|-----------|----------------|
| Bash output filtering | 2,000–40,000 tokens / invocation |
| Read output filtering | 1,000–10,000 tokens / invocation |
| Rework avoidance (TDD gate) | 5,000–50,000 tokens / invocation |
| Compaction optimization | ~30% summary quality improvement per compression |
| Pipeline stage model routing | Auto-switch to cheaper models for lightweight stages |
| streamingBehavior guard | Skip model/thinking level switch during mid-stream interrupts |

---

## 4. Comparison

| Dimension | Bare Pi | + Global Rules | + super-pi |
|-----------|---------|---------------|------------|
| Rule loading | None | Full injection | Progressive on-demand |
| Output filtering | None | None | Auto-compression |
| TDD gating | By prompt | By prompt | Structured hard gate |
| New-conversation fixed cost | 0 | ~5,000–36,000 | ~4,130 |
| Skill auto-routing | None | None | Trigger words + stage model switching |
| Long-term ROI | Baseline | Depends on rule quality | **10x+** |

---

## 5. v0.23.13 → v0.24.0 Changelog

| Dimension | v0.23.13 | v0.24.0 | Change |
|-----------|----------|---------|--------|
| Skills | 18 | 17 | -08-help |
| CE Tools | 14 | 12 | -ce_subagent, -ce_parallel_subagent |
| Pi Built-in Tools | 10 | 10 | Unchanged |
| Total Tools | 24 | 22 | -2 |
| Rules | 78 | 78 | Unchanged |
| Hooks | 5 | 4 | Merged into input stage-routing + streamingBehavior |
| Fixed cost | ~4,345 | ~4,131 | -214 (-4.9%) |
| SKILL.md per invocation | ~300–1,200 | ~300–1,200 | Unchanged |
| Subagent architecture | Built-in (2 tools + runner/renderer/events) | Removed, external pi-subagents | -3,660 lines |
| Pi API adaptation | ctx.hasUI | ctx.mode + streamingBehavior | pi 0.78.x |

---

### Historical Comparison

| Dimension | v0.18.0 | v0.23.13 | v0.24.0 |
|-----------|---------|----------|---------|
| Skills (scope) | 10 (super-pi only) | 18 (all) | 17 |
| CE Tools | 13 | 14 | 12 |
| Total Tools | 13 | 24 | 22 |
| Fixed cost | ~2,500 | ~4,345 | ~4,131 |
| SKILL.md per invocation | ~1,000–4,000 | ~300–1,200 | ~300–1,200 |
| Stage model routing | None | input hook | input hook + streamingBehavior guard |

---

## 6. Strengths

### 1. Exceptional ROI

Fixed investment of ~4,130 tokens per conversation. A single Bash output filter saves 2,000–40,000 tokens. One TDD gate that prevents rework saves 5,000–50,000 tokens. ROI > 10x — the first `npm install` filter pays for everything.

### 2. Hooks are "Free Superpowers"

bash-output-filter, read-output-filter, compaction-optimizer, and input stage-routing are all runtime/event-driven with zero system prompt footprint. They compress tool output at return time — the longer the output, the more they save. The input hook auto-adjusts model and thinking level on pipeline stage transitions, transparent to the agent. v0.24.0 adds `streamingBehavior` guard to skip switching during mid-stream interrupts.

### 3. Progressive Loading = Zero Waste

78 rule files (~36K tokens) are never fully loaded. A typical workflow reads only 2–7 rule files (~750–2,700 tokens), saving 90%+ vs any global-injection approach.

SKILL.md is similarly lean: shared instructions extracted to `pipeline-config.md`, per-skill files compressed from ~1,000–4,000 to ~300–1,200 tokens. All 7 pipeline skills total only ~20 KB.

### 4. Layered Decoupling of Rules and Code

- `rules/` — pure Markdown, user-editable (78 files, 14 language layers)
- `skills/` — behavioral strategies (7 pipeline stages + shared references)
- `extensions/ce-core/` — capability units (12 tools + 4 hooks)
- All three evolve independently without cross-contamination

### 5. Defensive Design Reduces Token Waste

- **TDD hard gate**: intercepts "write code first, add tests later" impulse at plan stage, preventing full-unit rework
- **Checkpoint resume**: interrupted recovery skips completed units, saving all pre-checkpoint tokens
- **plan_diff incremental updates**: requirement changes patch the diff, not rewrite the entire plan
- **Solution retrieval**: grep-first strategy reads only frontmatter (first 15 lines), never loads all solution files
- **Stage model routing**: lightweight stages (brainstorm/learn) auto-use cheaper models, heavy stages (work/review) auto-switch to stronger models
- **Externalized subagents**: v0.24.0 removes built-in subagent tools to optional external extension `pi-subagents`; projects that don't use subagents no longer bear their fixed token cost
