# Super Pi

**让 AI 编程 agent 从「写代码的工具」变成「靠谱的工程师」。**

安装后，告诉 Pi 你想做什么，然后不断说「继续」——它会自己走完 **想清楚 → 计划好 → 写代码 → 审查 → 沉淀经验** 的完整循环。

```bash
pi install npm:@leing2021/super-pi
```

---

## 为什么用 Super Pi

裸用 AI agent 写代码，三个常见问题：

1. **需求模糊就开干** —— 做完才发现不是想要的
2. **中断就丢上下文** —— 关掉终端，进度全失
3. **踩过的坑重复踩** —— 每次都在同一个地方翻车

Super Pi 的解法：

- **强迫先想清楚再动手** —— 不是填表，是 AI 逐条追问，像 YC partner 审项目一样逼你给出具体证据
- **断点自动续传** —— 中断后重启，跳过已完成的，从断点继续
- **自动沉淀经验** —— 解决过的坑变成可检索的知识卡片，下次遇到直接复用

---

## 五步核心循环

```
01-brainstorm → 02-plan → 03-work → 04-review → 05-compound
  想清楚          计划好      写代码       审查         沉淀
```

每一步都有专门的 skill + tool 配对，不是纯 prompt，是结构化的工具链。

---

## 每一步做了什么

### 01-brainstorm：想清楚

不是简单的「描述一下需求」。三种模式，匹配三种场景：

| 模式 | 适合 | 它会做什么 |
|------|------|-----------|
| **Startup Diagnostic** | 创业想法、新项目 | YC 式六道尖锐问题，逐条追问直到你有具体证据（不是「有人感兴趣」，是「谁会因为没这个产品而抓狂」） |
| **Builder Mode** | Side project、Hackathon | 只关注怎么做最酷的东西。如果你不小心聊到赚钱，自动升级到 Startup Diagnostic |
| **CE Brainstorm** | 给现有项目加功能 | 多轮对话澄清需求边界，生成结构化的需求文档 |

三个模式都强制跑一遍**前提挑战**（你的假设站得住吗？）和**方案对比**（至少生成一个最小方案 + 一个理想方案），然后才让你进入计划阶段。

### 02-plan：计划好

把需求拆成可执行的 implementation unit，每个 unit 严格遵循 **RED → GREEN → REFACTOR**（不写测试不许写代码）。

**增量更新**：需求变了？`plan_diff` 自动检测新增/删除/修改的 unit，打补丁而不是重写整个计划。

**CEO Review（可选）**：写完计划后，可以选 CEO Review。它会用 Bezos 不可逆决策、Munger 反演法、Jobs 减法原则来挑战你的计划，强制生成替代方案，画错误地图。相当于免费请了个刁钻的 CTO 审你的方案。

### 03-work：写代码

**并行执行**：`task_splitter` 用 Union-Find 算法分析文件依赖，把不冲突的 unit 扔给 `parallel_subagent` 并行跑。

**断点续传**：每个 unit 完成后自动存 checkpoint。中断了？下次启动自动加载，跳过已完成的，从断点继续。失败了？`fail` 记录错误 → `retry` 给出恢复策略（超时？加长超时。权限问题？先查权限。代码错误？先修再试）。

**严格 TDD**：先跑失败测试 → 写最小实现 → 测试通过 → 重构。每一步都要有命令输出作为证据，不允许跳步。

### 04-review：审查

**结构化代码审查**：`review_router` 根据 diff 自动匹配 reviewer 角色（改了支付代码？叫上安全审查员）。审查纪律是技术评估，不是走过场——每个 finding 必须引用具体代码，YAGNI 检查，不表演性同意。

**浏览器 QA（可选）**：用 `agent-browser` 打开你的应用，逐页点击测试，截图记录 bug，按严重程度排序修复，最多 3 轮自修复循环。还能自动写回归测试。相当于有个 QA 帮你做验收。

### 05-compound：沉淀

`pattern_extractor` 扫描已有 artifact，提取模式、分类归纳。把「这次踩的坑」变成带 YAML 标签的解决方案卡片，存入 `docs/solutions/`。

两级存储：项目特定的 → 项目内；跨项目通用的 → `~/.pi/agent/docs/solutions/` 全局可检索。

下次 `02-plan` 和 `04-review` 执行时，grep-first 策略自动搜索相关历史经验。

---

## 技术架构

### 10 个 Skills（工作流节点）

