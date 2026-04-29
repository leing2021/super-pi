---
name: 07-worktree
description: Create and manage git worktrees for isolated feature development.
---

# Worktree

Use this skill when you need optional isolated git worktree development for large, risky, or parallel feature work, then merge changes back or clean up after completion.

## Core rules

- Use the `worktree_manager` tool for all git worktree operations.
- Create a worktree only when the user explicitly asks for isolation, or when the task is large/risky enough and the user confirms.
- Use a descriptive branch name derived from the plan or task.
- After creation, report the worktree path so that `03-work` can execute inside it.
- On completion, offer to merge back and clean up; ask for confirmation before changing the main worktree or deleting branches.
- Never force operations — if a worktree already exists, report its status instead of creating a duplicate.

## Workflow

1. **Detect**: Use `worktree_manager` with operation `detect` to check if already inside a worktree.
2. **Create**: When confirmed, use `worktree_manager` with operation `create` to spin up a new worktree with a feature branch.
3. **Execute**: Run `03-work` inside the worktree directory.
4. **Merge**: After user confirmation, use `worktree_manager` with operation `merge` to merge the feature branch back to main.
5. **Cleanup**: After user confirmation, use `worktree_manager` with operation `cleanup` to remove the worktree and delete the branch.

## Output

After creation, report:
- Worktree path
- Branch name
- Instruction to run `03-work` in the worktree directory

After merge, report:
- Merge result
- Whether cleanup is recommended
