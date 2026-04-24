import { readdirSync, existsSync, readFileSync } from "node:fs"
import path from "node:path"

export interface WorkflowCategoryState {
  count: number
  latest: string | null
}

export interface WorkflowStateInput {
  repoRoot: string
}

export interface WorkflowContextState {
  currentStage: string | null
  nextStage: string | null
  contextHealth: "good" | "watch" | "heavy" | "critical"
  latestHandoffPath: string | null
  blocker: string | null
  recommendNewSession: boolean
  suggestedNextAction: string | null
}

export interface WorkflowStateResult {
  brainstorms: WorkflowCategoryState
  plans: WorkflowCategoryState
  solutions: WorkflowCategoryState
  runs: WorkflowCategoryState
  context: WorkflowContextState
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

function defaultContextState(): WorkflowContextState {
  return {
    currentStage: null,
    nextStage: null,
    contextHealth: "watch",
    latestHandoffPath: null,
    blocker: null,
    recommendNewSession: false,
    suggestedNextAction: null,
  }
}

function contextStatePath(repoRoot: string): string {
  return path.join(repoRoot, ".context", "compound-engineering", "context-state.json")
}

function loadContextState(repoRoot: string): WorkflowContextState {
  const filePath = contextStatePath(repoRoot)
  if (!existsSync(filePath)) {
    return defaultContextState()
  }

  try {
    const raw = readFileSync(filePath, "utf8")
    const parsed = JSON.parse(raw) as {
      currentStage?: string
      nextStage?: string
      contextHealth?: "good" | "watch" | "heavy" | "critical"
      latestHandoffPath?: string
      blocker?: string
      recommendNewSession?: boolean
    }

    const currentStage = parsed.currentStage ?? null
    const nextStage = parsed.nextStage ?? null

    return {
      currentStage,
      nextStage,
      contextHealth: parsed.contextHealth ?? "watch",
      latestHandoffPath: parsed.latestHandoffPath ?? null,
      blocker: parsed.blocker ?? null,
      recommendNewSession: parsed.recommendNewSession ?? false,
      suggestedNextAction: parsed.recommendNewSession
        ? "open-new-session-with-latest-handoff"
        : nextStage
          ? `continue-${nextStage}`
          : null,
    }
  } catch {
    return defaultContextState()
  }
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
        context: loadContextState(repoRoot),
      }
    },
  }
}
