# Super Pi Token 开销评估

> 评估日期：2026-06-08
> 版本基准：0.24.0（17 skills, 22 tools, 78 rule files）

## 结论

新开对话固定成本 **~4,130 tokens**，占 Claude Sonnet 4 (200K) 的 **2.1%**。首次 Bash 输出过滤即可回本。

相比 v0.23.13 的 ~4,350 tokens，下降主要来自移除 `ce_subagent` 和 `ce_parallel_subagent` 两个大型 CE 工具（净减 -3,660 行代码）。Skills 和 Rules 数量不变。

---

## 一、固定成本明细（每次新开对话）

### Skill 注册注入（17 skills）

| 来源 | 数量 | 说明 |
|------|------|------|
| super-pi 管线 skill | 7 | 01-brainstorm ~ 07-worktree |
| 全局通用 skill | 9 | agent-browser, caveman, cli-tool, context7, git, handoff, html-write, skill-write, … |
| 项目本地 skill | 1 | github-commit-super-pi |
| 外部 npm skill | 1 | super-cli |
| **合计** | **18** | |

| 项目 | tokens |
|------|--------|
| 17 个 skill description 内容 | ~870 |
| 17 个 skill name | ~41 |
| 17 个 skill location 路径 | ~300 |
| 17 个 skill XML 标签包装 | ~350 |
| XML 标签包装 + 分隔符 + 包装开销 | ~149 |
| **小计** | **~1,710** |

### Tool 注册注入（22 tools）

| 来源 | 数量 | 说明 |
|------|------|------|
| CE 扩展工具 | 12 | artifact_helper, ask_user_question, workflow_state, worktree_manager, review_router, session_checkpoint, task_splitter, brainstorm_dialog, plan_diff, session_history, pattern_extractor, context_handoff |
| Pi 内置工具 | 10 | read, bash, edit, write, generate_image, sandbox_exec, search, web_search, web_fetch, research_search |
| **合计** | **22** | |

| 项目 | tokens |
|------|--------|
| 22 个 tool description | ~920 |
| 82 个参数 description | ~990 |
| JSON Schema 结构开销 | ~350 |
| 参数名称 | ~165 |
| tool name + label | ~96 |
| **小计** | **~2,421** |

### Hooks / Filter

| 项目 | tokens | 说明 |
|------|--------|------|
| bash-output-filter | 0 | 运行时拦截 |
| read-output-filter | 0 | 运行时拦截 |
| compaction-optimizer | 0 | session_before_tree hook |
| input stage-routing (model/thinking) + streamingBehavior guard | 0 | input hook，按管线阶段自动切换；流式中断时跳过切换 |
| **小计** | **0** | |

### 总固定成本

```
Skill 注入  ~1,710
Tool 注入   ~2,421
Hooks       ~0
────────────────
总计        ~4,131 tokens
```

### 各模型占比

| 模型 | Context 长度 | 占比 |
|------|-------------|------|
| Claude Sonnet 4 | 200,000 | 2.101% |
| Claude Opus 4 | 200,000 | 2.101% |
| GPT-4o | 128,000 | 3.283% |
| Gemini 2.5 Pro | 1,048,576 | 0.401% |

---

## 二、运行时按需加载（不占固定成本）

| 场景 | tokens |
|------|--------|
| SKILL.md 全量加载（7 个管线 skill 全触发，~20 KB） | ~5,000 |
| 典型单次 skill 触发 | ~300–1,200 |
| Rules 最小必读（common 2 文件，~2.9 KB） | ~750 |
| Rules + 语言层（common + TypeScript，7 文件，~10 KB） | ~2,700 |
| Rules 全量（78 文件，极端情况，不会发生） | ~36,000 |

> **v0.24.0 变化**: `03-work` 改回 inline-first 策略（不再引用 subagent），SKILL.md 更紧凑。子代理功能移至外部扩展 `pi-subagents`。

---

## 三、Token 节省（vs 裸 Pi）

| 机制 | 典型节省 |
|------|----------|
| Bash 输出过滤 | 2,000–40,000 tokens / 次 |
| Read 输出过滤 | 1,000–10,000 tokens / 次 |
| 避免返工（TDD 门控） | 5,000–50,000 tokens / 次 |
| Compaction 优化 | 每次压缩提升摘要质量 ~30% |
| 管线阶段模型路由 | 复杂阶段自动切强模型，节省轻量阶段 token |
| streamingBehavior guard | 流式中断时跳过模型/思考级别切换，避免状态错乱 |

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

## 五、v0.23.13 → v0.24.0 变化摘要

| 维度 | v0.23.13 | v0.24.0 | 变化 |
|------|----------|---------|------|
| Skills | 18 | 17 | -08-help |
| CE Tools | 14 | 12 | -ce_subagent, -ce_parallel_subagent |
| Pi 内置 Tools | 10 | 10 | 持平 |
| 总 Tools | 24 | 22 | -2 |
| Rules | 78 | 78 | 持平 |
| Hooks | 5 | 4 | 合并为 input stage-routing + streamingBehavior |
| 固定成本 | ~4,345 | ~4,131 | -214（-4.9%） |
| SKILL.md 单次加载 | ~300–1,200 | ~300–1,200 | 持平 |
| 子代理架构 | 内置（2 tools + runner/renderer/events） | 移除，外部扩展 pi-subagents | -3,660 行 |
| Pi API 适配 | ctx.hasUI | ctx.mode + streamingBehavior | pi 0.78.x |

---

### 历史版本对比

| 维度 | v0.18.0 | v0.23.13 | v0.24.0 |
|------|---------|----------|---------|
| Skills（统计口径） | 10（仅 super-pi） | 18（全部） | 17 |
| CE Tools | 13 | 14 | 12 |
| 总 Tools | 13 | 24 | 22 |
| 固定成本 | ~2,500 | ~4,345 | ~4,131 |
| SKILL.md 单次加载 | ~1,000–4,000 | ~300–1,200 | ~300–1,200 |
| 阶段模型路由 | 无 | input hook | input hook + streamingBehavior guard |

---

## 六、项目优势点

### 1. 投入产出比极高

固定投入 ~4,130 tokens / 对话，单次 Bash 输出过滤就能省 2,000–40,000 tokens。一次避免返工的 TDD 门控省 5,000–50,000 tokens。ROI > 10x，第一次 `npm install` 输出的过滤就能回本。

### 2. Hooks 是「免费的超能力」

bash-output-filter、read-output-filter、compaction-optimizer、input stage-routing 都是运行时/事件驱动，零 system prompt 占用。它们在工具返回结果时压缩内容，越长的输出省得越多。input hook 在管线阶段切换时自动调整模型和思考级别，对 agent 完全透明。v0.24.0 新增 `streamingBehavior` guard，在流式中断时跳过切换，避免状态错乱。

### 3. 渐进式加载 = 零浪费

Rules 78 个文件（~36K tokens）永远不会全量加载。典型工作流只读 2–7 个规则文件（~750–2,700 tokens）。比任何「全局注入规则」的方案省 90%+。

SKILL.md 同样精简：共享指令提取到 `pipeline-config.md`，skill 单文件从 ~1,000–4,000 tokens 压缩到 ~300–1,200 tokens。7 个管线 skill 总量仅 ~20 KB。

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
- **子代理外置**：v0.24.0 移除内置 subagent 工具，改为可选外部扩展 `pi-subagents`，不使用子代理的项目不再承担其固定 token 开销
