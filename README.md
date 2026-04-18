# Super Pi

Pi 原生的迭代开发工作流包，融合了四个优秀开源项目的方法论。

[English](README_EN.md)

## 安装

```bash
pi install npm:@leing2021/super-pi
```

---

## 快速开始

安装后，对 Pi 说你想做什么，然后不断说"继续"即可走完整个工作流。

### 场景 A：启动一个新想法

```
你: 我想做一个帮助独立开发者找用户的工具

→ /skill:01-brainstorm
→ AI 问你的目标是什么 → 你选 "Building a startup"
→ 进入 Startup Diagnostic 模式
→ 逐个问 YC 式尖锐问题：需求证据？现有替代方案？最窄切入点？
→ 挑战前提假设，生成 2-3 个方案
→ 生成 docs/brainstorms/2026-04-18-find-users-requirements.md
→ 推荐下一步: 02-plan

你: 继续

→ /skill:02-plan
→ 读取 requirements artifact
→ 生成 docs/plans/2026-04-18-find-users-plan.md
→ 问你要不要 CEO Review → 你选 "CEO Review"
→ 挑战计划前提、梦想状态映射、生成替代方案、时间线审问
→ 推荐下一步: 03-work

你: 继续

→ /skill:03-work
→ 并行执行独立任务，断点续传
→ 推荐下一步: 04-review

你: 继续

→ /skill:04-review
→ 结构化代码审查 + autofix
→ 问你要不要浏览器 QA → 你选 "Browser QA"
→ 用 agent-browser 打开你的应用，逐页测试
→ 修复发现的 bug，截图记录
→ 推荐下一步: 05-compound

你: 继续

→ /skill:05-compound
→ 提取可复用模式
→ 写入 docs/solutions/ 沉淀知识
```

### 场景 B：Side Project / Hackathon

```
你: 我想做个有趣的音乐可视化 side project

→ /skill:01-brainstorm
→ AI 问你的目标 → 你选 "Side project / hackathon"
→ 进入 Builder Mode
→ 问：最酷的版本是什么？最快能做出什么给人看？
→ 不问商业验证，只关注怎么做出最酷的东西
→ 如果聊到赚钱 → 自动升级到 Startup Diagnostic
```

### 场景 C：给现有项目加功能

```
你: 给项目加一个用户认证功能

→ /skill:01-brainstorm
→ AI 问你的目标 → 你选 "Adding a feature"
→ 进入 CE Brainstorm（经典需求发现流程）
→ 多轮对话澄清需求（OAuth2? JWT? MFA?）
→ 生成 docs/brainstorms/2026-04-18-auth-requirements.md
→ 推荐下一步: 02-plan
```

### 场景 D：随时检查项目状态

```
你: /skill:08-status

→ 扫描 docs/brainstorms/、docs/plans/、docs/solutions/
→ 查询 session_history 了解最近执行记录
→ 显示当前进度 + 推荐下一步
```

### 场景 E：需求变了，更新计划

```
你: 需求变了，需要加 SSO 支持

→ /skill:02-plan
→ plan_diff compare 检测 added/removed/modified units
→ plan_diff patch 增量更新 plan
→ 不需要重写整个 plan
```

### 场景 F：执行中断后恢复

```
你: /skill:03-work docs/plans/auth-plan.md

→ session_checkpoint.load 发现已完成的单元
→ 自动跳过已完成部分，从断点继续
```

### 场景 G：隔离开发

```
你: /skill:07-worktree

→ worktree_manager 创建 git worktree 隔离环境
→ 在 worktree 中执行 03-work
→ 完成后 merge 回主分支
```

---

## Skills（9 个）

| Skill | 命令 | 描述 | 关联 Tools |
|-------|------|------|-----------|
| `01-brainstorm` | `/skill:01-brainstorm` | 需求发现，三种模式：CE / Startup Diagnostic / Builder | `brainstorm_dialog` |
| `02-plan` | `/skill:02-plan` | 创建/更新计划，可选 CEO Review | `plan_diff` |
| `03-work` | `/skill:03-work` | 执行计划（并行+断点+恢复） | `session_checkpoint`, `task_splitter`, `parallel_subagent` |
| `04-review` | `/skill:04-review` | 代码审查 + 可选浏览器 QA | `review_router` |
| `05-compound` | `/skill:05-compound` | 知识复合 | `pattern_extractor` |
| `06-next` | `/skill:06-next` | 推荐下一步 | `workflow_state`, `session_history` |
| `07-worktree` | `/skill:07-worktree` | Worktree 隔离开发 | `worktree_manager` |
| `08-status` | `/skill:08-status` | 检查项目状态 | `workflow_state`, `session_history` |
| `09-help` | `/skill:09-help` | 使用指南 | — |

---

## Tools（13 个）

