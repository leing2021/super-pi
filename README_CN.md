# Super Pi

**让你的 AI 编程助手从"写代码的工具"变成"靠谱的工程师"。**

安装，告诉 Pi 你想做什么，然后一直说"continue"——它会走完整个循环：**思考 → 计划 → 构建 → 审查 → 沉淀经验。**

```bash
pi install npm:@leing2021/super-pi
```

> **从 v0.21.0 或更早版本升级？** 先运行 `pi uninstall npm:pi-subagents`，再 `pi update`。从 v0.22.0 起，subagent 能力已内置，不再需要单独安装。

---

## 为什么用 Super Pi

用裸 AI 编程有三个常见问题：

1. **没想清楚就开写** — 写完发现不是想要的
2. **中断就丢上下文** — 关了终端，进度没了
3. **每次犯同样的错** — 每个会话从零开始

Super Pi 的解法：

- **先想清楚再动手** — 不是填表，而是像 YC 合伙人一样逼你拿出具体证据
- **断点自动恢复** — 中断后重启，跳过已完成的工作，从断点继续
- **自动沉淀经验** — 每个解决的问题变成可搜索的知识卡片，下次自动复用

---

## 快速上手

### 新想法

```
你：我想做一个帮独立开发者找用户的工具

→ 自动进入 01-brainstorm，YC 风格提问
→ 生成 docs/brainstorms/2026-04-18-find-users-requirements.md
→ 推荐下一步：02-plan

你：continue

→ 02-plan 拆分为实施单元，可选 CEO Review
→ 03-work 并行执行，断点续传
→ 04-review 代码审查 + 可选浏览器 QA
→ 05-learn 经验沉淀
```

### 给现有项目加功能

```
你：我想给项目加用户认证

→ 01-brainstorm CE 模式：OAuth2？JWT？MFA？
→ 需求文档 → 02-plan → 03-work → 04-review → 05-learn
```

### 中断后恢复

```
你：/skill:03-work docs/plans/auth-plan.md

→ 自动加载检查点，跳过已完成单元，从断点继续
```

### 需求变了

```
你：需求变了，要加 SSO 支持

→ 02-plan 用 plan_diff 检测变更，增量补丁而不是重写
```

---

## 五步核心循环

```
01-brainstorm → 02-plan → 03-work → 04-review → 05-learn
    思考          计划       构建       审查       沉淀
```

每一步都有专用的 skill + tool 配对。不是提示词——是结构化工具链。

### 01-brainstorm：想清楚

三种模式应对三种场景：

| 模式 | 适用 | 做什么 |
|------|------|--------|
| **Startup Diagnostic** | 创业想法、新产品 | 六个 YC 风格追问，逼你拿出具体证据 |
| **Builder Mode** | 副业、黑客松 | 专注构建。不小心提到收入？自动升级为 Startup Diagnostic |
| **CE Brainstorm** | 给现有项目加功能 | 多轮对话明确范围，生成结构化需求文档 |

三种模式都会运行**前提挑战**（你的假设靠谱吗？）和**替代方案生成**才能继续。

### 02-plan：计划好

将需求拆分为实施单元，严格遵循 **RED → GREEN → REFACTOR**。需求变了？`plan_diff` 增量补丁，不重写。

**CEO Review（可选）**：用贝佐斯可逆决策框架、芒格逆向思维、乔布斯减法挑战你的计划。相当于免费请了个严苛的 CTO 审查。

### 03-work：写代码

- **并行执行**：`task_splitter` 分析文件依赖，将无冲突的单元交给 `subagent` 并发执行
- **断点续传**：中断了？下次启动自动加载，跳过已完成的工作
- **严格 TDD**：失败测试 → 最小实现 → 测试通过 → 重构。每步都要命令输出作证

### 04-review：审查

`review_router` 根据 diff 元数据自动分配审查角色。每个发现必须引用具体代码——不做表面审查。

**浏览器 QA（可选）**：打开你的应用，点击各页面，截图 bug，按严重程度修复，最多 3 轮自动修复。

### 05-learn：沉淀

把"这次踩的坑"变成 `docs/solutions/` 中带 YAML 标签的知识卡片。两级存储：项目内 + 全局（`~/.pi/agent/docs/solutions/`）。

下次运行 `02-plan` 或 `04-review` 时，相关经验自动检索复用。

---

## 内置能力

一个包包含所有功能：

| 功能 | 访问方式 |
|------|----------|
| **Agent Manager TUI** | `/agents` 或 `Ctrl+Shift+A` |
| **CE Agents**（ce-scout、ce-planner 等） | 通过 subagent 工具 |
| **CE Chains**（scout → planner → worker → reviewer） | 通过 subagent 工具 |
| **并行执行** | 通过 subagent 工具 |
| **阶段模型同步** | 自动 — 在 `.pi/settings.json` 中设置 `modelStrategy` / `thinkingStrategy` |
| **诊断** | `/subagents-status`、`/subagents-doctor` |

