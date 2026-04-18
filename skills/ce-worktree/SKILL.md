---
name: ce-worktree
description: Create and manage git worktrees for isolated feature development.
---

# ce-worktree

Use this skill when you need to create an isolated git worktree for feature work, merge changes back, or clean up after completion.

## Core rules

- Use the `worktree_manager` tool for all git worktree operations.
- Default behavior is to **automatically create** a worktree with a descriptive branch name derived from the plan or task.
- After creation, report the worktree path so that `ce-work` can execute inside it.
- On completion, merge back and clean up.
- Never force operations — if a worktree already exists, report its status instead of creating a duplicate.

## Workflow

1. **Create**: Use `worktree_manager` with operation `create` to spin up a new worktree with a feature branch.
2. **Detect**: Use `worktree_manager` with operation `detect` to check if already inside a worktree.
3. **Execute**: Run `ce-work` inside the worktree directory.
4. **Merge**: Use `worktree_manager` with operation `merge` to merge the feature branch back to main.
5. **Cleanup**: Use `worktree_manager` with operation `cleanup` to remove the worktree and delete the branch.

## Output

After creation, report:
- Worktree path
- Branch name
- Instruction to run `ce-work` in the worktree directory

After merge, report:
- Merge result
- Whether cleanup is recommended
