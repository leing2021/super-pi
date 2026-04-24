import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { normalizeSlug } from "../utils/name-utils"

export interface SessionCheckpointInput {
  operation: "save" | "load" | "list" | "fail" | "retry"
  repoRoot: string
  planPath?: string
  completedUnits?: string[]
  failedUnit?: string
  error?: string
  activeFiles?: string[]
  currentUnit?: string
  blocker?: string
  verification?: string
  contextTiers?: {
    hot: string[]
    warm: string[]
    cold: string[]
  }
  handoffPath?: string
}

export interface CheckpointEntry {
  planPath: string
  completedUnits: string[]
  updatedAt: string
  status?: "active" | "failed"
  failedUnit?: string
  error?: string
  activeFiles?: string[]
  currentUnit?: string
  blocker?: string
  verification?: string
  contextTiers?: {
    hot: string[]
    warm: string[]
    cold: string[]
  }
  handoffPath?: string
}

export interface SessionCheckpointResult {
  operation: string
  planPath?: string
  completedUnits?: string[]
  updatedAt?: string
  status?: string
  failedUnit?: string
  error?: string
  strategy?: string
  retryFrom?: string
  checkpoints?: CheckpointEntry[]
  activeFiles?: string[]
  currentUnit?: string
  blocker?: string
  verification?: string
  contextTiers?: {
    hot: string[]
    warm: string[]
    cold: string[]
  }
  handoffPath?: string
}

function checkpointDir(repoRoot: string): string {
  return path.join(repoRoot, ".context", "compound-engineering", "checkpoints")
}

function checkpointPath(repoRoot: string, planPath: string): string {
  const slug = normalizeSlug(planPath.replace(/\//g, "-"))
  return path.join(checkpointDir(repoRoot), `${slug}.json`)
}

export function createSessionCheckpointTool() {
  return {
    name: "session_checkpoint",
    async execute(input: SessionCheckpointInput): Promise<SessionCheckpointResult> {
      switch (input.operation) {
        case "save":
          return saveCheckpoint(input)
        case "load":
          return loadCheckpoint(input)
        case "list":
          return listCheckpoints(input)
        case "fail":
          return failCheckpoint(input)
        case "retry":
          return retryCheckpoint(input)
        default:
          throw new Error(`Unknown operation: ${input.operation}`)
      }
    },
  }
}

async function readEntry(repoRoot: string, planPath: string): Promise<CheckpointEntry | null> {
  const filePath = checkpointPath(repoRoot, planPath)
  try {
    const content = await readFile(filePath, "utf8")
    return JSON.parse(content)
  } catch {
    return null
  }
}

async function writeEntry(repoRoot: string, entry: CheckpointEntry): Promise<void> {
  const filePath = checkpointPath(repoRoot, entry.planPath)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(entry, null, 2), "utf8")
}

async function saveCheckpoint(input: SessionCheckpointInput): Promise<SessionCheckpointResult> {
  const planPath = required(input.planPath, "planPath")
  const completedUnits = input.completedUnits ?? []

  const entry: CheckpointEntry = {
    planPath,
    completedUnits,
    updatedAt: new Date().toISOString(),
    status: "active",
    activeFiles: input.activeFiles,
    currentUnit: input.currentUnit,
    blocker: input.blocker,
    verification: input.verification,
    contextTiers: input.contextTiers,
    handoffPath: input.handoffPath,
  }

  await writeEntry(input.repoRoot, entry)

  return {
    operation: "save",
    planPath,
    completedUnits,
    updatedAt: entry.updatedAt,
    activeFiles: entry.activeFiles,
    currentUnit: entry.currentUnit,
    blocker: entry.blocker,
    verification: entry.verification,
    contextTiers: entry.contextTiers,
    handoffPath: entry.handoffPath,
  }
}

async function loadCheckpoint(input: SessionCheckpointInput): Promise<SessionCheckpointResult> {
  const planPath = required(input.planPath, "planPath")
  const entry = await readEntry(input.repoRoot, planPath)

  if (!entry) {
    return { operation: "load", planPath, completedUnits: [] }
  }

  return {
    operation: "load",
    planPath: entry.planPath,
    completedUnits: entry.completedUnits,
    updatedAt: entry.updatedAt,
    activeFiles: entry.activeFiles,
    currentUnit: entry.currentUnit,
    blocker: entry.blocker,
    verification: entry.verification,
    contextTiers: entry.contextTiers,
    handoffPath: entry.handoffPath,
  }
}

async function listCheckpoints(input: SessionCheckpointInput): Promise<SessionCheckpointResult> {
  const dir = checkpointDir(input.repoRoot)

  try {
    const files = await readdir(dir)
    const checkpoints: CheckpointEntry[] = []

    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const content = await readFile(path.join(dir, file), "utf8")
          checkpoints.push(JSON.parse(content))
        } catch {
          // Skip malformed files
        }
      }
    }

    return { operation: "list", checkpoints }
  } catch {
    return { operation: "list", checkpoints: [] }
  }
}

async function failCheckpoint(input: SessionCheckpointInput): Promise<SessionCheckpointResult> {
  const planPath = required(input.planPath, "planPath")
  const entry = await readEntry(input.repoRoot, planPath)

  if (!entry) {
    throw new Error("No checkpoint found. Use 'save' first.")
  }

  entry.status = "failed"
  entry.failedUnit = input.failedUnit ?? ""
  entry.error = input.error ?? ""
  entry.updatedAt = new Date().toISOString()

  await writeEntry(input.repoRoot, entry)

  return {
    operation: "fail",
    planPath: entry.planPath,
    status: "failed",
    failedUnit: entry.failedUnit,
    error: entry.error,
    completedUnits: entry.completedUnits,
    updatedAt: entry.updatedAt,
    activeFiles: entry.activeFiles,
    currentUnit: entry.currentUnit,
    blocker: entry.blocker,
    verification: entry.verification,
    contextTiers: entry.contextTiers,
    handoffPath: entry.handoffPath,
  }
}

async function retryCheckpoint(input: SessionCheckpointInput): Promise<SessionCheckpointResult> {
  const planPath = required(input.planPath, "planPath")
  const entry = await readEntry(input.repoRoot, planPath)

  if (!entry) {
    throw new Error("No checkpoint found.")
  }

  if (entry.status !== "failed") {
    throw new Error("Checkpoint is not in a failed state. Nothing to retry.")
  }

  // Determine retry strategy based on error type
  const errorLower = (entry.error ?? "").toLowerCase()
  let strategy = "retry-unit"

  if (errorLower.includes("timeout")) {
    strategy = "retry-with-longer-timeout"
  } else if (errorLower.includes("permission") || errorLower.includes("access")) {
    strategy = "check-permissions-then-retry"
  } else if (errorLower.includes("typeerror") || errorLower.includes("syntax")) {
    strategy = "fix-code-then-retry"
  } else if (errorLower.includes("not found") || errorLower.includes("enoent")) {
    strategy = "verify-files-then-retry"
  }

  return {
    operation: "retry",
    planPath: entry.planPath,
    status: "retry",
    retryFrom: entry.failedUnit,
    completedUnits: entry.completedUnits,
    strategy,
    updatedAt: entry.updatedAt,
    activeFiles: entry.activeFiles,
    currentUnit: entry.currentUnit,
    blocker: entry.blocker,
    verification: entry.verification,
    contextTiers: entry.contextTiers,
    handoffPath: entry.handoffPath,
  }
}

function required(value: string | undefined, field: string): string {
  if (!value) {
    throw new Error(`session_checkpoint requires ${field}`)
  }
  return value
}
