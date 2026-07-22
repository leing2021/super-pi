# 更新日志

### 0.26.0 — 吸纳 Matt Pocock skills 方法论 + 外部资源核实门禁
- **方法论吸纳**：以四过滤器（自包含 / artifact-driven / SKILL.md 行数预算 / 可测试性）评估 [Matt Pocock skills](https://github.com/mattpocock/skills)，6 项通过、3 项排除（wayfinder、tracer-bullet ticket 化、triage——均依赖 issue tracker）。
- **新增共享 references**（均自包含，无外部路径依赖）：
  - `skills/references/domain-language.md` — `CONTEXT.md` 词汇表 + ADR 三条件门槛 + 单/多 context 消费契约。
  - `skills/references/module-design.md` — deep-module 词汇表（module / interface / depth / seam / adapter / leverage / locality）+ 删除测试 + interface-is-test-surface。
- **调试纪律强化**（`03-work/references/debug-discipline.md`，53→123 行）：完整诊断环，含 10 种反馈环构造策略、Phase 1 完成标准（red-capable / deterministic / fast / agent-runnable）、非确定性 bug 复现率策略、minimise 步骤、Phase 6 post-mortem 闭环交接 `05-learn`。
- **Review Spec 轴**：`04-review` 新增第六轴——spec-reviewer persona 对比 diff 与原始 plan（missing / scope creep / wrong implementation），并回溯用户原始措辞（brainstorm scope）以捕获 plan 自身编码的方向性误解。
- **Out-of-scope 知识库**：`05-learn` 可记录被拒或已实现需求到 `docs/out-of-scope/`，供 `01-brainstorm` 和 `02-plan` 消费以防重复提出。模板位于 `skills/05-learn/assets/out-of-scope-template.md`；约定 README 纳入版本控制（静态），运行时实例 gitignore。
- **外部资源核实门禁**（`01-brainstorm/references/premise-challenge.md` rule 5）：用户提及已有资源时，scoping 前反向核实意图（纳入 vs 已解决）。防止误解信号贯穿全部 pipeline 阶段、仅在 merge 时暴露的失败模式。
- **测试**：196 → 204（+8 内容契约测试，含自包含路径扫描与 SKILL.md 行数守护）。
- **gitignore**：`docs/` 排除细化为 `docs/*` + 显式例外，使静态约定文档（out-of-scope/README）可追踪，运行时 artifact 仍忽略。

### 0.25.3 — 跟进 pi 0.79–0.80：CONFIG_DIR_NAME、修正 compaction hook 文档、peerDep 下限
- **pi 适配**：`readSettings` 改用 pi 导出的 `CONFIG_DIR_NAME`（默认 `.pi`，pi 0.79.7 起可用户自定义）替代硬编码 `.pi` 路径，当项目配置目录被自定义时也能正确读取 `settings.json`。
- **修复（死代码 + 注释误导）**：`compaction-optimizer` 此前注释声称 hook `session_before_compact`，实际 hook 的是 `session_before_tree`。注释现准确描述哪个 hook 消费 `COMPACTION_FOCUS_INSTRUCTIONS`（`session_before_tree`，其 `customInstructions` 返回值在 `/tree` 导航时被 pi 消费），以及为何常规上下文压缩未覆盖（pi 的 `SessionBeforeCompactResult` 只接受 `cancel` 或完整 `compaction` 替换——无 prompt-only 注入字段）。移除了一个无效的 `session_before_compact` handler（徒增 `emit()` 开销却零收益）。
- **peer 依赖**：下限从 `>=0.74.0` 提升至 `>=0.79.10`，匹配实际用到的 API（`CONFIG_DIR_NAME` + `session_before_compact` 的 `reason`/`willRetry`）。devDependencies 升至 `^0.80.0`。
- **文档**：README / README_CN 新增 project-trust 说明（pi 0.79+），提示首次运行需批准项目信任，非交互运行用 `pi --approve`。
- 196 个测试通过，0 回归。

### 0.25.2 — ask_user_question 选项长度规范
- `rules/common/development-workflow.md` 新增 `Tool Usage Constraints`：`ask_user_question` 选项 label 控制在 30 字符内，避免 pi TUI `truncateToWidth` 截断。

### 0.25.1 — 修复 ask_user_question 崩溃：绑定 fg 到 this.theme
- **Bug 修复**：`AskUserQuestionSelector.render()` 将 `this.theme.fg` 提取为裸函数，丢失 `this` 绑定。调用 `fg("accent", ...)` 时抛出 `TypeError: Cannot read properties of undefined (reading 'fgColors')`，导致 `ask_user_question` 触发 Pi 崩溃。修复方式：添加 `.bind(this.theme)`。
- 193 个测试通过，0 回归。

### 0.25.0 — ask_user_question 加固：串行化提问、选项归一化、可滚动 TUI、prompt 元数据
- **Bug 修复（并行静默失败）**：`ask_user_question` 通过 module-level Promise 队列（`runAskUserQuestionExclusive`）串行化交互 UI 调用，避免 Pi 单例 selector 竞态导致并行 `ask_user_question` 静默返回 `No result provided`。详见 `docs/bug/ask-user-question-parallel-call-silent-failure.md`。
- **Bug 修复（长选项截断）**：选项归一化为单行短 label（`normalizeQuestionOptions`），返回给 agent 的仍是完整原始 option。重复 label 以 `(#n)` 后缀去重；`Other` 自定义哨兵永不与用户选项冲突。详见 `docs/bug/ask-user-question-long-options-truncated.md`。
- **新功能（可滚动 TUI）**：`tui` 模式且 `ctx.ui.custom` 可用时，`ask_user_question` 渲染可滚动的自定义 selector（`AskUserQuestionSelector`），长问题换行 + 长选项列表滚动。否则 fallback 到 `ctx.ui.select()`。详见 `docs/bug/ask-user-question-long-text-not-scrollable.md`。
- **Prompt 元数据**：为 `ask_user_question` 注册 `promptSnippet` 和 `promptGuidelines`，明确警告不要并行调用。
- **文档**：更新全部 4 个 bug 状态；`ceo-review-mode.md` 补充一次一个 `ask_user_question` 的提示。
- 192 个测试通过（+13），0 回归。

### 0.24.0 — 移除内置 subagent 工具，适配 pi 0.78.x ctx.mode/streamingBehavior
- **Breaking**：移除 `ce_subagent` 和 `ce_parallel_subagent` 工具及全部 subagent 基础设施（runner、events、renderer、depth guard、6 个工具模块、5 个测试文件）。净减 3,660 行。
- **Pi 0.78.x 适配**：`ctx.mode` 替代 `ctx.hasUI` 做通知守卫；`streamingBehavior === "steer"` 跳过流式中断期间的模型/思考切换。
- **Breaking**：移除 `08-help` skill（README 已覆盖相同信息）。管线 skill 从 8 个减至 7 个。
- **文档**：`03-work` 回归 inline-first；README/README_CN 中所有 `pi-subagents` 引用已移除（极简主义）。
- **移除的导出**：`createSubagentTool`、`createParallelSubagentTool`、`createJsonRunner`、`checkSubagentDepth`、`getChildDepthEnv`、`DEFAULT_MAX_SUBAGENT_DEPTH`、`AsyncMutex`、`renderSubagentCall`、`renderSubagentResult`、`formatToolCall`、事件解析类型。

### 0.23.13 — 修复并行 subagent inheritSkills 默认值与 ce_subagent 不一致
- **Bug 修复**：`ce_parallel_subagent` 的 `inheritSkills` 默认值改为 `true`（与 `ce_subagent` 一致）。此前省略该参数会传入 `--no-skills`，导致并行子进程静默丢失 skill 继承。
- 同步更新工具 schema 描述、接口注释和测试用例。

### 0.23.12 — 引入 CONTEXT 词汇表/ADR/调试纪律 + tsc 类型修复 + 并行进度总数
- **Skills（融合 mattpocock/skills）**：`01-brainstorm` 可选 CONTEXT.md 词汇表，`02-plan` 轻量 ADR 模板，`03-work` 反馈环优先调试纪律。零新 skill/tool。
- **类型修复**：解决 5 处 tsc 类型错误。
- **并行 TUI**：进度条显示总数（`1/3✓` 替代 `1✓`）。

### 0.23.11 — 紧凑型并行 subagent TUI：进度条 + 摘要卡片
- **调用阶段**：展示全部 agent 编号列表，不再折叠到只显示 3 个。
- **运行阶段**：实时进度条（█░）+ 已完成/运行中计数。
- **完成折叠**：每个 agent 一行摘要（图标 + 名称 + 结论）。
- **完成展开（Ctrl+O）**：每个 agent 的完整 Markdown 输出。
- **内容文本**：紧凑摘要替代完整输出拼接，减少 LLM 上下文浪费。
- 新增 6 个渲染器测试。285 个测试全部通过，0 回归。

### 0.23.10 — subagent TUI 实时状态：spawn JSON runner 架构
- **新架构**：`ce_subagent` 和 `ce_parallel_subagent` 改用 `pi --mode json` 子进程 + per-process 环境变量，替代 `pi.exec()` + 全局 `process.env` 改写。
- **实时 TUI 更新**：执行过程中实时渲染工具调用、状态图标（⏳/✓/✗）、用量统计和 Markdown 输出。
- **折叠/展开视图**：折叠显示 agent + 状态 + 最近工具调用；Ctrl+O 展开查看完整输出和用量。
- **并行垂直布局**：`ce_parallel_subagent` 每个任务独立显示在各自的框中。
- **并发控制**：`mapWithConcurrencyLimit`（来自 pi 官方示例）限制并行 spawn 数量为 4。
- **共享事件模型**：`subagent-events.ts` 提供 `parseJsonEvent`、`applyEventToResult`、`invokeRunner`、`isSingleResult`，两个工具共用。
- **per-process env**：不再需要 `AsyncMutex` 或 `process.env` 改写；通过 `spawn({ env })` 传递环境变量。
- **渲染器**：`subagent-renderer.ts`，`formatToolCall`（适配自 pi 官方示例）支持 bash/read/write/edit/ls/find/grep 格式化。
- 284 项测试通过，新增 72 项，0 回归。

### 0.23.9 — 上下文卫生规则
- 新增 Phase 1 共享上下文卫生指引：压缩已解决错误、预取明显前置数据、限制重复失败重试、保存 handoff 前裁剪无关内容。
- 新增 `03-work` 恢复后处理规则：用 `ERROR(resolved): <root cause>` 替代已解决 stop-the-line 完整 trace，并在同一工具、命令或 unit 连续失败 3 次后停止重试。
- 在 Design Philosophy & Acknowledgements / 设计哲学与致谢中加入 `humanlayer/12-factor-agents`，作为上下文卫生规则的灵感来源。
- 升级 package 版本到 `0.23.9`，便于 npm 发布和本地升级识别。
- 212 个测试通过，0 回归。

### 0.23.8 — 收窄 CE subagent 的主流程阶段委托
- `ce_subagent` 现在会拒绝调用主流程 stage skill（`01-brainstorm` 到 `05-learn`），并提示直接使用 `/skill:<stage>` 执行。
- `ce_parallel_subagent` 在启动并行任务前应用同样 guard。
- `03-work` 现在明确为 inline 优先，CE subagents 仅用于有明确边界、无需交互、容易验证的叶子任务。
- README 和 README_CN 明确 Super Pi 是 Pi-native 工程 workflow 层，不是通用 multi-agent 执行器。
- 212 个测试通过，0 回归。

### 0.23.5 — Agent-skills 微模式吸收：嵌入式行为门禁、技能路由、仓库整理
- **Skill 描述强化** — 8 个技能的 frontmatter description 均加入 "Use when" 触发条件，提升自动技能路由准确性。
- **Source-driven 门禁** — 嵌入 3 处：`rules/common/development-workflow.md`（规则）+ `02-plan` workflow step + `03-work` workflow step。当实现依赖框架/库 API 或版本特定行为时，先查官方文档再实现。
- **Stop-the-line 规则（Hard gate）** — 嵌入 `03-work` Hard gates。遇到意外失败：STOP → 保留证据 → 诊断根因 → 修复 → 加回归测试 → 恢复。
- **Anti-rationalization** — 当 gate 失败或证据缺失时：不要合理化、降级或解释失败。停下来，带着证据报告阻塞点。
- **Review 五轴基准** — 加入 `04-review` reviewer-selection：所有 reviewer 按 correctness、readability、architecture、security、performance 五轴评估。
- **Typo 修复** — `performan04-reviewer` → `performance-reviewer`。
- **仓库整理** — `docs/` 不再追踪；`bun.lock` 不再追踪。
- 采用 Approach B：所有改动为现有文件编辑，不新增技能/工具/命令。新增约 410 tokens。
- 209 个测试通过，0 回归。

### 0.23.4 — 记忆优化 Phase 2：activeRules、context-first 技能、handoff 生命周期
- `context_handoff` 新增 `activeRules?: string[]` 字段，用于跨 session 保存 1-5 条续接关键规则。
- `activeRules` 持久化到 state，通过 load/latest/status 返回，在默认 handoff 模板中渲染。
- 向后兼容：旧 state 文件缺少 `activeRules` 时归一化为 `[]`。
- 软约束：>5 条规则不会导致失败。
- 更新 `pipeline-config.md`，增加「启动时加载 context」指引（handoff 优先于广泛读取）和「结束时保存 handoff」生命周期。
- 更新 `02-plan`、`03-work`、`04-review` SKILL.md，将加载 handoff 作为工作流第一步。
- 重写 `06-next` 推荐逻辑，采用 context-first 优先级链：health → blocker → recommendNewSession → nextStage → mismatch → artifact-count 回退。
- 6 个新测试覆盖 activeRules（round-trip、模板、默认值、软约束、向后兼容、自定义 markdown）。
- 209 测试通过，0 回归。

### 0.23.3 — Context handoff 确定性验证探针（Route B-lite）
- `context_handoff` 新增 `operation: "validate"`，用于确定性续接就绪性验证。
- 4 个探针：`recall`、`continuation`、`artifact`、`decision`。
- `ok` 仅要求 `recall` + `continuation` 通过；`artifact` / `decision` 缺失为 warnings。
- 可解释 `checks` 数组，每个探针包含 name、passed、reason。
- 占位符过滤：`N/A`、`- N/A`、`Not run` 不计入 markdown 或结构化状态中的证据。
- 所有公开输出路径归一化为仓库相对路径。
- 收紧续接判定：`verification` / `blocker` 单独不能让 continuation 通过。
- 203 测试通过，0 回归。

### 0.23.2 — Context handoff 结构化运行态内存锚点
- `context_handoff` 新增 5 个可选结构化字段：`currentTruth`、`invalidatedAssumptions`、`openDecisions`、`recentlyAccessedFiles`、`compressionRisk`。
- 新字段持久化到 `.context/compound-engineering/context-state.json`，支持机器可读的运行态状态。
- 扩展默认 handoff-lite markdown 模板，增加对应 sections。
- 新增 `workflow_state.context`，从 `context-state.json` 读取结构化状态并返回安全默认值。
- 增加状态归一化层（`normalizeStateEntry`、`toStringArray`），确保与旧版状态文件向后兼容。
- 修复 `workflow_state` 对 context state 中非字符串数组元素的过滤。
- 更新 `pipeline-config.md` handoff-lite 模板，增加 5 个新 sections。
- 191 测试通过，0 回归。

### 0.23.1 — SKILL.md 精简 + thinkingStrategy 支持
- 8 个 SKILL.md 文件从 28KB 精简到 18KB（-35%），将详细规则、模板、示例移至 `references/` 按需加载。
- 新建 reference 文件：
  - `ce-brainstorm-mode.md`（01-brainstorm）：标准 CE 模式工作流
  - `solution-search.md`（02-plan, 04-review）：grep 优先的 solution 搜索策略
  - `completion-report.md`（03-work）：完成报告模板
- 扩展已有 references：
  - `workflow-sequence.md`（08-help）：详细 CE pipeline 指南
  - `recommendation-logic.md`（06-next）：合并 skill-registry
- 新增 `thinkingStrategy` 支持，按 skill 控制思考深度。
- 扩展配置加载，支持全局 `~/.pi/agent/settings.json` 作为项目级 `.pi/settings.json` 的 fallback。
- 简化 README.md 和 README_CN.md 为核心内容。
- 更新 `.gitignore`，排除所有 `docs/` 内容，仅保留 `token-cost-evaluation.md`。

### 0.23.0 — CE 扩展工具命名空间隔离，兼容第三方扩展
- 将 `ce-core` 的 subagent 工具从 `subagent`/`parallel_subagent` 重命名为 `ce_subagent`/`ce_parallel_subagent`，避免与第三方扩展（如 `pi-subagents`）发生运行时工具名冲突。
- 同步更新 `03-work` skill 文档和 `README.md`/`README_CN.md` 中的工具名称引用。
- 新增 TDD 测试，验证工具名正确且 runtime registration guard 有效（不注册裸 `subagent`/`parallel_subagent`）。
- README 新增兼容性说明，明确 `ce_subagent`/`ce_parallel_subagent` 与通用 `pi-subagents` 可共存。
- 新增 `05-learn` solution artifact，记录三种扩展工具重叠处理方案： delegation、source integration、namespace isolation。
- 修复 `ce_parallel_subagent` 用户可见错误消息中的工具名。

### Unreleased — 工作流简化与规则加载清理
- 将 `08-status` 合并进 `06-next`；`06-next` 现在同时支持下一步推荐和 verbose 完整状态报告。
- 移除独立的 `10-rules`；`02-plan`、`03-work`、`04-review` 现在直接加载项目规则，并共享 `skills/references/language-detection.md`。
- 将 `09-help` 重命名为 `08-help`，删除 `08-status` 后仍保持 skill 编号连续。
- 新增 `rules/common/naming.md`，提供简单、日常、低歧义的命名规范。
- 将 `context_handoff` 注册为正式 ce-core tool 并导出。
- 明确 `07-worktree` 是可选隔离工具，create/merge/cleanup 前需要用户确认。
- 明确 `subagent` 是用于有价值依赖串行链的低层工具；小任务默认 inline，独立任务使用 `parallel_subagent`。
- 将 changelog 历史从 README 拆分到 `CHANGELOG.md` 和 `CHANGELOG_CN.md`。

### 0.19.5 — Plan/Work/Review 规则加载一致性修复
- 修复 `02-plan` 在计划阶段不加载语言特定规则（如 `rules/typescript/`）的问题——仅加载了 `common/` 规则。
- 修复 `03-work` Core rules 缺少显式 `common/` 加载和 `web/` 条件加载（10-rules 定义了但 skill 自身指令未包含）。
- 修复 `04-review` Core rules 缺少显式语言检测方法和 `web/` 条件加载。
- 统一三个 skill 为相同的 4 步渐进式加载策略（common → 语言检测 → 语言规则 → web 规则）。
- 更新 `10-rules` SKILL.md Pre-flight 为三个阶段都包含完整的语言检测映射。
- 同步 `README.md` 和 `README_CN.md` 的 skill 表格描述。

### 0.19.4 — Read output filter markdown 截断修复
- 修复 `read-output-filter` 对 markdown 文件过度截断：markdown 过滤阈值从 2KB 提升至 8KB。
- 改进 `filterMarkdown()`：完整保留列表项（`-`、`*`、编号列表），段落保留前 3 行（原来只保留 1 行）。
- 过滤提示现包含实际文件路径的可行动指引（`bash cat <path>`）。
- 新增 5 个测试，覆盖列表保留、markdown 阈值门控和路径提示。
- 175 个测试全部通过。

### 0.19.3 — terminate 修复 + 运行时模型路由 + autoContinue 移除
- 修复 6 个 ce-core 工具（`brainstorm_dialog`、`workflow_state`、`review_router`、`session_checkpoint`、`session_history`、`pattern_extractor`）错误返回 `terminate: true`，导致 agent turn 提前结束（brainstorm 问题不显示、"输入继续才能继续"中断）。
- 实现运行时分阶段模型路由：通过 ce-core 扩展 `input` hook，读取 `.pi/settings.json` 的 `modelStrategy`，在 skill 执行前自动切换模型。支持完整格式（`anthropic/claude-opus-4-1`）和简写格式（`claude-opus-4-1`）。
- 移除 `pipeline.autoContinue` 配置（从未有运行时实现；Pi 缺少 `skill_end` 事件，无法自动续跑）。
- 更新 `skills/references/pipeline-config.md`、`README.md`、`README_CN.md` 以反映运行时模型路由行为。
- 新增 4 个测试，覆盖 terminate 回归、input hook 模型路由和裸模型 id 解析。

### 0.19.2 — evidence-first handoff-lite + docs 追踪规则
- 新增 `context_handoff`，在未传 markdown 时自动生成 evidence-first 默认 handoff-lite。
- 通过 `skills/references/pipeline-config.md` 把 01-05 阶段的共享 handoff-lite 模板统一起来。
- 新增测试，保护默认 handoff 生成行为以及共享 handoff 文档契约。
- 更新 docs 追踪规则：Git 只上传 `docs/token-cost-evaluation.md`，其余 `docs/` 工件保留本地。

### 0.19.1 — 流水线配置 + 类型检查基线修复
- 新增共享流水线配置（`skills/references/pipeline-config.md`），支持通过 `.pi/settings.json` 做分阶段模型路由。
- 新增运行时分阶段模型路由（通过 ce-core 扩展的 `input` hook 实现，读取 `.pi/settings.json` 的 `modelStrategy`，在 skill 执行前自动切换模型）。
- 修复 TypeScript 基线问题，`bunx tsc --noEmit` 可通过。

### 0.19.0 — 0.69.0 对齐 + 沉淀重命名
- TypeBox 迁移：`@sinclair/typebox` → `typebox`（零旧路径残留）
- Peer/dev 依赖升级：pi-coding-agent `0.67.6` → `0.69.0`
- 工具终结优化：6 个纯查询工具添加 `terminate: true`，减少多余 LLM 轮次
- Skill 重命名：`05-compound` → `05-learn`，更易理解

### 0.18.0 — 渐进式规则
- 内置 `rules/` 目录，含 13 个语言层 + common + web（78 个 Markdown 文件）
- 新增 `10-rules` skill：渐进式按需加载，零浪费
- `02-plan`、`03-work`、`04-review` 在入口处自动触发规则加载
- 用户可自由增减语言、编辑规则——纯 Markdown，零配置
- 10 个 skills、15 个 tools、162 个测试全部通过

### 0.17.0 — Subagent 安全
- 递归深度守卫（`PI_SUBAGENT_DEPTH` / `PI_SUBAGENT_MAX_DEPTH`）防止失控嵌套
- Async mutex 保障并行 subagent 执行时 `process.env` 的并发安全
- 上下文裁剪：`inheritSkills` 参数，并行 worker 默认窄上下文（`--no-skills`）
- 共享 `createSubagentRunner` 工厂函数（消除重复闭包）
- 162 个测试全部通过

### 0.16.0 — 上下文优化
- Read 输出过滤器：大代码文件结构化压缩、lock 文件摘要、markdown 压缩
- Compaction 优化器：session 压缩时的聚焦摘要指令
- Bash 输出过滤器改进

### 0.15.0 — 输出过滤
- Bash 输出过滤器：按命令类型智能截断（install、test、build）
- Read 输出过滤器：保留结构的同时降低冗余

### 0.14.0 — 结构化 solution 检索
- YAML frontmatter 标签体系 + grep-first 两级搜索
- 95 个测试全部通过

### 0.13.0 — Superpowers 工程纪律
- 严格 TDD 红线、设计检查清单、YAGNI 检查

### 0.12.0 — 错误恢复
- session_checkpoint 支持 fail/retry 操作

### 0.11.0 — 模式提取
- 新增 pattern_extractor tool

### 0.10.0 — 持续学习
- 新增 session_history tool

### 0.9.0 — 增量计划
- 新增 plan_diff tool

### 0.8.0 — 多轮对话
- 新增 brainstorm_dialog tool

### 0.7.0 — 并行分组
- Union-Find 算法的 task_splitter

### 0.6.0 — 断点续传
- 新增 session_checkpoint tool

### 0.5.0 — 并行执行
- 新增 parallel_subagent tool

### 0.4.0 — 智能审查
- 新增 review_router tool

### 0.3.0 — 隔离开发
- 新增 worktree_manager + 07-worktree

### 0.2.0 — 状态感知
- 新增 workflow_state + 06-next

### 0.1.0 — 初始发布
- 7 个 skills、3 个 tools
