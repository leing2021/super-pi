import { mkdir, readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { normalizeSlug } from "../utils/name-utils"

export type ContextHealth = "good" | "watch" | "heavy" | "critical"

export type ContextHandoffRecommendedAction = "continue" | "save_handoff" | "fill_required_context"

export interface ContextHandoffValidationCheck {
  name: string
  passed: boolean
  reason: string
}

export interface ContextHandoffValidationProbes {
  recall: boolean
  continuation: boolean
  artifact: boolean
  decision: boolean
}

export interface ContextHandoffInput {
  operation: "save" | "load" | "latest" | "status" | "validate"
  repoRoot: string
  currentStage?: string
  nextStage?: string
  contextHealth?: ContextHealth
  activeFiles?: string[]
  blocker?: string
  verification?: string
  artifacts?: Record<string, string | undefined>
  handoffMarkdown?: string
  handoffPath?: string
  currentTruth?: string[]
  invalidatedAssumptions?: string[]
  openDecisions?: string[]
  recentlyAccessedFiles?: string[]
  compressionRisk?: string[]
  activeRules?: string[]
}

export interface ContextStateEntry {
  currentStage: string
  nextStage?: string
  contextHealth: ContextHealth
  latestHandoffPath?: string
  latestDatedHandoffPath?: string
  activeFiles: string[]
  blocker?: string
  verification?: string
  artifacts: Record<string, string | undefined>
  currentTruth: string[]
  invalidatedAssumptions: string[]
  openDecisions: string[]
  recentlyAccessedFiles: string[]
  compressionRisk: string[]
  activeRules: string[]
  recommendNewSession: boolean
  updatedAt: string
}

export interface ContextHandoffResult {
  operation: string
  found?: boolean
  path?: string
  latestPath?: string
  currentStage?: string
  nextStage?: string
  contextHealth?: ContextHealth
  activeFiles?: string[]
  blocker?: string
  verification?: string
  artifacts?: Record<string, string | undefined>
  recommendNewSession?: boolean
  handoffMarkdown?: string
  currentTruth?: string[]
  invalidatedAssumptions?: string[]
  openDecisions?: string[]
  recentlyAccessedFiles?: string[]
  compressionRisk?: string[]
  activeRules?: string[]
  updatedAt?: string
  // Validation fields
  ok?: boolean
  probes?: ContextHandoffValidationProbes
  checks?: ContextHandoffValidationCheck[]
  missing?: string[]
  warnings?: string[]
  recommendedAction?: ContextHandoffRecommendedAction
}

function ceDir(repoRoot: string): string {
  return path.join(repoRoot, ".context", "compound-engineering")
}

function handoffDir(repoRoot: string): string {
  return path.join(ceDir(repoRoot), "handoffs")
}

function stateFilePath(repoRoot: string): string {
  return path.join(ceDir(repoRoot), "context-state.json")
}

function latestHandoffPath(repoRoot: string): string {
  return path.join(handoffDir(repoRoot), "latest.md")
}

function toRepoRelative(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath)
}

function resolveRepoPath(repoRoot: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath)
}

function stageSlug(value?: string): string {
  if (!value || value.trim().length === 0) return "unknown"
  return normalizeSlug(value)
}

function buildDatedHandoffPath(repoRoot: string, currentStage?: string, nextStage?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const fileName = `${timestamp}-${stageSlug(currentStage)}-to-${stageSlug(nextStage)}.md`
  return path.join(handoffDir(repoRoot), fileName)
}

function computeRecommendNewSession(currentStage?: string, nextStage?: string, contextHealth: ContextHealth = "watch"): boolean {
  const isCrossPhase = Boolean(currentStage && nextStage && currentStage !== nextStage)
  const isHeavy = contextHealth === "heavy" || contextHealth === "critical"
  return isCrossPhase && isHeavy
}

function formatBullets(items: string[]): string {
  if (items.length === 0) return "- N/A"
  return items.map(item => `- ${item}`).join("\n")
}

function formatArtifacts(artifacts: Record<string, string | undefined>): string {
  const lines = Object.entries(artifacts)
    .filter(([, value]) => Boolean(value && value.trim().length > 0))
    .map(([key, value]) => `- ${key}: ${value}`)

  if (lines.length === 0) return "- N/A"
  return lines.join("\n")
}

