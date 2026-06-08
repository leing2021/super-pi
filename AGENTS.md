# AGENTS.md — Super Pi

## Project Overview

Super Pi is a Pi-native engineering workflow layer: brainstorm → plan → work → review → learn.
Built with TypeScript, tested with Bun test runner, published to npm as `@leing2021/super-pi`.

## Tech Stack

- Runtime: Bun
- Language: TypeScript (strict)
- Test: `bun test`
- Build: `bun run build`
- Publish: `npm publish` via GitHub Actions on tag push

## Key Commands

```bash
bun test              # Run all tests
bun run build         # Build the project
bun run lint          # Lint (if configured)
```

## Architecture

```
skills/          # 7 pipeline skills (01-brainstorm through 07-worktree)
  references/    # Shared templates and schemas
  rules/         # Coding standards (common + language-specific)
extensions/      # Optional Pi extensions
tests/           # Test files
docs/            # Documentation and assets
```

## Code Style

- TypeScript strict mode
- Functions < 50 lines, files < 800 lines
- No deep nesting (> 4 levels)
- No `console.log` or debug statements in production code
- No hardcoded secrets or credentials
- Explicit error handling (no silent catches)

## Review Guidelines

### Priority Levels

Codex 使用以下优先级分级审核所有 PR：

| Priority | Label | 含义 | 处理 |
|----------|-------|------|------|
| **P0** | 🔴 阻断 | 安全漏洞、逻辑错误、数据丢失风险 | 必须修复，阻止合并 |
| **P1** | 🟡 重要 | 缺失测试、错误处理不当、性能问题 | 强烈建议修复 |
| **P2** | 🟢 建议 | 代码风格、可读性、命名优化 | 酌情处理 |

### P0 — 必须标记（Block）

- 安全漏洞：XSS、SQL injection、auth bypass、hardcoded secrets
- 逻辑错误：off-by-one、null/undefined 未处理、race condition
- 数据丢失风险：删除操作无确认、不可逆变更无备份机制
- 破坏性变更未标记 `BREAKING CHANGE`
- 引入未经 source-driven verification 的框架 API 用法
- `bun test` 无法通过
- 违反 stop-the-line 规则：发现失败后继续添加功能

### P1 — 建议标记（Important）

- 新功能缺失对应测试
- 测试覆盖率低于 80%
- 缺失或错误的错误处理（空 catch、吞掉异常）
- 函数超过 50 行或文件超过 800 行
- 嵌套层级超过 4 层
- 缺失 public API 的 JSDoc/TSDoc 注释
- 变更影响 `skills/` 下的 skill 注册或触发条件但未更新对应测试

### P2 — 可选标记（Suggestion）

- 命名不够清晰或不符合项目约定
- 代码可读性改进（提取变量、简化条件表达式）
- 性能微优化（减少不必要的拷贝、缓存计算结果）
- 注释可以更精确

### 不应标记

- TODO 注释（除非引入了风险）
- 缺失内部/private 函数的文档
- 已有充分测试的代码要求更多测试
- 与本次变更无关的历史代码问题
- 纯主观的风格偏好（无功能影响）

### 审核语言

- 审核评论使用**中文**
- 代码示例和引用保持英文
- 技术术语保持英文原文（如 TDD、RED/GREEN/REFACTOR、checkpoint）

### 审核行为要求

- 每条建议必须**引用具体代码行**
- 建议必须给出**具体修复方案**，而非只描述问题
- 对 TypeScript 项目特别关注：类型安全、严格模式合规、any 类型使用
- 对 `skills/` 目录特别关注：skill 注册格式、触发条件准确性、SKILL.md frontmatter 完整性
- 对 `rules/` 目录特别关注：规则的可执行性和明确性

## Commit Convention

This project follows Conventional Commits v1.0:

```
feat(skill): add new pipeline stage
fix(checkpoint): resolve resume-from-checkpoint edge case
docs(readme): update installation instructions
chore(deps): upgrade dependencies
```
