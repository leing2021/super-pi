# Pi Compound Engineering

一个 Pi 原生的 Compound Engineering 包，用于迭代开发工作流。

**94 个测试通过 · 9 个 Skills · 12 个 Tools · CI/CD 自动发布**

## 安装

```bash
pi install npm:pi-compound-engineering
```

---

## 快速开始

安装后，对 Pi 说你想做什么，然后不断说"继续"即可走完整个工作流。

### 场景 A：从零开始一个新功能

```
你: 我想给项目加一个用户认证功能

→ /skill:ce-brainstorm
→ 多轮对话澄清需求（OAuth2? JWT? MFA?）
→ 生成 docs/brainstorms/2026-04-18-auth-requirements.md
→ 推荐下一步: ce-plan

你: 继续

→ /skill:ce-plan
→ 读取 requirements artifact
→ task_splitter 分析依赖，拆分 implementation units
→ 生成 docs/plans/2026-04-18-auth-plan.md
→ 推荐下一步: ce-work

你: 继续

→ /skill:ce-work
→ session_checkpoint 加载断点（首次为空）
→ task_splitter 分析哪些 units 可并行
→ parallel_subagent 并行执行独立任务
→ session_checkpoint 记录每个完成的单元
→ 推荐下一步: ce-review

你: 继续

→ /skill:ce-review
→ review_router 推荐 reviewer 角色（security, performance...）
→ 结构化 findings（autofixable 的问题自动修复）
→ 推荐下一步: ce-compound

你: 继续

→ /skill:ce-compound
→ pattern_extractor 从 artifacts 中提取可复用模式
→ 写入 docs/solutions/auth/oauth2-solution.md
```

### 场景 B：随时检查项目状态

```
你: /skill:ce-status

→ 扫描 docs/brainstorms/、docs/plans/、docs/solutions/
→ 查询 session_history 了解最近执行记录
→ 显示当前进度 + 推荐下一步
```

### 场景 C：不知道下一步做什么

```
你: /skill:ce-next

→ workflow_state 扫描 artifacts
→ session_history 查询历史
→ 推荐最合适的下一个 skill + 理由
```

### 场景 D：需求变了，更新计划

```
你: 需求变了，需要加 SSO 支持

→ /skill:ce-plan
→ plan_diff compare 检测 added/removed/modified units
→ plan_diff patch 增量更新 plan
→ 不需要重写整个 plan
```

### 场景 E：执行中断后恢复

```
你: /skill:ce-work docs/plans/auth-plan.md

→ session_checkpoint.load 发现已完成的单元
→ 自动跳过已完成部分，从断点继续
```

### 场景 F：隔离开发

```
你: /skill:ce-worktree

→ worktree_manager 创建 git worktree 隔离环境
→ 在 worktree 中执行 ce-work
→ 完成后 merge 回主分支
```

### 场景 G：执行失败后恢复

```
你: /skill:ce-work docs/plans/auth-plan.md

→ session_checkpoint.fail 记录失败上下文
→ session_checkpoint.retry 返回重试策略
  - timeout → retry-with-longer-timeout
  - permission → check-permissions-then-retry
  - TypeError/SyntaxError → fix-code-then-retry
  - file-not-found → verify-files-then-retry
→ 按策略修复后继续执行
```

---

## Skills（9 个）

| Skill | 命令 | 描述 | 关联 Tools |
|-------|------|------|-----------|
| `ce-help` | `/skill:ce-help` | 使用指南 | — |
| `ce-status` | `/skill:ce-status` | 检查项目状态 | `workflow_state`, `session_history` |
| `ce-next` | `/skill:ce-next` | 推荐下一步 | `workflow_state`, `session_history` |
| `ce-brainstorm` | `/skill:ce-brainstorm` | 多轮需求发现 | `brainstorm_dialog` |
| `ce-plan` | `/skill:ce-plan` | 创建/更新实施计划 | `plan_diff` |
| `ce-work` | `/skill:ce-work` | 执行计划（并行+断点+恢复） | `session_checkpoint`, `task_splitter`, `parallel_subagent` |
| `ce-review` | `/skill:ce-review` | 结构化代码审查 | `review_router` |
| `ce-compound` | `/skill:ce-compound` | 知识复合 | `pattern_extractor` |
| `ce-worktree` | `/skill:ce-worktree` | Worktree 隔离开发 | `worktree_manager` |

---

## Tools（12 个）

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

