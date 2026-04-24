# Super Pi

**让 AI 编程 agent 从「写代码的工具」变成「靠谱的工程师」。**

安装后，告诉 Pi 你想做什么，然后不断说 **「继续」**。
Super Pi 会带你走完默认循环：

**想清楚 → 计划好 → 写代码 → 审查 → 沉淀经验**

```bash
pi install npm:@leing2021/super-pi
```

---

## Super Pi 解决什么问题

裸用 AI 编程 agent，常见有 3 个问题：

1. 还没想清楚就开干
2. 一中断就丢进度
3. 同样的坑反复踩

Super Pi 给这些问题加了一层工作流：

- **01-brainstorm** —— 先把要做什么想清楚
- **02-plan** —— 把需求变成执行单元
- **03-work** —— 受控执行计划
- **04-review** —— 审查改动、补风险检查
- **05-learn** —— 沉淀可复用经验

如果你不知道当前做到哪了，或者下一步该做什么，就用 **`08-status`**。

---

## 默认工作流

```text
01-brainstorm → 02-plan → 03-work → 04-review → 05-learn
```

### 主技能

| Skill | 适合什么场景 |
|------|--------------|
| `01-brainstorm` | 需求模糊、新想法、功能设计 |
| `02-plan` | 把已确认需求拆成执行单元 |
| `03-work` | 按计划实施 |
| `04-review` | 代码审查与可选 QA |
| `05-learn` | 沉淀长期可复用经验 |

### 状态 / 辅助入口

| Skill | 角色 |
|------|------|
| `08-status` | 默认的状态 + 下一步统一入口 |
| `06-next` | 下一步建议的兼容别名入口 |
| `09-help` | 辅助型使用/文档说明入口 |
| `07-worktree` | 高级可选路径：用于隔离开发 |
| `10-rules` | 渐进式编码规则加载 |

---

## 最短使用路径

### 新想法

```text
你: 我想做 X
→ 01-brainstorm
你: 继续
→ 02-plan
你: 继续
→ 03-work
→ 04-review
→ 05-learn
```

### 给现有项目加功能

```text
你: 我想加一个功能 X
→ 01-brainstorm
→ 02-plan
→ 03-work
→ 04-review
→ 05-learn
```

### 随时查看进度

```text
你: /skill:08-status
→ 显示当前工作流状态 + 推荐唯一最合适的下一步
```

---

## 说明

- `08-status` 是“我现在到哪了？”和“下一步该干嘛？”的默认入口
- `07-worktree` **不是**默认路径的一部分，只有在隔离开发值得额外复杂度时再用
- `09-help` 更偏文档说明，不是主流程步骤
- `06-next` 仅作为兼容入口保留

---

## 文件会生成到哪里

```text
your-project/
├── docs/
│   ├── brainstorms/
│   ├── plans/
│   └── solutions/
└── .context/
    └── compound-engineering/
        ├── checkpoints/
        ├── dialogs/
        └── history/
```

---

## 更多文档

- Token 开销：`docs/token-cost-evaluation.md`
- 计划与报告：`docs/plans/`、`docs/reports/`
- 经验沉淀：`docs/solutions/`
- 规则：`rules/`

---

## 仓库

- **GitHub**: https://github.com/leing2021/super-pi
- **npm**: https://www.npmjs.com/package/@leing2021/super-pi

## 开发

```bash
bun test
npm publish --dry-run
```