function buildDefaultHandoffMarkdown(input: {
  currentStage: string
  nextStage?: string
  activeFiles: string[]
  artifacts: Record<string, string | undefined>
  blocker?: string
  verification?: string
  currentTruth: string[]
  invalidatedAssumptions: string[]
  openDecisions: string[]
  recentlyAccessedFiles: string[]
  compressionRisk: string[]
  activeRules: string[]
}): string {
  const currentTask = input.nextStage
    ? `Continue from ${input.currentStage} to ${input.nextStage}.`
    : `Continue ${input.currentStage}.`

  const hotContext = formatBullets(input.activeFiles.slice(0, 5))

  const verifiedFacts = formatBullets([
    `Current stage: ${input.currentStage}`,
    `Next stage: ${input.nextStage ?? "N/A"}`,
  ])

  const activeFiles = formatBullets(input.activeFiles.slice(0, 5))
  const artifacts = formatArtifacts(input.artifacts)
  const blocker = input.blocker ?? "N/A"
  const verification = input.verification ?? "Not run"
  const nextMinimalStep = input.nextStage ? `/skill:${input.nextStage}` : "N/A"

  return [
    "## Current Task",
    currentTask,
    "",
    "## Hot Context",
    hotContext,
    "",
    "## Current Truth",
    formatBullets(input.currentTruth),
    "",
    "## Verified Facts",
    verifiedFacts,
    "",
    "## Invalidated Assumptions",
    formatBullets(input.invalidatedAssumptions),
    "",
    "## Open Decisions",
    formatBullets(input.openDecisions),
    "",
    "## Active Files",
    activeFiles,
    "",
    "## Active Rules",
    formatBullets(input.activeRules),
    "",
    "## Recently Accessed Files",
    formatBullets(input.recentlyAccessedFiles),
    "",
    "## Artifacts",
    artifacts,
    "",
    "## Current Blocker",
    `- ${blocker}`,
    "",
    "## Verification",
    `- ${verification}`,
    "",
    "## Compression Risk",
    formatBullets(input.compressionRisk),
    "",
    "## Do Not Repeat",
    "- Do not reload full history unless the handoff lacks required evidence.",
    "",
    "## Next Minimal Step",
    `- ${nextMinimalStep}`,
    "",
  ].join("\n")
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function normalizeStateEntry(raw: unknown): ContextStateEntry | null {
  if (!raw || typeof raw !== "object") return null

  const state = raw as Record<string, unknown>
  const activeFiles = toStringArray(state.activeFiles)

  return {
    currentStage: typeof state.currentStage === "string" ? state.currentStage : "unknown",
    nextStage: typeof state.nextStage === "string" ? state.nextStage : undefined,
    contextHealth: isContextHealth(state.contextHealth) ? state.contextHealth : "watch",
    latestHandoffPath: typeof state.latestHandoffPath === "string" ? state.latestHandoffPath : undefined,
    latestDatedHandoffPath: typeof state.latestDatedHandoffPath === "string" ? state.latestDatedHandoffPath : undefined,
    activeFiles,
    blocker: typeof state.blocker === "string" ? state.blocker : undefined,
    verification: typeof state.verification === "string" ? state.verification : undefined,
    artifacts: isStringRecord(state.artifacts) ? state.artifacts : {},
    currentTruth: toStringArray(state.currentTruth),
    invalidatedAssumptions: toStringArray(state.invalidatedAssumptions),
    openDecisions: toStringArray(state.openDecisions),
    recentlyAccessedFiles: toStringArray(state.recentlyAccessedFiles).length > 0
      ? toStringArray(state.recentlyAccessedFiles)
      : activeFiles.slice(0, 5),
    compressionRisk: toStringArray(state.compressionRisk),
    activeRules: toStringArray(state.activeRules),
    recommendNewSession: typeof state.recommendNewSession === "boolean" ? state.recommendNewSession : false,
    updatedAt: typeof state.updatedAt === "string" ? state.updatedAt : new Date(0).toISOString(),
  }
}

function isContextHealth(value: unknown): value is ContextHealth {
  return value === "good" || value === "watch" || value === "heavy" || value === "critical"
}

function isStringRecord(value: unknown): value is Record<string, string | undefined> {
  if (!value || typeof value !== "object") return false
  return Object.values(value).every(item => item === undefined || typeof item === "string")
}

async function readState(repoRoot: string): Promise<ContextStateEntry | null> {
  const filePath = stateFilePath(repoRoot)
  if (!existsSync(filePath)) return null

  try {
    const content = await readFile(filePath, "utf8")
    return normalizeStateEntry(JSON.parse(content))
  } catch {
    return null
  }
}

async function writeState(repoRoot: string, state: ContextStateEntry): Promise<void> {
  const filePath = stateFilePath(repoRoot)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8")
}

export function createContextHandoffTool() {
  return {
    name: "context_handoff",
    async execute(input: ContextHandoffInput): Promise<ContextHandoffResult> {
      switch (input.operation) {
        case "save":
          return save(input)
        case "load":
          return load(input)
        case "latest":
          return latest(input)
        case "status":
          return status(input)
        case "validate":
          return validate(input)
        default:
          throw new Error(`Unknown operation: ${input.operation}`)
      }
    },
  }
}

async function save(input: ContextHandoffInput): Promise<ContextHandoffResult> {
  const currentStage = input.currentStage ?? "unknown"
  const nextStage = input.nextStage
  const contextHealth = input.contextHealth ?? "watch"
  const activeFiles = input.activeFiles ?? []
  const blocker = input.blocker
  const verification = input.verification
  const artifacts = input.artifacts ?? {}
  const currentTruth = input.currentTruth ?? []
  const invalidatedAssumptions = input.invalidatedAssumptions ?? []
  const openDecisions = input.openDecisions ?? []
  const recentlyAccessedFiles = input.recentlyAccessedFiles?.length
    ? input.recentlyAccessedFiles
    : activeFiles.slice(0, 5)
  const compressionRisk = input.compressionRisk ?? []
  const activeRules = input.activeRules ?? []

  const handoffMarkdown = input.handoffMarkdown?.trim().length
    ? input.handoffMarkdown
    : buildDefaultHandoffMarkdown({
      currentStage,
      nextStage,
      activeFiles,
      artifacts,
      blocker,
      verification,
      currentTruth,
      invalidatedAssumptions,
      openDecisions,
      recentlyAccessedFiles,
      compressionRisk,
      activeRules,
    })

  const recommendNewSession = computeRecommendNewSession(currentStage, nextStage, contextHealth)
  const latestPath = latestHandoffPath(input.repoRoot)
  const datedPath = buildDatedHandoffPath(input.repoRoot, currentStage, nextStage)
  const relativeLatestPath = toRepoRelative(input.repoRoot, latestPath)
  const relativeDatedPath = toRepoRelative(input.repoRoot, datedPath)

  await mkdir(path.dirname(latestPath), { recursive: true })
  await writeFile(latestPath, handoffMarkdown, "utf8")
  await writeFile(datedPath, handoffMarkdown, "utf8")

  const state: ContextStateEntry = {
    currentStage,
    nextStage,
    contextHealth,
    latestHandoffPath: relativeLatestPath,
    latestDatedHandoffPath: relativeDatedPath,
    activeFiles,
    blocker,
    verification,
    artifacts,
    currentTruth,
    invalidatedAssumptions,
    openDecisions,
    recentlyAccessedFiles,
    compressionRisk,
    activeRules,
    recommendNewSession,
    updatedAt: new Date().toISOString(),
  }

  await writeState(input.repoRoot, state)

  return {
    operation: "save",
    found: true,
    path: relativeDatedPath,
    latestPath: relativeLatestPath,
    currentStage,
    nextStage,
    contextHealth,
    activeFiles,
    blocker,
    verification,
    artifacts,
    currentTruth,
    invalidatedAssumptions,
    openDecisions,
    recentlyAccessedFiles,
    compressionRisk,
    activeRules,
    recommendNewSession,
    updatedAt: state.updatedAt,
  }
}

async function load(input: ContextHandoffInput): Promise<ContextHandoffResult> {
  const state = await readState(input.repoRoot)
  if (!state) {
    return {
      operation: "load",
      found: false,
      contextHealth: "watch",
      recommendNewSession: false,
    }
  }

  const targetPath = input.handoffPath ?? state.latestHandoffPath ?? latestHandoffPath(input.repoRoot)
  const absoluteTargetPath = resolveRepoPath(input.repoRoot, targetPath)
  let markdown = ""
  if (existsSync(absoluteTargetPath)) {
    markdown = await readFile(absoluteTargetPath, "utf8")
  }

  return {
    operation: "load",
    found: true,
    path: targetPath,
    latestPath: state.latestHandoffPath,
    currentStage: state.currentStage,
    nextStage: state.nextStage,
    contextHealth: state.contextHealth,
    activeFiles: state.activeFiles,
    blocker: state.blocker,
    verification: state.verification,
    artifacts: state.artifacts,
    currentTruth: state.currentTruth,
    invalidatedAssumptions: state.invalidatedAssumptions,
    openDecisions: state.openDecisions,
    recentlyAccessedFiles: state.recentlyAccessedFiles,
    compressionRisk: state.compressionRisk,
    activeRules: state.activeRules,
    recommendNewSession: state.recommendNewSession,
    handoffMarkdown: markdown,
    updatedAt: state.updatedAt,
  }
}

async function latest(input: ContextHandoffInput): Promise<ContextHandoffResult> {
  const state = await readState(input.repoRoot)
  if (!state || !state.latestHandoffPath) {
    return {
      operation: "latest",
      found: false,
      contextHealth: "watch",
      recommendNewSession: false,
    }
  }

  return {
    operation: "latest",
    found: true,
    path: state.latestDatedHandoffPath,
    latestPath: state.latestHandoffPath,
    currentStage: state.currentStage,
    nextStage: state.nextStage,
    contextHealth: state.contextHealth,
    activeFiles: state.activeFiles,
    blocker: state.blocker,
    verification: state.verification,
    artifacts: state.artifacts,
    currentTruth: state.currentTruth,
    invalidatedAssumptions: state.invalidatedAssumptions,
    openDecisions: state.openDecisions,
    recentlyAccessedFiles: state.recentlyAccessedFiles,
    compressionRisk: state.compressionRisk,
    activeRules: state.activeRules,
    recommendNewSession: state.recommendNewSession,
    updatedAt: state.updatedAt,
  }
}

const PLACEHOLDER_VALUES = new Set(["n/a", "na", "not run", "none", "", "-"])
const PLACEHOLDER_PREFIXES = ["- n/a", "- na", "- not run", "- none", "- "]

function isPlaceholder(text: string): boolean {
  const trimmed = text.trim().toLowerCase()
  if (PLACEHOLDER_VALUES.has(trimmed)) return true
  for (const prefix of PLACEHOLDER_PREFIXES) {
    if (trimmed === prefix) return true
  }
  return false
}

function isMeaningfulText(value?: string): boolean {
  return Boolean(value && !isPlaceholder(value))
}

function toPublicHandoffPath(repoRoot: string, filePath: string): string {
  return path.isAbsolute(filePath) ? toRepoRelative(repoRoot, filePath) : filePath
}

function extractSection(markdown: string, heading: string): string {
  const lines = markdown.split("\n")
  const sectionLines: string[] = []
  let inSection = false

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (inSection) break
      if (line.slice(3).trim() === heading) {
        inSection = true
      }
      continue
    }
    if (inSection) {
      sectionLines.push(line)
    }
  }

  return sectionLines.join("\n").trim()
}