## 生成的文件结构

使用后在你的项目中会生成：

```
your-project/
├── docs/
│   ├── brainstorms/                        # ce-brainstorm 生成
│   │   └── 2026-04-18-auth-requirements.md
│   ├── plans/                              # ce-plan 生成
│   │   └── 2026-04-18-auth-plan.md
│   └── solutions/                          # ce-compound 生成
│       └── auth/
│           └── oauth2-solution.md
└── .context/
    └── compound-engineering/
        ├── checkpoints/                    # session_checkpoint 生成
        │   └── docs-plans-auth-plan.json
        ├── dialogs/                        # brainstorm_dialog 生成
        │   └── docs-brainstorms-auth.json
        └── history/                        # session_history 生成
            └── 1745000000-ce-brainstorm.json
```

---

## 核心工作流

```
ce-brainstorm → ce-plan → ce-work → ce-review → ce-compound
      ↑              ↑         ↑          ↑           ↑
 brainstorm_dialog  plan_diff  task_splitter  review_router  pattern_extractor
                              parallel_subagent
                              session_checkpoint (save/fail/retry)
                              session_history
```

`ce-help`、`ce-status`、`ce-next`、`ce-worktree` 可在任意阶段使用。

---

## 最佳实践

| 建议 | 说明 |
|------|------|
| **每次从 ce-brainstorm 开始** | 即使需求很明确，也值得快速走一遍 |
| **用 ce-status 检查进度** | 不确定做到哪了就用 ce-status |
| **用 ce-next 找方向** | 不知道下一步就用 ce-next |
| **把 artifacts 纳入 git** | `docs/` 和 `.context/` 都应该 commit |
| **大功能用 ce-worktree** | 隔离开发，不影响主分支 |
| **执行中断不要慌** | 下次 ce-work 会自动从 checkpoint 恢复 |
| **失败后用 retry** | session_checkpoint 会根据错误类型推荐恢复策略 |

---

## 更新日志

### 0.12.0

- 扩展 `session_checkpoint` 支持 `fail` 和 `retry` 操作，用于错误恢复
- `fail` 记录失败上下文（失败单元、错误信息）
- `retry` 根据错误类型返回恢复策略（timeout、permission、syntax、file-not-found）
- 更新 `ce-work` 加入错误恢复工作流
- 94 个测试通过

### 0.11.0

- 新增 `pattern_extractor` tool：从 artifacts 中提取重复模式并分类
- 更新 `ce-compound` 使用 `pattern_extractor` 生成更智能的 solution
- 92 个测试通过

### 0.10.0

- 新增 `session_history` tool：记录、查询 CE skill 执行历史
- 更新 `ce-status` 和 `ce-next` 利用 session history 提供更智能的建议
- 87 个测试通过

### 0.9.0

- 新增 `plan_diff` tool：比较和补丁 plan units，支持增量更新
- 更新 `ce-plan` 支持增量更新工作流
- 83 个测试通过

### 0.8.0

- 新增 `brainstorm_dialog` tool：管理多轮 brainstorm 对话
- 更新 `ce-brainstorm` 支持迭代细化工作流
- 79 个测试通过

### 0.7.0

- 新增 `task_splitter` tool：基于 union-find 的文件级依赖分析
- 更新 `ce-work` 使用 `task_splitter` 智能决定并行/串行执行
- 74 个测试通过

### 0.6.0

- 新增 `session_checkpoint` tool：断点续传
- 更新 `ce-work` 支持中断后自动恢复
- 68 个测试通过

### 0.5.0

- 新增 `parallel_subagent` tool：并发执行独立任务
- 更新 `ce-work` 推荐对独立单元使用并行执行
- 63 个测试通过

### 0.4.0

- 新增 `review_router` tool：基于 diff 的 reviewer 路由
- 更新 `ce-review` 加入 autofix 循环指导
- 59 个测试通过

### 0.3.0

- 新增 `worktree_manager` tool 和 `ce-worktree` skill
- 53 个测试通过

### 0.2.0

- 新增 `workflow_state` tool 和 `ce-next` skill
- 46 个测试通过

### 0.1.0–0.1.2

- 初始发布：7 个 skills、3 个 tools、CI/CD
- 32–41 个测试通过

---

## 仓库

- **GitHub**: https://github.com/leing2021/pi-compound-engineering
- **npm**: https://www.npmjs.com/package/pi-compound-engineering

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
