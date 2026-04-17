import path from "node:path"
import { normalizeSlug } from "./name-utils"

export function getBrainstormArtifactPath(repoRoot: string, date: string, topic: string): string {
  return path.join(repoRoot, "docs", "brainstorms", `${date}-${normalizeSlug(topic)}-requirements.md`)
}

export function getPlanArtifactPath(repoRoot: string, date: string, topic: string): string {
  return path.join(repoRoot, "docs", "plans", `${date}-${normalizeSlug(topic)}-plan.md`)
}

export function getSolutionArtifactPath(
  repoRoot: string,
  category: string,
  topic: string,
  date: string,
): string {
  return path.join(repoRoot, "docs", "solutions", normalizeSlug(category), `${date}-${normalizeSlug(topic)}.md`)
}

export function getRunArtifactPath(repoRoot: string, skillName: string, runId: string): string {
  return path.join(repoRoot, ".context", "compound-engineering", normalizeSlug(skillName), runId)
}
