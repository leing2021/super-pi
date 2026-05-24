# Super Pi Token 开销评估

> 评估日期：2026-05-24
> 版本基准：0.23.13（18 skills, 24 tools, 78 rule files）

## 结论

新开对话固定成本 **~4,350 tokens**，占 Claude Sonnet 4 (200K) 的 **2.17%**。首次 Bash 输出过滤即可回本。

相比 v0.18.0 的 ~2,500 tokens，增长主要来自全局 skill 和内置工具的自然纳入（本次评估完整统计了所有可用 skill/tool，而非仅 super-pi 自身）。

---

## 一、固定成本明细（每次新开对话）

### Skill 注册注入（18 skills）

| 来源 | 数量 | 说明 |
|------|------|------|
| super-pi 管线 skill | 8 | 01-brainstorm ~ 08-help |
| 全局通用 skill | 9 | agent-browser, caveman, cli-tool, context7, git, handoff, html-write, skill-write, … |
| 项目本地 skill | 1 | github-commit-super-pi |
| 外部 npm skill | 1 | super-cli |
| **合计** | **18** | |

| 项目 | tokens |
|------|--------|
| 18 个 skill description 内容 | ~877 |
| 18 个 skill name | ~43 |
| 18 个 skill location 路径 | ~312 |
| 18 个 skill XML 标签包装 | ~342 |
| **小计** | **~1,574** |

### Tool 注册注入（24 tools）

| 来源 | 数量 | 说明 |
|------|------|------|
| CE 扩展工具 | 14 | artifact_helper, ask_user_question, ce_subagent, workflow_state, worktree_manager, review_router, ce_parallel_subagent, session_checkpoint, task_splitter, brainstorm_dialog, plan_diff, session_history, pattern_extractor, context_handoff |
| Pi 内置工具 | 10 | read, bash, edit, write, generate_image, sandbox_exec, search, web_search, web_fetch, research_search |
| **合计** | **24** | |

| 项目 | tokens |
|------|--------|
| 24 个 tool description | ~1,006 |
| 90 个参数 description | ~1,080 |
| JSON Schema 结构开销 | ~384 |
| 参数名称 | ~180 |
| tool name + label | ~121 |
| **小计** | **~2,771** |

### Hooks / Filter

| 项目 | tokens | 说明 |
|------|--------|------|
| bash-output-filter | 0 | 运行时拦截 |
| read-output-filter | 0 | 运行时拦截 |
| compaction-optimizer | 0 | session_before_tree hook |
| input stage-routing (model/thinking) | 0 | input hook，按管线阶段自动切换 |
| **小计** | **0** | |

### 总固定成本

```
Skill 注入  ~1,574
Tool 注入   ~2,771
Hooks       ~0
────────────────
总计        ~4,345 tokens
```

### 各模型占比

| 模型 | Context 长度 | 占比 |
|------|-------------|------|
| Claude Sonnet 4 | 200,000 | 2.173% |
| Claude Opus 4 | 200,000 | 2.173% |
| GPT-4o | 128,000 | 3.395% |
| Gemini 2.5 Pro | 1,048,576 | 0.414% |

---

## 二、运行时按需加载（不占固定成本）

| 场景 | tokens |
|------|--------|
| SKILL.md 全量加载（8 个管线 skill 全触发，~22.7 KB） | ~5,700 |
| 典型单次 skill 触发 | ~300–1,200 |
| Rules 最小必读（common 2 文件，~2.9 KB） | ~750 |
| Rules + 语言层（common + TypeScript，7 文件，~10 KB） | ~2,700 |
| Rules 全量（78 文件，极端情况，不会发生） | ~36,000 |

> **v0.23.13 变化**: SKILL.md 内容更精简，单 skill 加载从 ~1,000–4,000 降至 ~300–1,200 tokens（管道配置提取到共享 `pipeline-config.md`，skill 主体更紧凑）。

---

## 三、Token 节省（vs 裸 Pi）

