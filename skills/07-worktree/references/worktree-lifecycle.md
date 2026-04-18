# Worktree lifecycle

## Default flow

1. `create` — derive branch name from plan topic or task description
2. `detect` — check if already in a worktree (avoid nested worktrees)
3. Execute work via `03-work` in the worktree directory
4. `merge` — merge feature branch back to main
5. `cleanup` — remove worktree and delete branch

## Branch naming

- Use `feat/<slug>` for feature work
- Use `fix/<slug>` for bug fixes
- Use `chore/<slug>` for maintenance tasks
- Slug is derived from the plan or task topic using `normalizeSlug`

## Error handling

- If worktree creation fails, check for existing worktrees with `detect`
- If merge has conflicts, report them and let the user resolve
- If cleanup fails, suggest manual `git worktree remove`
