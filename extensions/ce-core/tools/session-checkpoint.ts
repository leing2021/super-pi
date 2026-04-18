import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { normalizeSlug } from "../utils/name-utils"

export interface SessionCheckpointInput {
  operation: "save" | "load" | "list"
  repoRoot: string
  planPath?: string
  completedUnits?: string[]
}

export interface CheckpointEntry {
  planPath: string
  completedUnits: string[]
  updatedAt: string
}

export interface SessionCheckpointResult {
  operation: string
  planPath?: string
  completedUnits?: string[]
  updatedAt?: string
  checkpoints?: CheckpointEntry[]
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
        default:
          throw new Error(`Unknown operation: ${input.operation}`)
      }
    },
  }
}

async function saveCheckpoint(input: SessionCheckpointInput): Promise<SessionCheckpointResult> {
  const planPath = required(input.planPath, "planPath")
  const completedUnits = input.completedUnits ?? []
  const filePath = checkpointPath(input.repoRoot, planPath)
  const dir = path.dirname(filePath)

  await mkdir(dir, { recursive: true })

  const entry: CheckpointEntry = {
    planPath,
    completedUnits,
    updatedAt: new Date().toISOString(),
  }

  await writeFile(filePath, JSON.stringify(entry, null, 2), "utf8")

  return {
    operation: "save",
    planPath,
    completedUnits,
    updatedAt: entry.updatedAt,
  }
}

async function loadCheckpoint(input: SessionCheckpointInput): Promise<SessionCheckpointResult> {
  const planPath = required(input.planPath, "planPath")
  const filePath = checkpointPath(input.repoRoot, planPath)

  try {
    const content = await readFile(filePath, "utf8")
    const entry: CheckpointEntry = JSON.parse(content)
    return {
      operation: "load",
      planPath: entry.planPath,
      completedUnits: entry.completedUnits,
      updatedAt: entry.updatedAt,
    }
  } catch {
    return {
      operation: "load",
      planPath,
      completedUnits: [],
    }
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

function required(value: string | undefined, field: string): string {
  if (!value) {
    throw new Error(`session_checkpoint requires ${field}`)
  }
  return value
}