| 机制 | 典型节省 |
|------|----------|
| Bash 输出过滤 | 2,000–40,000 tokens / 次 |
| Read 输出过滤 | 1,000–10,000 tokens / 次 |
| 避免返工（TDD 门控） | 5,000–50,000 tokens / 次 |
| Compaction 优化 | 每次压缩提升摘要质量 ~30% |
| 管线阶段模型路由 | 复杂阶段自动切强模型，节省轻量阶段 token |

---

## 四、对比分析

| 维度 | 裸 Pi | + 全局规则文件 | + super-pi |
|------|-------|--------------|------------|
| 规则加载 | 无 | 全量注入 | 按需渐进 |
| 输出过滤 | 无 | 无 | 自动压缩 |
| TDD 门控 | 靠 prompt | 靠 prompt | 结构化 hard gate |
| 新对话固定成本 | 0 | ~5,000–36,000 | ~4,350 |
| Skill 自动路由 | 无 | 无 | 触发词 + 阶段模型切换 |
| 长期 ROI | 基准 | 取决于规则质量 | **10x+** |

---

## 五、v0.18.0 → v0.23.13 变化摘要

| 维度 | v0.18.0 | v0.23.13 | 变化 |
|------|---------|----------|------|
| Skills（统计口径） | 10（仅 super-pi） | 18（全部） | +8 全局/npm skill |
| CE Tools | 13 | 14 | +pattern_extractor, +context_handoff |
| 内置 Tools | 未统计 | 10 | 首次纳入 |
| 总 Tools | 13 | 24 | +11 |
| Rules | 78 | 78 | 持平 |
| Hooks | 5（均 0 token） | 5（均 0 token） | 持平 |
| 固定成本 | ~2,500 | ~4,345 | 口径变化（完整统计） |
| SKILL.md 单次加载 | ~1,000–4,000 | ~300–1,200 | 精简 ~60% |
| 阶段模型路由 | 无 | input hook | 新增 |

---

## 六、项目优势点

### 1. 投入产出比极高

固定投入 ~4,350 tokens / 对话，单次 Bash 输出过滤就能省 2,000–40,000 tokens。一次避免返工的 TDD 门控省 5,000–50,000 tokens。ROI > 10x，第一次 `npm install` 输出的过滤就能回本。

### 2. Hooks 是「免费的超能力」

bash-output-filter、read-output-filter、compaction-optimizer、input stage-routing 都是运行时/事件驱动，零 system prompt 占用。它们在工具返回结果时压缩内容，越长的输出省得越多。input hook 在管线阶段切换时自动调整模型和思考级别，对 agent 完全透明。

### 3. 渐进式加载 = 零浪费

Rules 78 个文件（~36K tokens）永远不会全量加载。典型工作流只读 2–7 个规则文件（~750–2,700 tokens）。比任何「全局注入规则」的方案省 90%+。

SKILL.md 同样精简：共享指令提取到 `pipeline-config.md`，skill 单文件从 ~1,000–4,000 tokens 压缩到 ~300–1,200 tokens。

### 4. 规则与代码的分层解耦

- `rules/` 是纯 Markdown，用户可直接编辑（78 文件，14 语言层）
- `skills/` 是行为策略（8 个管线阶段 + 共享 references）
- `extensions/ce-core/` 是能力单元（14 工具 + 5 hooks）
- 三者独立演化，互不影响

### 5. 防御性设计减少 token 浪费

- **TDD hard gate**：在 plan 阶段就拦截「先写代码再补测试」的冲动，避免整个 unit 返工
- **Checkpoint resume**：中断恢复不重跑已完成的 unit，节省整个断点前的 token
- **plan_diff 增量更新**：需求变更时不重写整个计划，只 patch 差异部分
- **Solution 检索**：grep-first 策略只读 frontmatter（前 15 行），不全量加载所有 solution 文件
- **阶段模型路由**：轻量阶段（brainstorm/learn）自动用便宜模型，重量阶段（work/review）自动切强模型，按需分配 token 预算
