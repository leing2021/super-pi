---
name: ce-parallel-review
description: 多角度并行审查：正确性 + 测试 + 复杂度
---

## reviewer[angle=correctness]
reads: plan.md, progress.md, context.md
output: review-correctness.md

审查实现的正确性：
- 实现是否符合计划要求
- 代码逻辑是否正确
- 边界情况是否处理
- 错误处理是否完善

## reviewer[angle=tests]
reads: plan.md, progress.md, context.md
output: review-tests.md

审查测试覆盖和质量：
- 是否有对应的测试
- 测试是否覆盖关键路径
- 测试是否可维护
- 测试命名是否清晰

## reviewer[angle=complexity]
reads: plan.md, progress.md, context.md
output: review-complexity.md

审查代码复杂度和设计：
- 代码是否过于复杂
- 是否有不必要的抽象
- 是否遵循项目惯例
- 是否有潜在的性能问题
