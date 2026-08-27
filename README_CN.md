# Super Pi



![Super Pi Workflow](docs/assets/super-pi.webp)



[中文](README_CN.md) | [English](README.md) 



**让 AI 编程 agent 从「写代码的工具」变成「靠谱的工程师」。**

Super Pi 是 Pi-native 的工程 workflow 层：它给 coding agent 加上阶段纪律、持久化 artifacts、TDD gates、checkpoint、review 和学习闭环。

安装后,告诉 Pi 你想做什么,然后不断说「继续」——它会自己走完 

**想清楚 → 计划好 → 写代码 → 审查 → 沉淀经验** 的完整循环。

```bash
pi install npm:@leing2021/super-pi
```

> **项目信任 (pi ≥ 0.79)：** Pi 加载项目本地 settings、resources 和 packages 前会询问。首次使用时批准项目信任提示，让 Super Pi 能读取 `.pi/settings.json` 并加载其 skills/extensions。非交互运行用 `pi --approve`。

## 五步核心循环

```
01-brainstorm → 02-plan → 03-work → 04-review → 05-learn
  想清楚          计划好      写代码       审查         沉淀
```

| Skill | 功能 | 核心工具 |
|-------|------|----------|
| **01-brainstorm** | YC 风格追问,三种模式(Startup/Builder/CE),领域词汇持久化 | `brainstorm_dialog` |
| **02-plan** | RED→GREEN→REFACTOR,增量更新,可选 CEO Review | `plan_diff` |
| **03-work** | inline 执行,断点续传,严格 TDD | `session_checkpoint`, `task_splitter` |
| **04-review** | 自动分配评审,六轴发现(Standards + Spec),自动修复循环 | `review_router` |
| **05-learn** | 模式提取 → 可搜索知识卡片 | `pattern_extractor` |
| **06-next** | 下一步推荐 + 完整状态报告 | `workflow_state` |
| **07-worktree** | 隔离 git worktree 开发 | `worktree_manager` |

### 模型与思考深度路由

在 `.pi/settings.json` 中配置:

```json
{
  "modelStrategy": {
    "01-brainstorm": "anthropic/claude-sonnet-4-20250514",
    "02-plan": "anthropic/claude-opus-4-20250115"
  },
  "thinkingStrategy": {
    "01-brainstorm": "high",
    "02-plan": "high",
    "03-work": "medium"
  }
}
```

模型和思考深度自动切换——无需手动 `/model`。

## 设计哲学与致谢

**80% 规划和审查，20% 执行。**

目标不是让 AI 更快地写代码，而是让 AI 写之前先想清楚、写之后认真审查，并把解决过的问题沉淀下来。

Super Pi 不是 fork，也不是 wrapper。它从下面这些项目中提取有价值的方法，并用 Pi 原生的 skills、tools、artifacts、checkpoints 和 handoffs 重新实现。

| 项目 | Super Pi 借鉴的核心内容 |
|------|--------------------------|
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | “Use when” 技能触发条件、source-driven verification、stop-the-line hard gate、anti-rationalization、五轴 review baseline。仅作为嵌入式微模式吸收，不新增 skills/tools/commands/agents。 |
| [everything-claude-code (ECC)](https://github.com/affaan-m/ECC) | Checkpoint 断点续传、持续学习循环、token-conscious agent workflow 设计。（仓库已改名，原链接失效。） |
| [humanlayer/12-factor-agents](https://github.com/humanlayer/12-factor-agents) | context window ownership、压缩已解决错误、限制重复重试、预取明显前置数据。作为轻量上下文卫生规则吸收到现有 Phase 1 pipeline 中。 |
| [superpowers](https://github.com/obra/superpowers) | 严格 TDD gates、设计检查清单、review discipline、rationalization table（借口 → 现实对照表），以及“agent 需要硬门禁而不是温和建议”的理念。 |
| [compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) | think → plan → build → review → learn 五步循环、knowledge compounding 骨架，以及 solution retirement（知识须能退出，而非只增不减）。 |
| [gstack](https://github.com/garrytan/gstack) | YC 式 forcing questions、CEO Review 认知框架、Browser QA 模式、failure maps、evidence-first validation。 |
| [mattpocock/skills](https://github.com/mattpocock/skills) | 领域词汇表（`CONTEXT.md`）、轻量 ADR（三条件门槛 + "What qualifies" 清单）、反馈环优先调试纪律、deep-module 词汇（含 internal seams/rejected framings）、拷问纪律（事实 vs 决策、一次一问）、review Spec 轴、out-of-scope 知识库。以自包含 `skills/references/` 内容形式吸收——无外部路径依赖、无 issue tracker 依赖，不碎接独立技能（super-pi 现有 01-brainstorm/domain-language/module-design 已覆盖主动纪律）。 |
| [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | The Ladder（7 级极简决策链：需要存在吗 → 代码库复用 → stdlib → 平台原生 → 已装依赖 → 一行 → 最小实现）、`debt:` 债务标记约定（指名上限与升级触发条件）、依赖轴 review 标签（`stdlib:` / `native:` / `dependency:`，流入 04-review Standards 轴）。以 `rules/common/` 规则内容形式嵌入——不吸收三档强度、hooks/MCP、独立技能。 |

---

## 快速开始

```
你: 我想做一个帮助独立开发者找到用户的工具

→ 01-brainstorm: YC 风格追问 → docs/brainstorms/requirements.md
→ 02-plan: RED→GREEN→REFACTOR 单元 → docs/plans/plan.md
→ 03-work: inline 执行,断点续传
→ 04-review: 结构化发现,可选浏览器 QA
→ 05-learn: 知识沉淀

你: 继续
→ /skill:06-next 自动推荐下一个步骤
```

**中断后恢复:**
```
你: /skill:03-work docs/plans/plan.md
→ 自动加载 checkpoint,跳过已完成单元,从断点继续
```

---

## Token 消耗

新对话开销: **~4,130 tokens** (200K 上下文的 2.1%)。

| 组件 | Tokens |
|------|--------|
| 17 个 skill 注册 | ~1,710 |
| 22 个 tool schemas | ~2,420 |
| Skill 内联 (每次调用) | ~300–1,200 |

按需加载:只加载当前需要的 skills。

详细评估 → [docs/token-cost-evaluation.md](docs/token-cost-evaluation.md)（包含 per-skill 详细分解和测量方法）

---

## 生成的结构

```
your-project/
├── docs/
│   ├── brainstorms/      # 需求文档
│   ├── plans/             # 执行计划
│   ├── adr/               # 架构决策记录（按需创建）
│   └── solutions/         # 知识卡片
└── .context/
    └── compound-engineering/
        ├── checkpoints/  # 断点文件
        ├── dialogs/      # 对话状态
        └── history/       # 执行历史
```

**把所有文件提交到 git** ——这些文件是项目的可追溯记忆。

---

## 技术架构

- **7 个 skills** 配专用工具
- **12 CE + 10 Pi 内置工具**
- **~4,100 行** TypeScript, **180 个测试** (727 assertions)
- **渐进式规则加载** ——只加载当前任务需要的

规则放在 `rules/` (11 个通用 + 语言特定)。项目级规则优先。

---

## 更新日志

完整版本历史请查看 [CHANGELOG_CN.md](./CHANGELOG_CN.md)。

## 仓库

- **GitHub**: https://github.com/leing2021/super-pi
- **npm**: https://www.npmjs.com/package/@leing2021/super-pi