| Skill | 一句话 | 核心 Tool |
|-------|--------|----------|
| `01-brainstorm` | 三种模式的深度需求挖掘 | `brainstorm_dialog` |
| `02-plan` | 拆 unit、TDD 门控、增量更新 | `plan_diff` |
| `03-work` | 并行执行、断点续传、错误恢复 | `session_checkpoint`, `task_splitter`, `parallel_subagent` |
| `04-review` | 角色路由审查 + 浏览器真机测试 | `review_router` |
| `05-compound` | 模式提取 → 知识卡片沉淀 | `pattern_extractor` |
| `06-next` | 不知道该干嘛？问它 | `workflow_state`, `session_history` |
| `07-worktree` | Git worktree 隔离开发 | `worktree_manager` |
| `08-status` | 扫描 artifact，报告进度 | `workflow_state`, `session_history` |
| `09-help` | 使用指南 | — |
| `10-rules` | 渐进式编码规则按需加载 | — |

### 15 个 Tools（底层能力）

| Tool | 干什么 |
|------|--------|
| `task_splitter` | Union-Find 算法分析文件依赖，自动分组并行安全的 unit |
| `session_checkpoint` | JSON 持久化断点，支持 save/load/fail/retry 五种操作 |
| `plan_diff` | 增量计划：compare 检测差异，patch 打补丁 |
| `parallel_subagent` | `Promise.allSettled` 风格并行 subagent，支持上下文裁剪 |
| `review_router` | 根据 diff 元数据自动分配 reviewer 角色 |
| `pattern_extractor` | 从 artifact 中提取和分类模式 |
| `brainstorm_dialog` | 多轮对话状态机（start → refine × N → summarize） |
| `session_history` | 跨 session 执行历史记录和查询 |
| `workflow_state` | 扫描 docs/ 和 .context/ 汇总工作流状态 |
| `worktree_manager` | Git worktree 全生命周期管理 |
| `artifact_helper` | Artifact 路径解析和目录创建 |
| `ask_user_question` | 结构化用户提问（选项 / 自由输入） |
| `subagent` | 串行 subagent 链，带深度守卫和上下文控制 |
| `subagent-depth-guard` | 基于 env 的递归深度追踪（防止失控嵌套） |
| `async-mutex` | 序列化 `process.env` 变更，保障并发安全 |

---

## Token 开销

新开对话固定成本：**~2,500 tokens**（占 Claude Sonnet 4 的 200K context 的 1.26%）。

| 组成部分 | Tokens | 加载时机 |
|---------|--------|----------|
| 10 个 Skill 注册 | ~615 | 每次对话（固定） |
| 13 个 Tool 注册 | ~1,914 | 每次对话（固定） |
| Hooks & Filter | 0 | 运行时拦截，零 prompt 开销 |
| 单次 skill 触发 | ~1,000–4,000 | 按需 read |
| Rules 最小必读（2 文件） | ~900 | plan/work 前 |
| Rules + 语言层（7 文件） | ~2,600 | 涉及特定语言时 |

| 裸 Pi | 全局规则注入 | super-pi |
|-------|------------|---------|
| 无规则 | 全量加载 | 渐进式按需 |
| 无输出过滤 | 无输出过滤 | 自动压缩（bash ~65–98%，read ~30–60%） |
| 无 TDD 门控 | 无 TDD 门控 | Hard gate 防止返工 |
| 0 tokens | ~5,000–36,000 tokens | **~2,500 tokens** |

一次 `npm install` 输出过滤即可回本。完整评估 → [`docs/token-cost-evaluation.md`](docs/token-cost-evaluation.md)

---

## 代码规模

~2500 行 TypeScript 实现 15 个 tool，22 个 Markdown reference 文件 + 78 个规则文件驱动 10 个 skill，162 个测试覆盖全部 tool 逻辑。

不是大而全的框架。每个 tool 职责单一，每个 skill 可独立使用，组合起来是完整工作流。

---

## 快速上手

### 新想法

```
你: 我想做一个帮助独立开发者找用户的工具

→ 自动进入 01-brainstorm，YC 式追问
→ 生成 docs/brainstorms/2026-04-18-find-users-requirements.md
→ 推荐下一步: 02-plan

你: 继续

→ 02-plan 拆 unit，可选 CEO Review
→ 生成 docs/plans/2026-04-18-find-users-plan.md

你: 继续

→ 03-work 并行执行，断点续传
→ 04-review 代码审查 + 可选浏览器 QA
→ 05-compound 沉淀经验
```

### 给现有项目加功能

```
你: 给项目加一个用户认证功能

→ 01-brainstorm CE 模式，多轮对话澄清 OAuth2? JWT? MFA?
→ 生成需求文档 → 02-plan 拆 unit → 03-work 执行 → 04-review → 05-compound
```

### 中断后恢复

```
你: /skill:03-work docs/plans/auth-plan.md

→ 自动加载 checkpoint，跳过已完成 unit，从断点继续
```

### 需求变了

```
你: 需求变了，需要加 SSO 支持

→ 02-plan 用 plan_diff 检测变化，增量更新，不重写整个计划
```

### 随时查进度

```
你: /skill:08-status

→ 扫描所有 artifact，显示进度 + 推荐下一步
```

---

## 生成的文件结构