### 分阶段模型路由

在 `.pi/settings.json` 中配置一次：

```json
{
  "modelStrategy": {
    "01-brainstorm": "claude-sonnet-4-20250514",
    "02-plan": "claude-opus-4-20250115",
    "03-work": "claude-sonnet-4-20250514",
    "default": "claude-sonnet-4-20250514"
  },
  "thinkingStrategy": {
    "02-plan": "high",
    "03-work": "medium"
  }
}
```

模型切换自动处理——不需要手动 `/model`。运行任何 CE skill 时，扩展读取配置并在 skill 执行前自动切换。支持完整格式（`"anthropic/claude-opus-4-1"`）或简写格式（`"claude-opus-4-1"`）。

---

## 技术架构

### 核心：五步循环

| Skill | 做什么 | 核心工具 |
|-------|--------|----------|
| `01-brainstorm` | 三种模式需求挖掘（Startup Diagnostic / Builder / CE） | `brainstorm_dialog` |
| `02-plan` | 拆分单元 + TDD 门控 + `plan_diff` 增量更新 | `plan_diff` |
| `03-work` | 并行执行，断点续传，错误恢复 | `session_checkpoint`、`task_splitter`、`subagent` |
| `04-review` | 角色路由审查 + 浏览器 QA | `review_router` |
| `05-learn` | 模式提取 → 可搜索知识卡片 | `pattern_extractor` |

### 辅助工具

| Skill | 一句话 |
|-------|--------|
| `06-next` | 根据工作流状态推荐最佳下一步 |
| `07-worktree` | Git worktree 隔离开发 |
| `08-status` | 扫描 artifacts，报告进度 |
| `09-help` | 使用指南 |
| `10-rules` | 渐进式编码规则加载 |

### 渐进式规则加载

内置 `rules/` 目录，包含 13 种语言层（TypeScript、Python、Rust、Go、Java、Kotlin、C#、C++、Dart、PHP、Perl、Swift、Elixir）+ common + web，共 78 个 Markdown 文件。

规则**渐进加载**——不会一次全部加载，只加载当前任务需要的。零浪费。

自定义：在项目根目录创建 `rules/` 目录，项目级规则优先于包默认规则。详见 `10-rules` skill。

### 生成的文件结构

```
your-project/
├── docs/
│   ├── brainstorms/                  # 需求文档 (01-brainstorm)
│   ├── plans/                        # 执行计划 (02-plan)
│   └── solutions/                    # 知识卡片 (05-learn)
└── .context/
    └── compound-engineering/
        ├── checkpoints/              # 断点文件 (session_checkpoint)
        ├── dialogs/                  # 对话状态 (brainstorm_dialog)
        └── history/                  # 执行历史 (session_history)
```

**建议：全部提交到 git** —— 这些文件是项目的可追溯记忆。

---

## 设计理念 & 致谢

**80% 规划和审查，20% 执行。**

目标不是让 AI 写代码更快——而是让 AI 先想清楚再写，写完再审查，审查完再沉淀。速度来自更少的重写，不是跳过步骤。

以下项目直接启发了本工作：

