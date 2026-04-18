import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { normalizeSlug } from "../utils/name-utils"

export interface BrainstormDialogInput {
  operation: "start" | "refine" | "summarize"
  repoRoot: string
  artifactPath: string
  analysis?: string
  questions?: string[]
  userResponses?: string[]
}

export interface DialogState {
  artifactPath: string
  round: number
  status: "in_progress" | "complete"
  analysis: string
  openQuestions: string[]
  history: DialogRound[]
}

export interface DialogRound {
  round: number
  analysis: string
  questions: string[]
  userResponses: string[]
}

export interface BrainstormDialogResult {
  artifactPath: string
  round: number
  status: "in_progress" | "complete"
  analysis: string
  openQuestions: string[]
}

function dialogDir(repoRoot: string): string {
  return path.join(repoRoot, ".context", "compound-engineering", "dialogs")
}

function dialogPath(repoRoot: string, artifactPath: string): string {
  const slug = normalizeSlug(artifactPath.replace(/\//g, "-"))
  return path.join(dialogDir(repoRoot), `${slug}.json`)
}

export function createBrainstormDialogTool() {
  return {
    name: "brainstorm_dialog",
    async execute(input: BrainstormDialogInput): Promise<BrainstormDialogResult> {
      switch (input.operation) {
        case "start":
          return startDialog(input)
        case "refine":
          return refineDialog(input)
        case "summarize":
          return summarizeDialog(input)
        default:
          throw new Error(`Unknown operation: ${input.operation}`)
      }
    },
  }
}

async function readState(repoRoot: string, artifactPath: string): Promise<DialogState | null> {
  const filePath = dialogPath(repoRoot, artifactPath)
  try {
    const content = await readFile(filePath, "utf8")
    return JSON.parse(content)
  } catch {
    return null
  }
}

async function writeState(repoRoot: string, state: DialogState): Promise<void> {
  const filePath = dialogPath(repoRoot, state.artifactPath)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8")
}

async function startDialog(input: BrainstormDialogInput): Promise<BrainstormDialogResult> {
  const existing = await readState(input.repoRoot, input.artifactPath)
  if (existing) {
    return {
      artifactPath: existing.artifactPath,
      round: existing.round,
      status: existing.status,
      analysis: existing.analysis,
      openQuestions: existing.openQuestions,
    }
  }

  const state: DialogState = {
    artifactPath: input.artifactPath,
    round: 1,
    status: "in_progress",
    analysis: input.analysis ?? "",
    openQuestions: input.questions ?? [],
    history: [
      {
        round: 1,
        analysis: input.analysis ?? "",
        questions: input.questions ?? [],
        userResponses: [],
      },
    ],
  }

  await writeState(input.repoRoot, state)

  return {
    artifactPath: state.artifactPath,
    round: state.round,
    status: state.status,
    analysis: state.analysis,
    openQuestions: state.openQuestions,
  }
}

async function refineDialog(input: BrainstormDialogInput): Promise<BrainstormDialogResult> {
  const existing = await readState(input.repoRoot, input.artifactPath)
  if (!existing) {
    throw new Error("No dialog found. Use 'start' first.")
  }

  existing.round += 1
  existing.analysis = input.analysis ?? existing.analysis
  existing.openQuestions = input.questions ?? []

  existing.history.push({
    round: existing.round,
    analysis: existing.analysis,
    questions: existing.openQuestions,
    userResponses: input.userResponses ?? [],
  })

  await writeState(input.repoRoot, existing)

  return {
    artifactPath: existing.artifactPath,
    round: existing.round,
    status: existing.status,
    analysis: existing.analysis,
    openQuestions: existing.openQuestions,
  }
}

async function summarizeDialog(input: BrainstormDialogInput): Promise<BrainstormDialogResult> {
  const existing = await readState(input.repoRoot, input.artifactPath)
  if (!existing) {
    throw new Error("No dialog found. Use 'start' first.")
  }

  existing.status = "complete"
  existing.analysis = input.analysis ?? existing.analysis
  existing.openQuestions = []

  await writeState(input.repoRoot, existing)

  return {
    artifactPath: existing.artifactPath,
    round: existing.round,
    status: existing.status,
    analysis: existing.analysis,
    openQuestions: [],
  }
}
