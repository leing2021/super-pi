import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { normalizeSlug } from "../utils/name-utils"

export interface HistoryEntry {
  id: string
  skill: string
  artifactPath: string
  summary: string
  timestamp: string
}

export interface SessionHistoryInput {
  operation: "record" | "query" | "latest"
  repoRoot: string
  skill?: string
  artifactPath?: string
  summary?: string
}

export interface SessionHistoryResult {
  operation: string
  entries: HistoryEntry[]
}

function historyDir(repoRoot: string): string {
  return path.join(repoRoot, ".context", "compound-engineering", "history")
}

let _counter = 0

export function _resetCounter() { _counter = 0 }

export function createSessionHistoryTool() {
  return {
    name: "session_history",
    async execute(input: SessionHistoryInput): Promise<SessionHistoryResult> {
      switch (input.operation) {
        case "record":
          return recordExecution(input)
        case "query":
          return queryHistory(input)
        case "latest":
          return latestPerSkill(input)
        default:
          throw new Error(`Unknown operation: ${input.operation}`)
      }
    },
  }
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}

async function readAllEntries(repoRoot: string): Promise<HistoryEntry[]> {
  const dir = historyDir(repoRoot)
  try {
    const files = await readdir(dir)
    const entries: HistoryEntry[] = []
    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const content = await readFile(path.join(dir, file), "utf8")
          entries.push(JSON.parse(content))
        } catch {
          // skip malformed
        }
      }
    }
    return entries.sort((a, b) => a.id.localeCompare(b.id))
  } catch {
    return []
  }
}

async function recordExecution(input: SessionHistoryInput): Promise<SessionHistoryResult> {
  const dir = historyDir(input.repoRoot)
  await ensureDir(dir)

  const id = `${Date.now()}-${String(++_counter).padStart(6, "0")}-${normalizeSlug(input.skill ?? "unknown")}`
  const entry: HistoryEntry = {
    id,
    skill: input.skill ?? "",
    artifactPath: input.artifactPath ?? "",
    summary: input.summary ?? "",
    timestamp: new Date().toISOString(),
  }

  const filePath = path.join(dir, `${id}.json`)
  await writeFile(filePath, JSON.stringify(entry, null, 2), "utf8")

  return { operation: "record", entries: [entry] }
}

async function queryHistory(input: SessionHistoryInput): Promise<SessionHistoryResult> {
  const all = await readAllEntries(input.repoRoot)
  const filtered = input.skill
    ? all.filter((e) => e.skill === input.skill)
    : all

  return { operation: "query", entries: filtered }
}

async function latestPerSkill(input: SessionHistoryInput): Promise<SessionHistoryResult> {
  const all = await readAllEntries(input.repoRoot)
  const latestMap = new Map<string, HistoryEntry>()

  for (const entry of all) {
    const existing = latestMap.get(entry.skill)
    if (!existing || entry.id > existing.id) {
      latestMap.set(entry.skill, entry)
    }
  }

  return { operation: "latest", entries: Array.from(latestMap.values()) }
}
