# Reviewer selection

Choose reviewers conditionally based on the diff scope.

- reviewer: correctness-reviewer
  condition: always
- reviewer: testing-reviewer
  condition: always
- reviewer: maintainability-reviewer
  condition: always
- reviewer: security-reviewer
  condition: select when auth, permissions, or user input are affected
- reviewer: performance-reviewer
  condition: select when queries, data volume, or caching are affected