| Tool | 描述 |
|------|------|
| `artifact_helper` | Artifact path 解析 + 目录创建 |
| `ask_user_question` | 结构化用户提问（自由输入/固定选项） |
| `subagent` | 串行 subagent chain |
| `parallel_subagent` | 并行 subagent 执行（`Promise.allSettled`） |
| `workflow_state` | Workflow artifact 状态扫描 |
| `worktree_manager` | Git worktree 生命周期（create/detect/merge/cleanup） |
| `review_router` | Diff 分析 + reviewer 角色路由（base + conditional） |
| `session_checkpoint` | Plan 执行断点续传 + 错误恢复（save/load/fail/retry） |
| `task_splitter` | 文件级依赖分析 + 并行分组（union-find） |
| `brainstorm_dialog` | 多轮 brainstorm 对话管理（start/refine/summarize） |
| `plan_diff` | Plan 增量比较 + 补丁（compare/patch） |
| `session_history` | 跨 session 执行历史（record/query/latest） |
| `pattern_extractor` | Artifact 模式提取 + 分类（extract/categorize） |

---

## 核心工作流

```
01-brainstorm → 02-plan → 03-work → 04-review → 05-compound
   三种模式        CEO Review   并行执行     浏览器 QA      知识沉淀
   (CE/Startup/   (可选)       断点续传     (可选)
    Builder)
```

`06-next`、`07-worktree`、`08-status`、`09-help` 可在任意阶段使用。

---

## 生成的文件结构

```
your-project/
├── docs/
│   ├── brainstorms/                        # 01-brainstorm 生成
│   │   └── 2026-04-18-auth-requirements.md
│   ├── plans/                              # 02-plan 生成
│   │   └── 2026-04-18-auth-plan.md
│   └── solutions/                          # 05-compound 生成
│       └── auth/
│           └── oauth2-solution.md
└── .context/
    └── compound-engineering/
        ├── checkpoints/                    # session_checkpoint 生成
        │   └── docs-plans-auth-plan.json
        ├── dialogs/                        # brainstorm_dialog 生成
        │   └── docs-brainstorms-auth.json
        └── history/                        # session_history 生成
            └── 1745000000-01-brainstorm.json
```

---

## 最佳实践

| 建议 | 说明 |
|------|------|
| **从 01-brainstorm 开始** | 新想法用 Startup/Builder Mode，加功能用 CE Mode |
| **用 08-status 检查进度** | 不确定做到哪了就用 08-status |
| **用 06-next 找方向** | 不知道下一步就用 06-next |
| **把 artifacts 纳入 git** | `docs/` 和 `.context/` 都应该 commit |
| **大功能用 07-worktree** | 隔离开发，不影响主分支 |
| **执行中断不要慌** | 下次 03-work 会自动从 checkpoint 恢复 |
| **用 CEO Review 审视计划** | 写完计划后选 CEO Review，挑战前提、找盲点 |
| **用浏览器 QA 验收** | 代码审查完选 Browser QA，真机测试找 bug |

---

## 致谢与参考来源

Super Pi 融合了四个优秀开源项目的理念和实践。这不是 fork，而是将其核心洞察以 Pi 原生方式重新实现。

### [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) — Every Inc.

> "每一次工程工作都应该让下一次更容易，而不是更难。"

Super Pi 的基础工作流直接源自 Compound Engineering 的核心理念：**brainstorm → plan → work → review → compound** 循环。这个"80% 规划和审查，20% 执行"的哲学是整个包的骨架。

**借鉴内容：**
- 五步工作流架构（brainstorm → plan → work → review → compound）
- 知识复合概念：每次工程工作沉淀可复用的 solution artifact
- Artifact 驱动的状态管理（通过 `docs/` 下的持久化文档追踪进度）
- 结构化审查方法论（reviewer persona 路由、findings schema）

### [Superpowers](https://github.com/obra/superpowers) — Jesse Vincent

> "给编码 agent 一套完整的软件开发方法论。"

Superpowers 对 Super Pi 的主要贡献是**工程纪律**：严格的 TDD 门控、设计检查清单、审查中的反表演性同意原则。

**借鉴内容：**
- 严格 TDD 红线（RED → GREEN → REFACTOR）和违规拒绝标准
- 设计检查清单（what/why/boundaries/failure/verification）
- 审查纪律：技术评估而非表演性同意，YAGNI 检查
- 用户审批门控：不经过用户确认不进入下一步
- Subagent 驱动开发模式

### [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) — Affaan Mustafa

> "AI agent 的性能优化系统。不是配置文件，是一套完整系统。"

140K+ star 的 ECC 展示了 AI agent 工具链的最佳实践。Super Pi 借鉴了其在 token 优化、持续学习、并行化和 subagent 编排方面的系统性思考。

