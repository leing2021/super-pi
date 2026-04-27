---
name: ce-standard
description: 标准 Compound Engineering 工作流：Scout → Planner → Worker → Reviewer
---

## scout
output: context.md

探索当前代码库，了解与 {task} 相关的结构和上下文。快速但不猜测，聚焦关键入口点、数据流和风险。

## planner
reads: context.md
output: plan.md

基于 {previous} 创建实施计划。遵循 TDD，每个单元必须以 RED 测试开始。命名具体文件和验证命令。

## worker
reads: context.md, plan.md
defaultProgress: true
output: progress.md

执行 {previous} 中的计划。遵循 RED → GREEN → REFACTOR。更新 progress.md 记录进度。

## reviewer
reads: plan.md, progress.md, context.md
output: review-report.md

审查实施结果。对照计划验证正确性，修复可自动修复的问题。报告需要用户确认的发现。