function sectionHasMeaningfulContent(markdown: string, heading: string): boolean {
  const section = extractSection(markdown, heading)
  if (!section) return false

  const lines = section.split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (!isPlaceholder(trimmed)) return true
  }
  return false
}

function hasMeaningfulArray(arr: string[]): boolean {
  return arr.some(item => isMeaningfulText(item))
}

function hasMeaningfulRecord(rec: Record<string, string | undefined>): boolean {
  return Object.values(rec).some(isMeaningfulText)
}

function isMeaningfulStage(value?: string): boolean {
  return Boolean(value && value.trim().length > 0 && value !== "unknown" && !isPlaceholder(value))
}

async function validate(input: ContextHandoffInput): Promise<ContextHandoffResult> {
  const checks: ContextHandoffValidationCheck[] = []
  const missing: string[] = []
  const warnings: string[] = []

  // Read state
  const state = await readState(input.repoRoot)
  const hasState = state !== null

  // Read markdown
  let markdown = ""
  let hasMarkdown = false
  let handoffFile = ""

  if (input.handoffPath) {
    const absolutePath = resolveRepoPath(input.repoRoot, input.handoffPath)
    if (existsSync(absolutePath)) {
      markdown = await readFile(absolutePath, "utf8")
      hasMarkdown = markdown.trim().length > 0
      handoffFile = toPublicHandoffPath(input.repoRoot, input.handoffPath)
    }
  }

  if (!hasMarkdown && state?.latestHandoffPath) {
    const absolutePath = resolveRepoPath(input.repoRoot, state.latestHandoffPath)
    if (existsSync(absolutePath)) {
      markdown = await readFile(absolutePath, "utf8")
      hasMarkdown = markdown.trim().length > 0
      handoffFile = toPublicHandoffPath(input.repoRoot, state.latestHandoffPath)
    }
  }

  if (!hasMarkdown) {
    const latestPath = latestHandoffPath(input.repoRoot)
    if (existsSync(latestPath)) {
      markdown = await readFile(latestPath, "utf8")
      hasMarkdown = markdown.trim().length > 0
      handoffFile = toRepoRelative(input.repoRoot, latestPath)
    }
  }

  const found = hasState || hasMarkdown

  checks.push({
    name: "state_exists",
    passed: hasState,
    reason: hasState ? "Found context-state.json" : "No context-state.json found",
  })

  checks.push({
    name: "handoff_exists",
    passed: hasMarkdown,
    reason: hasMarkdown ? "Found handoff markdown" : "No handoff markdown found",
  })

  // --- Recall probe ---
  const hasCurrentTruth = state ? hasMeaningfulArray(state.currentTruth) : false
  const hasCurrentStage = state ? isMeaningfulStage(state.currentStage) : false
  const hasCurrentTaskSection = hasMarkdown && sectionHasMeaningfulContent(markdown, "Current Task")

  const recallPass = hasCurrentTruth || (hasCurrentStage && (hasMarkdown || (state?.nextStage !== undefined))) || hasCurrentTaskSection

  checks.push({
    name: "recall_current_truth",
    passed: hasCurrentTruth,
    reason: hasCurrentTruth ? `Found ${state!.currentTruth.length} current truth entries` : "No current truth entries",
  })

  checks.push({
    name: "recall_current_task",
    passed: hasCurrentTaskSection,
    reason: hasCurrentTaskSection ? "Current Task section has meaningful content" : "Current Task section is missing or placeholder",
  })

  checks.push({
    name: "recall_current_stage",
    passed: hasCurrentStage,
    reason: hasCurrentStage ? `Current stage: ${state!.currentStage}` : "No meaningful current stage",
  })

  if (!recallPass) {
    missing.push("recall: current task or goal evidence")
  }

  // --- Continuation probe ---
  // Tightened: only actionable next-step evidence passes
  const hasNextStage = state ? isMeaningfulStage(state.nextStage) : false
  const hasNextMinimalStep = hasMarkdown && sectionHasMeaningfulContent(markdown, "Next Minimal Step")

  const continuationPass = hasNextMinimalStep || hasNextStage

  checks.push({
    name: "continuation_next_stage",
    passed: hasNextStage,
    reason: hasNextStage ? `Next stage: ${state!.nextStage}` : "No meaningful next stage",
  })

  checks.push({
    name: "continuation_next_minimal_step",
    passed: hasNextMinimalStep,
    reason: hasNextMinimalStep ? "Next Minimal Step has meaningful content" : "Next Minimal Step is missing or placeholder",
  })

  // Diagnostic checks (do not affect continuation pass)
  const hasBlocker = state ? Boolean(state.blocker && !isPlaceholder(state.blocker)) : false
  const hasVerification = state ? Boolean(state.verification && !isPlaceholder(state.verification)) : false
  const hasVerificationSection = hasMarkdown && sectionHasMeaningfulContent(markdown, "Verification")

  checks.push({
    name: "continuation_blocker",
    passed: hasBlocker,
    reason: hasBlocker ? `Blocker: ${state!.blocker}` : "No blocker information",
  })

  checks.push({
    name: "continuation_verification",
    passed: hasVerification || hasVerificationSection,
    reason: (hasVerification || hasVerificationSection) ? "Verification evidence present" : "No verification information",
  })

  if (!continuationPass) {
    missing.push("continuation: next minimal step or next stage evidence")
  }

  // --- Artifact probe ---
  const hasActiveFiles = state ? hasMeaningfulArray(state.activeFiles) : false
  const hasRecentlyAccessed = state ? hasMeaningfulArray(state.recentlyAccessedFiles) : false
  const hasArtifacts = state ? hasMeaningfulRecord(state.artifacts) : false
  const hasActiveFilesSection = hasMarkdown && sectionHasMeaningfulContent(markdown, "Active Files")
  const hasRecentlyAccessedSection = hasMarkdown && sectionHasMeaningfulContent(markdown, "Recently Accessed Files")
  const hasArtifactsSection = hasMarkdown && sectionHasMeaningfulContent(markdown, "Artifacts")

  const artifactPass = hasActiveFiles || hasRecentlyAccessed || hasArtifacts
    || hasActiveFilesSection || hasRecentlyAccessedSection || hasArtifactsSection

  checks.push({
    name: "artifact_active_files",
    passed: hasActiveFiles || hasActiveFilesSection,
    reason: (hasActiveFiles || hasActiveFilesSection) ? "Active files present" : "No active files",
  })

  if (!artifactPass) {
    warnings.push("artifact: active files or artifacts are missing")
  }

  // --- Decision probe ---
  const hasOpenDecisions = state ? hasMeaningfulArray(state.openDecisions) : false
  const hasInvalidatedAssumptions = state ? hasMeaningfulArray(state.invalidatedAssumptions) : false
  const hasOpenDecisionsSection = hasMarkdown && sectionHasMeaningfulContent(markdown, "Open Decisions")
  const hasInvalidatedSection = hasMarkdown && sectionHasMeaningfulContent(markdown, "Invalidated Assumptions")
  const hasCurrentTruthSection = hasMarkdown && sectionHasMeaningfulContent(markdown, "Current Truth")

  const decisionPass = hasOpenDecisions || hasInvalidatedAssumptions || hasCurrentTruth
    || hasOpenDecisionsSection || hasInvalidatedSection || hasCurrentTruthSection

  checks.push({
    name: "decision_open_decisions",
    passed: hasOpenDecisions || hasOpenDecisionsSection,
    reason: (hasOpenDecisions || hasOpenDecisionsSection) ? "Open decisions present" : "No open decisions",
  })

  if (!decisionPass) {
    warnings.push("decision: decisions or invalidated assumptions are missing")
  }

  // --- ok derivation ---
  const ok = recallPass && continuationPass

  // --- recommended action ---
  let recommendedAction: ContextHandoffRecommendedAction
  if (!found) {
    recommendedAction = "save_handoff"
  } else if (!ok) {
    recommendedAction = "fill_required_context"
  } else {
    recommendedAction = "continue"
  }

  return {
    operation: "validate",
    found,
    ok,
    path: handoffFile || undefined,
    probes: {
      recall: recallPass,
      continuation: continuationPass,
      artifact: artifactPass,
      decision: decisionPass,
    },
    checks,
    missing,
    warnings,
    recommendedAction,
    currentStage: state?.currentStage,
    nextStage: state?.nextStage,
    contextHealth: state?.contextHealth,
    updatedAt: state?.updatedAt,
  }
}

async function status(input: ContextHandoffInput): Promise<ContextHandoffResult> {
  const state = await readState(input.repoRoot)

  if (!state) {
    return {
      operation: "status",
      found: false,
      contextHealth: "watch",
      recommendNewSession: false,
      activeFiles: [],
      artifacts: {},
    }
  }

  return {
    operation: "status",
    found: true,
    path: state.latestDatedHandoffPath,
    latestPath: state.latestHandoffPath,
    currentStage: state.currentStage,
    nextStage: state.nextStage,
    contextHealth: state.contextHealth,
    activeFiles: state.activeFiles,
    blocker: state.blocker,
    verification: state.verification,
    artifacts: state.artifacts,
    currentTruth: state.currentTruth,
    invalidatedAssumptions: state.invalidatedAssumptions,
    openDecisions: state.openDecisions,
    recentlyAccessedFiles: state.recentlyAccessedFiles,
    compressionRisk: state.compressionRisk,
    activeRules: state.activeRules,
    recommendNewSession: state.recommendNewSession,
    updatedAt: state.updatedAt,
  }
}