**借鉴内容：**
- Session 历史管理和持续学习机制
- 并行 subagent 编排模式（`Promise.allSettled` 风格）
- Checkpoint 断点续传和错误恢复策略
- 体系化的工具设计：每个 skill 对应专属 tool

### [gstack](https://github.com/garrytan/gstack) — Garry Tan / Y Combinator

> "一个人的超级工厂。23 个专家角色和 8 个强力工具。"

gstack 是 Y Combinator CEO Garry Tan 的个人 AI 工具链，代表了"AI-native 创始人"的工作方式。Super Pi 在 v1.2.0 中融入了 gstack 三个核心模块的方法论。

**借鉴内容：**
- **office-hours → 01-brainstorm Startup Diagnostic**：YC 式六道尖锐问题（需求证据、现状替代、最窄切入点），反谄媚原则，逐条 pushback 模式
- **plan-ceo-review → 02-plan CEO Review**：CEO 认知框架（Bezos 不可逆决策、Munger 反演法、Jobs 减法原则），梦想状态映射，强制替代方案生成，错误地图和失败模式注册表
- **qa → 04-review Browser QA**：浏览器驱动的 QA 测试流程（用 Pi 原生 `agent-browser` 替代 gstack 的 `$B`），健康评分系统，diff-aware 测试范围，修复循环和回归测试生成

**设计决策：** gstack 依赖自有基础设施（`$B` 浏览器二进制、`gstack-*` 脚本、`~/.gstack/` 目录、telemetry）。Super Pi 用 Pi 原生工具替代了所有这些依赖，零外部基础设施。所有 gstack 能力作为可选分支点融入现有流程，不选择新路径 = 和原版行为完全一致。

---

## 更新日志

### 1.2.0

**融合 gstack 三大模块**

- `01-brainstorm`: 新增 Startup Diagnostic 模式（YC 式六道尖锐问题）和 Builder Mode（设计思维 for side projects）
- `02-plan`: 新增 CEO Review（前提挑战、梦想状态映射、强制替代方案）和 Strict Review（错误地图、失败模式、测试图表）
- `04-review`: 新增 Browser QA 模式（agent-browser 驱动的浏览器测试、健康评分、修复循环、回归测试生成）
- `09-help`: 更新技能描述和工作流图
- 新增 5 个 reference 文件：`startup-diagnostic.md`、`builder-mode.md`、`premise-challenge.md`、`ceo-review-mode.md`、`qa-test-mode.md`

### 1.0.0

🚀 **首个稳定版本发布**

- 9 个 Skills，12 个 Tools，94 个测试全部通过
- 完整的 brainstorm → plan → work → review → compound 工作流
- 合并了 Superpowers 精华：严格 TDD 门控、设计检查清单、审查纪律
- CI/CD 自动测试 + npm 发布

### 0.13.0

- 合并 Superpowers 精华到 CE skills
- `01-brainstorm`: 设计检查清单、停止条件、用户审批门控
- `02-plan`: 严格 TDD 红线（RED→GREEN→REFACTOR）、TDD 违规拒绝标准
- `03-work`: TDD 执行纪律、结构化完成报告格式
- `04-review`: 审查纪律（技术评估而非表演性同意）、YAGNI 检查

### 0.12.0

- 扩展 `session_checkpoint` 支持 `fail` 和 `retry` 操作

### 0.11.0

- 新增 `pattern_extractor` tool

### 0.10.0

- 新增 `session_history` tool

### 0.9.0

- 新增 `plan_diff` tool：增量计划更新

### 0.8.0

- 新增 `brainstorm_dialog` tool

### 0.7.0

- 新增 `task_splitter` tool：union-find 并行分组

### 0.6.0

- 新增 `session_checkpoint` tool：断点续传

### 0.5.0

- 新增 `parallel_subagent` tool

### 0.4.0

- 新增 `review_router` tool

### 0.3.0

- 新增 `worktree_manager` tool 和 `07-worktree` skill

### 0.2.0

- 新增 `workflow_state` tool 和 `06-next` skill

### 0.1.0–0.1.2

- 初始发布：7 个 skills、3 个 tools、CI/CD

---

## 仓库

- **GitHub**: https://github.com/leing2021/super-pi
- **npm**: https://www.npmjs.com/package/@leing2021/super-pi

## 开发

```bash
bun test
npm publish --dry-run
```

## CI/CD

- **Test**: 每次 push/PR 到 main 时运行 `bun test`
- **Publish**: 版本标签（`v*`）推送时运行 `bun test` + `npm publish`

### 发布流程

1. 在 `package.json` 中更新版本号
2. 更新 README 更新日志
3. `git commit -m "chore: bump to x.y.z"`
4. `git tag vx.y.z`
5. `git push origin main --tags`

### 必需的 Secrets

在 GitHub → Settings → Secrets → Actions 中设置 `NPM_TOKEN`。