```
your-project/
├── docs/
│   ├── brainstorms/                  # 需求文档（01-brainstorm 生成）
│   ├── plans/                        # 执行计划（02-plan 生成）
│   └── solutions/                    # 经验卡片（05-compound 生成）
└── .context/
    └── compound-engineering/
        ├── checkpoints/              # 断点文件（session_checkpoint 生成）
        ├── dialogs/                  # 对话状态（brainstorm_dialog 生成）
        └── history/                  # 执行历史（session_history 生成）
```

**建议全部 commit 进 git** —— 这些文件就是项目的可追溯记忆。

### `10-rules`：渐进式规则加载

内置编码规则位于包的 `rules/` 目录下。`10-rules` skill 采用**渐进式加载**——绝不全量加载，只读当前任务需要的部分。

**加载链路：**

```
system prompt（30 tokens：skill 名称 + 描述）
  → 10-rules SKILL.md（~200 tokens：加载决策树）
    → 具体规则文件通过 read 工具按需加载（900–2600 tokens）
```

三个 CE skill 在入口处自动触发规则加载：

| Skill | 预加载的规则 |
|-------|-------------|
| `02-plan` | `common/development-workflow.md` + `common/testing.md` |
| `03-work` | 匹配当前代码库的语言规则 |
| `04-review` | `common/code-review.md` + 变更文件的语言规则 |

**规则优先级**（同一主题多层重叠时）：

```
语言规则  >  web  >  common
```

做 brainstorm、查状态等非编码任务时，不加载任何规则。零浪费。

#### 内置规则层

| 层级 | 文件数 | 何时加载 |
|------|--------|----------|
| `common/` | 10 个文件 | 始终加载（所有任务的基线） |
| `typescript/`、`python/`、`cpp/`、`csharp/`、`dart/`、`golang/`、`java/`、`kotlin/`、`perl/`、`php/`、`rust/`、`swift/` | 各 5 个文件 | 任务涉及该语言时 |
| `web/` | 7 个文件（含 `design-quality.md`、`performance.md`） | 前端/浏览器相关时 |

#### DIY：自定义规则

规则就是 `rules/` 目录下的纯 Markdown 文件，随意编辑，无需配置。

**添加语言**——创建新目录，放入 5 个标准主题文件：

```bash
mkdir rules/elixir
touch rules/elixir/{coding-style,testing,patterns,security,hooks}.md
```

每个文件开头建议写明：

```markdown
> 本文件是 [common/xxx.md](../common/xxx.md) 的 Elixir 特定扩展。
```

**删除不需要的语言**——直接删目录：

```bash
rm -rf rules/perl rules/cpp  # 用不到？直接删
```

**调整规则**——直接编辑 `.md` 文件：

```bash
# 修改团队的测试规范
vim rules/common/testing.md

# 修改特定语言的测试规范
vim rules/typescript/testing.md
```

**新增主题**——在对应层级创建新 `.md` 文件即可：

```bash
# 通用主题
vim rules/common/api-design.md

# 语言特定覆盖
vim rules/python/api-design.md
```

`10-rules` skill 会自动发现 `rules/` 下的所有 `.md` 文件——不需要任何配置。语言目录存在就能加载，删了就不会被加载。

---

## 设计理念 & 致谢

**80% 规划和审查，20% 执行。**

不是让 AI 写得更快，是让 AI 想清楚再写、写完要审查、审完要沉淀。速度来自减少返工，不是来自跳步。

以下项目的思想对本项目有直接启发：

- **[everything-claude-code](https://github.com/affaan-m/everything-claude-code)**（162K★）→ 并行 subagent 编排、断点续传、持续学习循环
- **[superpowers](https://github.com/obra/superpowers)**（161K★）→ 严格 TDD 门控、设计检查清单、审查纪律
- **[gstack](https://github.com/garrytan/gstack)**（78K★）→ YC 式追问、CEO Review 认知框架、浏览器 QA
- **[compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin)**（14K★）→ 五步循环、知识复合骨架

不是 fork，不是套壳。取方法论，用 Pi 原生 tool + skill 体系重新实现。

---

## 最佳实践

| 建议 | 为什么 |
|------|--------|
| 从 01-brainstorm 开始 | 不管什么场景，先想清楚永远不亏 |
| 大功能用 07-worktree | 隔离开发，不影响主分支 |
| 用 CEO Review 审计划 | 相当于免费请了个刁钻的 CTO |
| 用浏览器 QA 验收 | 代码审查看不到布局错乱和白屏 |
| 执行中断不要慌 | 下次 03-work 自动从 checkpoint 继续 |
| 不知道该干嘛用 08-status | 扫一眼就知道做到哪了 |

---

## 更新日志

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

---

## 仓库

- **GitHub**: https://github.com/leing2021/super-pi
- **npm**: https://www.npmjs.com/package/@leing2021/super-pi

## 开发

```bash
bun test
npm publish --dry-run
```
