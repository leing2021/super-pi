import { readdirSync, statSync, existsSync } from "node:fs"
import path from "node:path"

export interface WorkflowCategoryState {
  count: number
  latest: string | null
}

export interface WorkflowStateInput {
  repoRoot: string
}

export interface WorkflowStateResult {
  brainstorms: WorkflowCategoryState
  plans: WorkflowCategoryState
  solutions: WorkflowCategoryState
  runs: WorkflowCategoryState
}

function emptyCategory(): WorkflowCategoryState {
  return { count: 0, latest: null }
}

function scanDir(dirPath: string): WorkflowCategoryState {
  if (!existsSync(dirPath)) {
    return emptyCategory()
  }

  const files = collectFiles(dirPath)

  if (files.length === 0) {
    return emptyCategory()
  }

  const sorted = files.sort()
  const latest = sorted[sorted.length - 1]

  return {
    count: files.length,
    latest: path.basename(latest),
  }
}

function collectFiles(dirPath: string): string[] {
  const results: string[] = []

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        results.push(...collectFiles(fullPath))
      } else if (entry.isFile()) {
        results.push(fullPath)
      }
    }
  } catch {
    // Directory not readable, treat as empty
  }

  return results
}

export function createWorkflowStateTool() {
  return {
    name: "workflow_state",
    async execute(input: WorkflowStateInput): Promise<WorkflowStateResult> {
      const repoRoot = input.repoRoot

      return {
        brainstorms: scanDir(path.join(repoRoot, "docs", "brainstorms")),
        plans: scanDir(path.join(repoRoot, "docs", "plans")),
        solutions: scanDir(path.join(repoRoot, "docs", "solutions")),
        runs: scanDir(path.join(repoRoot, ".context", "compound-engineering")),
      }
    },
  }
}