- **[pi-subagents](https://github.com/nicobailon/pi-subagents)**（by Nico Bailon，MIT 许可证）→ 完整 subagent 运行时，已集成为内置扩展（串行、并行、链式、异步、TUI、agent CRUD）
- **[everything-claude-code](https://github.com/affaan-m/everything-claude-code)** (162K★) → 并行 subagent 编排、断点续传、持续学习
- **[superpowers](https://github.com/obra/superpowers)** (161K★) → 严格 TDD 门控、设计清单、审查纪律
- **[gstack](https://github.com/garrytan/gstack)** (78K★) → YC 风格追问、CEO Review 框架、浏览器 QA
- **[compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin)** (14K★) → 五步循环、知识沉淀骨架

不是 fork。不是 wrapper。方法论提取后用 Pi 原生的 tool + skill 系统重建。

---

## 最佳实践

| 建议 | 原因 |
|------|------|
| 从 01-brainstorm 开始 | 先想清楚永远不亏 |
| 大功能用 07-worktree | 隔离开发，不影响主分支 |
| 计划用 CEO Review | 免费请个严苛的 CTO 审查 |
| 用浏览器 QA 做验收 | 代码审查抓不到布局错乱和白屏 |
| 中断了别慌 | 下次 03-work 自动从断点恢复 |
| 迷失了用 08-status | 一眼看懂当前进度 |

---

## 更新日志

### 0.22.1 — 修复并行 subagent 运行时终端卡死问题
- 修复运行 8+ 个并行 subagent 时终端卡死、无法滚动的问题。
- 新增自适应 widget 动画间隔：250ms–1000ms，根据运行中的 job 数量动态调整。
- 新增 `createThrottle()` 用于前台并行 `onUpdate` 节流，支持 flush/dispose 生命周期。
- 新增渲染去重：基于内容 hash 跳过无变化的 `requestRender()` 调用。
- 降低 activity timer 和异步轮询频率，支持自适应缩放。
- 提取 `stopAnimationTimer()` 避免动态间隔切换时丢失状态。
- 197 个测试通过（新增 28 个渲染优化测试）。

### 0.22.0 — 源码融合 pi-subagents
- 将 pi-subagents v0.20.1 源码完整融入 `extensions/subagent/`——单包安装（`pi install npm:@leing2021/super-pi`）。
- 将 `typebox` 从 peerDependencies 移至 dependencies。
- 移除 `pi-subagents` peer 依赖——不再需要。
- 精简 `super-pi-extension/index.ts`：移除错误的安装检测和自动安装逻辑。
- 裁剪 slash commands：移除 `/run`、`/chain`、`/run-chain`、`/parallel`；保留 `/agents`（TUI）、`/subagents-status`、`/subagents-doctor` 及 `Ctrl+Shift+A` 快捷键。
- 新增 8 个测试覆盖 subagent 扩展结构、agent 数量和集成完整性。
- 169 个测试通过。

### 0.21.0 — 将 subagent 工具委托给 pi-subagents
- Subagent 能力由 `pi-subagents` 包提供。
- 从 `ce-core` 扩展中移除 `subagent` 和 `parallel_subagent` 工具注册。

### 0.20.0 — Extension API 迁移
- 将 `super-pi-extension` 迁移为 Pi 原生工厂函数格式。

<details>
<summary>更早版本</summary>

### 0.19.6 — pi-subagents 集成扩展
- 新增 `super-pi-extension`：预配置 CE Agents 和 CE Chains。
- 新增 `thinkingStrategy` 设置：分阶段 thinking 级别同步。

### 0.19.5 — Plan/Work/Review 规则加载一致性修复
- 修复 `02-plan` 在计划阶段不加载语言特定规则的问题。
- 更新三个 skill 使用一致的 4 步渐进加载策略。

### 0.19.4 — Read output filter markdown 截断修复
- 修复 `read-output-filter` 对 markdown 文件过度截断的问题。
- 新增 5 个测试。175 个测试通过。

### 0.19.3 — terminate 修复 + 运行时模型路由 + autoContinue 移除
- 修复 6 个 ce-core 工具错误返回 `terminate: true`。
- 通过 ce-core 扩展 `input` hook 实现运行时分阶段模型路由。

### 0.19.2 — evidence-first handoff-lite + docs 追踪规则
- 新增 `context_handoff`，支持 evidence-first 默认 handoff-lite 生成。

### 0.19.1 — 流水线配置 + 类型检查基线修复
- 新增分阶段模型路由的共享流水线配置。

### 0.19.0 — 0.69.0 对齐 + 沉淀重命名
- TypeBox 迁移：`@sinclair/typebox` → `typebox`。
- Skill 重命名：`05-compound` → `05-learn`。

### 0.18.0 — 渐进式规则
- 内置 `rules/` 目录，13 种语言层 + common + web，共 78 个 Markdown 文件。
- 新增 `10-rules` skill：渐进按需加载。

### 0.17.0 — Subagent 安全
- 递归深度防护，防止失控嵌套。
- `process.env` 并发安全的异步互斥锁。

### 0.16.0 — 上下文优化
- Read output filter：大代码文件的结构化压缩。

### 0.15.0 — 输出过滤
- Bash output filter：按命令类型智能截断。

### 0.14.0 — 结构化 solution 检索
- YAML frontmatter 标签 + grep-first 两级搜索。

### 0.13.0 — Superpowers 工程纪律
- 严格 TDD 门控、设计清单、YAGNI 检查。

### 0.12.0 — 错误恢复
- session_checkpoint fail/retry 操作。

### 0.11.0 — 模式提取
- 新增 pattern_extractor 工具。

### 0.10.0 — 持续学习
- 新增 session_history 工具。

### 0.9.0 — 增量计划
- 新增 plan_diff 工具。

### 0.8.0 — 多轮对话
- 新增 brainstorm_dialog 工具。

### 0.7.0 — 并行分组
- 基于 Union-Find 的 task_splitter。

### 0.6.0 — 断点续传
- 新增 session_checkpoint 工具。

### 0.5.0 — 并行执行
- 新增 parallel_subagent 工具。

### 0.4.0 — 智能审查
- 新增 review_router 工具。

### 0.3.0 — 隔离开发
- 新增 worktree_manager + 07-worktree。

### 0.2.0 — 状态感知
- 新增 workflow_state + 06-next。

### 0.1.0 — 初始发布
- 7 个 skills，3 个 tools。

</details>

---

## 仓库

- **GitHub**: https://github.com/leing2021/super-pi
- **npm**: https://www.npmjs.com/package/@leing2021/super-pi

## 开发

```bash
bun test
npm publish --dry-run
```
