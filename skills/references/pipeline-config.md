# Shared pipeline instructions

Use these rules in all Phase 1 skills: `01-brainstorm` → `02-plan` → `03-work` → `04-review` → `05-learn`.

## Start of skill: model routing

Run this checklist before normal skill workflow:

1. Read `.pi/settings.json` from the project root.
2. Parse `modelStrategy` (if missing, skip switching).
3. Resolve current stage key:
   - `01-brainstorm`
   - `02-plan`
   - `03-work`
   - `04-review`
   - `05-learn`
4. Pick `targetModel = modelStrategy[stageKey] ?? modelStrategy.default`.
5. If `targetModel` exists and differs from the current model, run `/model <targetModel>`.
6. If switching fails, continue with current model and mention the failure once.

## End of skill: status + context + optional auto-continue

Before final completion, always output these blocks (replace placeholders with real values, never output angle-bracket placeholders literally):

```
---
📊 Pipeline Status
- Current: <stageKey>
- Output: <main artifact path or N/A>
- Next: <next skill command or Completed>
---

🧠 Context Status
- Health: good | watch | heavy | critical
- Handoff: <path or N/A>
- Active: <1-5 active files or N/A>
- New session: recommended | not needed
---
```

Next step mapping:
- `01-brainstorm` → `/skill:02-plan`
- `02-plan` → `/skill:03-work`
- `03-work` → `/skill:04-review`
- `04-review` → `/skill:05-learn`
- `05-learn` → `Completed`

Then read `.pi/settings.json` → `pipeline.autoContinue`:
- If `false` or missing, stop after the status block and wait for user input.
- If current stage is `05-learn`, stop after status block.
- If `true` and current stage is not `05-learn`, auto-continue is allowed only after stage-specific gates are satisfied:
  - `01-brainstorm`: user has explicitly approved the design handoff.
  - `02-plan`: review choice is resolved (A/B/C flow completed) and user confirmed to proceed.
  - `04-review`: optional QA choice is resolved (A/B/C flow completed) and user confirmed to proceed.
  - Any unclear/ambiguous state: do not auto-continue; stop and ask.
- When gates are satisfied, automatically trigger the mapped next skill command.

### Handoff-lite template

When a stage produces or updates handoff-lite, use this evidence-first structure and keep it concise (target <= 1500 tokens):

```md
## Current Task

## Hot Context
- 1-5 must-know facts for the next step

## Verified Facts
- already validated facts (do not re-prove)

## Active Files
- 1-5 file paths only

## Artifacts
- requirements: <path or N/A>
- plan: <path or N/A>
- checkpoint: <path or N/A>
- proof: <path or N/A>

## Current Blocker
- <blocker or N/A>

## Verification
- <latest command + result or Not run>

## Do Not Repeat
- what should not be re-read/re-run unless needed

## Next Minimal Step
- exact next command/action
```

Rules:
- Use `N/A` instead of inventing facts.
- Keep broad history in artifact paths, not expanded narrative.
- If `context_handoff` is unavailable, manually write this shape to `.context/compound-engineering/handoffs/latest.md` and mention the path.

### New-session recommendation rule

Recommend a new session only when both are true:

1. Phase is changing (`Current` != next stage)
2. Context health is `heavy` or `critical`

When recommending a new session, include a directly copyable prompt:

```md
## 建议新开 Session

原因：当前 `<current stage>` 已完成，下一步将进入 `<next stage>`。当前窗口已经包含较多已完成阶段上下文，继续执行会降低 Token ROI，并增加旧上下文干扰后续判断的风险。

建议：新开一个窗口，把下面这段 Prompt 复制进去即可继续。

```text
继续这个 Super Pi workflow，不要重新开始。

Repo: <repo path>

请先读取：
- <latest plan/requirements artifact>
- <latest handoff-lite path>
- <latest checkpoint path or summary>

然后继续：
- 执行 <next skill command>

上下文策略：
- hot: 仅保留当前执行必须文件（1-5）
- warm: 通过 artifact path 按需回读
- cold: 不进入当前窗口，除非明确需要

核心原则：
- 不重复已完成阶段
- 优先验证当前阶段输出
- 控制 token，保持高 ROI
```
```
