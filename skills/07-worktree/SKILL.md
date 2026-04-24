---
name: 07-worktree
description: Create and manage git worktrees for isolated feature development.
---

# 03-worktree

Use this skill only when isolated git worktree development is explicitly needed for larger or higher-risk work.

## Positioning

- `07-worktree` is an **advanced / optional** workflow helper.
- It is not part of the default Compound Engineering path.
- Most users should stay on the main flow unless they specifically need branch/worktree isolation.

## Core rules

- Use the `worktree_manager` tool for all git worktree operations.
- Default behavior is to **automatically create** a worktree with a descriptive branch name derived from the plan or task.
- After creation, report the worktree path so that `03-work` can execute inside it.
- On completion, merge back and clean up.
- Never force operations — if a worktree already exists, report its status instead of creating a duplicate.

## Workflow

1. **Create**: Use `worktree_manager` with operation `create` to spin up a new worktree with a feature branch.
2. **Detect**: Use `worktree_manager` with operation `detect` to check if already inside a worktree.
3. **Execute**: Run `03-work` inside the worktree directory.
4. **Merge**: Use `worktree_manager` with operation `merge` to merge the feature branch back to main.
5. **Cleanup**: Use `worktree_manager` with operation `cleanup` to remove the worktree and delete the branch.

## Output

After creation, report:
- Worktree path
- Branch name
- Instruction to run `03-work` in the worktree directory

After merge, report:
- Merge result
- Whether cleanup is recommended
