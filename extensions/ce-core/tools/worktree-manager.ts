import path from "node:path"

export type GitRunner = (args: string[]) => Promise<string>

export interface WorktreeManagerInput {
  operation: "create" | "detect" | "merge" | "cleanup"
  repoRoot: string
  branchName?: string
  worktreePath?: string
}

export interface WorktreeManagerResult {
  operation: string
  worktreePath?: string
  isWorktree?: boolean
  merged?: boolean
  cleanedUp?: boolean
}

export function createWorktreeManagerTool() {
  return {
    name: "worktree_manager",
    async execute(
      input: WorktreeManagerInput,
      runner: GitRunner,
    ): Promise<WorktreeManagerResult> {
      switch (input.operation) {
        case "create":
          return createWorktree(input, runner)
        case "detect":
          return detectWorktree(input, runner)
        case "merge":
          return mergeWorktree(input, runner)
        case "cleanup":
          return cleanupWorktree(input, runner)
        default:
          throw new Error(`Unknown operation: ${input.operation}`)
      }
    },
  }
}

async function createWorktree(
  input: WorktreeManagerInput,
  runner: GitRunner,
): Promise<WorktreeManagerResult> {
  const branchName = required(input.branchName, "branchName")
  const worktreeDir = `${path.basename(input.repoRoot)}-${normalizeBranchSlug(branchName)}`
  const worktreePath = path.join(path.dirname(input.repoRoot), worktreeDir)

  await runner(["git", "branch", branchName])
  await runner(["git", "worktree", "add", worktreePath, branchName])

  return {
    operation: "create",
    worktreePath,
  }
}

async function detectWorktree(
  input: WorktreeManagerInput,
  runner: GitRunner,
): Promise<WorktreeManagerResult> {
  const output = await runner(["git", "worktree", "list"])
  const lines = output.trim().split("\n")

  if (lines.length <= 1) {
    return { operation: "detect", isWorktree: false }
  }

  // Find a worktree that is not the main one
  const mainLine = lines[0]
  const worktreeLine = lines.find(
    (line) => line !== mainLine && line.includes(input.repoRoot),
  )

  if (worktreeLine) {
    const worktreePath = worktreeLine.split(/\s+/)[0]
    return { operation: "detect", isWorktree: true, worktreePath }
  }

  // Check if any secondary worktree exists
  const secondaryLine = lines.find((line) => line !== mainLine)
  if (secondaryLine) {
    const worktreePath = secondaryLine.split(/\s+/)[0]
    return { operation: "detect", isWorktree: true, worktreePath }
  }

  return { operation: "detect", isWorktree: false }
}

async function mergeWorktree(
  input: WorktreeManagerInput,
  runner: GitRunner,
): Promise<WorktreeManagerResult> {
  const branchName = required(input.branchName, "branchName")

  await runner(["git", "checkout", "main"])
  await runner(["git", "merge", branchName])

  return { operation: "merge", merged: true }
}

async function cleanupWorktree(
  input: WorktreeManagerInput,
  runner: GitRunner,
): Promise<WorktreeManagerResult> {
  const branchName = required(input.branchName, "branchName")
  const worktreePath = required(input.worktreePath, "worktreePath")

  await runner(["git", "worktree", "remove", worktreePath])
  await runner(["git", "branch", "-d", branchName])

  return { operation: "cleanup", cleanedUp: true }
}

function required(value: string | undefined, field: string): string {
  if (!value) {
    throw new Error(`worktree_manager requires ${field}`)
  }
  return value
}

function normalizeBranchSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}
