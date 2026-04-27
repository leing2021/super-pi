---
name: ce-review-only
description: 仅审查工作流：Reviewer 检查已完成的实现
---

## reviewer
reads: plan.md, context.md
model: anthropic/claude-sonnet-4-5
thinking: high
output: review-report.md

审查已完成的工作。对照计划验证实现是否满足要求，检查正确性、测试覆盖和代码质量。
