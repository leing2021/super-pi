# Shared pipeline instructions

Use these rules in all Phase 1 skills: `01-brainstorm` → `02-plan` → `03-work` → `04-review` → `05-learn`.

## Start of skill: model routing

Model routing is handled automatically by the ce-core extension's `input` hook.
When a user types `/skill:01-brainstorm` through `/skill:05-learn`, the extension:

1. Reads `.pi/settings.json` from the project root.
2. Parses `modelStrategy[stageKey]` or falls back to `modelStrategy.default`.
3. If the target model differs from the current model, calls `pi.setModel()`.
4. If switching fails, notifies the user and continues with the current model.

No manual `/model` command is needed. The skill itself does not need to handle model switching.

Supported `modelStrategy` formats in `.pi/settings.json`:
- Full reference: `"02-plan": "anthropic/claude-opus-4-1"`
- Bare model id (reuses current provider): `"02-plan": "claude-opus-4-1"`

## Start of skill: context loading

Before reading any project files or running repository-wide scans, load the most recent handoff:

1. Try `context_handoff load` or `context_handoff latest` first.
2. Fallback: `read .context/compound-engineering/handoffs/latest.md` if tool is unavailable.
3. **Handoff found?** Consume its `activeFiles`, `blocker`, `verification`, `currentTruth`, `activeRules` before any broad project reads.
4. **No handoff?** Proceed normally — this is a new project or first run. Do not block.

Core principle: **consume handoff before broad project file reads** — a single handoff read (~500 tokens) avoids 5-10 project file scans (~5K-10K tokens).

## End of skill: save handoff + status + context

Every Phase 1 skill (02-plan through 05-learn) must save context handoff at completion:

```
context_handoff save
  currentStage: <stageKey>
  nextStage: <next stage>
  contextHealth: good | watch | heavy | critical
  activeFiles: [1-5 currently active paths]
  blocker: <blocker or N/A>
  verification: <latest command + result>
  activeRules: [1-5 rules critical for continuation]
  currentTruth: [validated truths]
```

If `context_handoff` is unavailable, manually write the Handoff-lite template to `.context/compound-engineering/handoffs/latest.md`.

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

### Handoff-lite template

When a stage produces or updates handoff-lite, use this evidence-first structure and keep it concise (target <= 1500 tokens):

```md
## Current Task

## Hot Context
- 1-5 must-know facts for the next step

## Current Truth
- validated truths that must survive compression

## Verified Facts
- already validated facts (do not re-prove)

## Invalidated Assumptions
- assumptions proven wrong this session

## Open Decisions
- pending decisions that affect next steps

## Active Files
- 1-5 file paths only

## Recently Accessed Files
- files recently read or edited

## Artifacts
- requirements: <path or N/A>
- plan: <path or N/A>
- checkpoint: <path or N/A>
- proof: <path or N/A>

## Current Blocker
- <blocker or N/A>

## Verification
- <latest command + result or Not run>

## Compression Risk
- context compression risks to watch for

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
