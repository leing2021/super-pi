import { readdirSync, existsSync, readFileSync } from "node:fs"
import path from "node:path"

export interface WorkflowCategoryState {
  count: number
  latest: string | null
}

export interface WorkflowContextState {
  found: boolean
  currentStage?: string
  nextStage?: string
  contextHealth?: string
  latestHandoffPath?: string
  latestDatedHandoffPath?: string
  activeFiles: string[]
  recentlyAccessedFiles: string[]
  blocker?: string
  verification?: string
  currentTruth: string[]
  invalidatedAssumptions: string[]
  openDecisions: string[]
  compressionRisk: string[]
  recommendNewSession?: boolean
  updatedAt?: string
}

export interface WorkflowStateInput {
  repoRoot: string
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

function emptyContext(): WorkflowContextState {
  return {
    found: false,
    activeFiles: [],
    recentlyAccessedFiles: [],
    currentTruth: [],
    invalidatedAssumptions: [],
    openDecisions: [],
    compressionRisk: [],
  }
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function readContextState(repoRoot: string): WorkflowContextState {
  const statePath = path.join(repoRoot, ".context", "compound-engineering", "context-state.json")
  if (!existsSync(statePath)) return emptyContext()

  try {
    const raw = readFileSync(statePath, "utf8")
    const state = JSON.parse(raw) as Record<string, unknown>
    return {
      found: true,
      currentStage: typeof state.currentStage === "string" ? state.currentStage : undefined,
      nextStage: typeof state.nextStage === "string" ? state.nextStage : undefined,
      contextHealth: typeof state.contextHealth === "string" ? state.contextHealth : undefined,
      latestHandoffPath: typeof state.latestHandoffPath === "string" ? state.latestHandoffPath : undefined,
      latestDatedHandoffPath: typeof state.latestDatedHandoffPath === "string" ? state.latestDatedHandoffPath : undefined,
      activeFiles: toStringArray(state.activeFiles),
      recentlyAccessedFiles: toStringArray(state.recentlyAccessedFiles),
      blocker: typeof state.blocker === "string" ? state.blocker : undefined,
      verification: typeof state.verification === "string" ? state.verification : undefined,
      currentTruth: toStringArray(state.currentTruth),
      invalidatedAssumptions: toStringArray(state.invalidatedAssumptions),
      openDecisions: toStringArray(state.openDecisions),
      compressionRisk: toStringArray(state.compressionRisk),
      recommendNewSession: typeof state.recommendNewSession === "boolean" ? state.recommendNewSession : undefined,
      updatedAt: typeof state.updatedAt === "string" ? state.updatedAt : undefined,
    }
  } catch {
    return emptyContext()
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
        context: readContextState(repoRoot),
      }
    },
  }
}
