import { mkdir } from "node:fs/promises"
import path from "node:path"
import {
  getBrainstormArtifactPath,
  getPlanArtifactPath,
  getSolutionArtifactPath,
  getRunArtifactPath,
} from "../utils/artifact-paths"

export type ArtifactType = "brainstorm" | "plan" | "solution" | "run"

export interface ArtifactHelperInput {
  repoRoot: string
  artifactType: ArtifactType
  date?: string
  topic?: string
  category?: string
  skillName?: string
  runId?: string
  ensureDir?: boolean
}

export interface ArtifactHelperResult {
  path: string
  createdDirectories: string[]
}

export function createArtifactHelperTool() {
  return {
    name: "artifact_helper",
    async execute(input: ArtifactHelperInput): Promise<ArtifactHelperResult> {
      const artifactPath = resolveArtifactPath(input)
      const directory = input.artifactType === "run" ? artifactPath : path.dirname(artifactPath)
      const createdDirectories: string[] = []

      if (input.ensureDir) {
        await mkdir(directory, { recursive: true })
        createdDirectories.push(directory)
      }

      return {
        path: artifactPath,
        createdDirectories,
      }
    },
  }
}

function resolveArtifactPath(input: ArtifactHelperInput): string {
  switch (input.artifactType) {
    case "brainstorm":
      return getBrainstormArtifactPath(input.repoRoot, required(input.date, "date"), required(input.topic, "topic"))
    case "plan":
      return getPlanArtifactPath(input.repoRoot, required(input.date, "date"), required(input.topic, "topic"))
    case "solution":
      return getSolutionArtifactPath(
        input.repoRoot,
        required(input.category, "category"),
        required(input.topic, "topic"),
        required(input.date, "date"),
      )
    case "run":
      return getRunArtifactPath(input.repoRoot, required(input.skillName, "skillName"), required(input.runId, "runId"))
  }
}

function required(value: string | undefined, field: string): string {
  if (!value) {
    throw new Error(`artifact_helper requires ${field}`)
  }

  return value
}
