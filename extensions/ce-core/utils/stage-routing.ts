import { readFile } from "node:fs/promises"
import path from "node:path"
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent"

export const PIPELINE_STAGE_KEYS = new Set([
  "01-brainstorm",
  "02-plan",
  "03-work",
  "04-review",
  "05-learn",
  "06-next",
  "07-worktree",
])

interface StrategySettings {
  modelStrategy?: Record<string, string>
  thinkingStrategy?: Record<string, string>
}

/**
 * Structural subset of the extension context used by stage routing.
 * Keeps the routing helpers testable without full ExtensionContext mocks.
 */
interface StageRoutingContext {
  cwd: string
  mode?: string
  hasUI?: boolean
  model?: { provider?: string, id?: string }
  modelRegistry?: { find(provider: string, id: string): unknown }
  ui?: { notify(message: string, level?: string): void }
}

/** Preserve UI notices while keeping headless diagnostics off the response stream. */
function notifyRouting(
  ctx: StageRoutingContext,
  stageKey: string,
  message: string,
  level: "info" | "warning",
): void {
  if (ctx.mode === "tui" || ctx.mode === "rpc") {
    ctx.ui?.notify(message, level)
  } else if (ctx.mode === "print" || ctx.mode === "json") {
    process.stderr.write(`${JSON.stringify({ source: "ce-core", event: "stage-routing", stage: stageKey, level, message })}\n`)
  }
}

async function applyModelStrategy(
  pi: ExtensionAPI,
  ctx: StageRoutingContext,
  stageKey: string,
  strategy: Record<string, string> | undefined,
): Promise<void> {
  if (!strategy) {
    return
  }
  const notify = (message: string, level: "info" | "warning") => {
    notifyRouting(ctx, stageKey, message, level)
  }

  const targetModelRef = strategy[stageKey] ?? strategy.default
  if (!targetModelRef) {
    return
  }
  const parsed = parseModelRef(targetModelRef, ctx.model?.provider)
  if (!parsed) {
    notify(`Invalid modelStrategy for ${stageKey}: ${targetModelRef}`, "warning")
    return
  }
  // Skip if already using the same model (idempotent re-reads).
  if (ctx.model?.provider === parsed.provider && ctx.model?.id === parsed.id) {
    return
  }
  const model = ctx.modelRegistry?.find(parsed.provider, parsed.id)
  if (!model) {
    notify(`Model not found for ${stageKey}: ${targetModelRef}`, "warning")
    return
  }
  const switched = await pi.setModel(model as Parameters<ExtensionAPI["setModel"]>[0])
  if (switched) {
    notify(`Switched model for ${stageKey}: ${parsed.provider}/${parsed.id}`, "info")
  } else {
    notify(`No API key for ${stageKey}: ${parsed.provider}/${parsed.id}`, "warning")
  }
}

function applyThinkingStrategy(
  pi: ExtensionAPI,
  ctx: StageRoutingContext,
  stageKey: string,
  strategy: Record<string, string> | undefined,
): void {
  if (!strategy) {
    return
  }
  const targetThinking = strategy[stageKey] ?? strategy.default
  if (!targetThinking) {
    return
  }
  const levelMap: Record<string, ReturnType<ExtensionAPI["getThinkingLevel"]>> = {
    off: "off",
    minimal: "minimal",
    low: "low",
    medium: "medium",
    high: "high",
    xhigh: "xhigh",
    max: "max",
    "0": "low",
    "1": "medium",
    "2": "high",
  }
  const rawThinking = targetThinking.toLowerCase()
  const knownLevel = levelMap[rawThinking]
  const normalized = knownLevel ?? "medium"
  if (!knownLevel) {
    notifyRouting(ctx, stageKey, `Unknown thinking level for ${stageKey}: ${targetThinking}, falling back to medium`, "warning")
  }
  if (pi.getThinkingLevel() !== normalized) {
    pi.setThinkingLevel(normalized)
    notifyRouting(ctx, stageKey, `Switched thinking level for ${stageKey}: ${normalized}`, "info")
  }
}

/**
 * Apply model + thinking strategies for a pipeline stage. Shared by the
 * `input` hook (explicit `/skill:` commands) and the `tool_call` hook
 * (model-initiated SKILL.md reads).
 */
export async function applyStageStrategies(
  pi: ExtensionAPI,
  ctx: StageRoutingContext,
  stageKey: string,
): Promise<void> {
  const settings = await readSettings(ctx.cwd)
  await applyModelStrategy(pi, ctx, stageKey, settings?.modelStrategy)
  applyThinkingStrategy(pi, ctx, stageKey, settings?.thinkingStrategy)
}

/**
 * Read settings from two locations (config dir honors pi's `CONFIG_DIR_NAME`,
 * which defaults to `.pi` but is user-configurable since pi 0.79.7):
 * 1. Project-level: {cwd}/{CONFIG_DIR_NAME}/settings.json (highest priority)
 * 2. Global-level: ~/{CONFIG_DIR_NAME}/agent/settings.json (fallback)
 *
 * Project-level takes precedence; global-level is used as fallback.
 */
async function readSettings(cwd: string): Promise<StrategySettings | null> {
  const agentHome = process.env.HOME || "~"
  // Try project-level first
  const projectPath = path.join(cwd, CONFIG_DIR_NAME, "settings.json")
  try {
    const content = await readFile(projectPath, "utf8")
    const projectSettings = JSON.parse(content) as StrategySettings
    // If project has modelStrategy or thinkingStrategy, use it
    if (projectSettings.modelStrategy || projectSettings.thinkingStrategy) {
      return projectSettings
    }
  } catch {
    // Project settings not found, continue to global
  }

  // Fallback to global-level
  const globalPath = path.join(agentHome, CONFIG_DIR_NAME, "agent", "settings.json")
  try {
    const content = await readFile(globalPath, "utf8")
    return JSON.parse(content) as StrategySettings
  } catch {
    // Global settings not found either
  }

  // Try ~/{CONFIG_DIR_NAME}/settings.json as another fallback
  const altGlobalPath = path.join(agentHome, CONFIG_DIR_NAME, "settings.json")
  try {
    const content = await readFile(altGlobalPath, "utf8")
    return JSON.parse(content) as StrategySettings
  } catch {
    return null
  }
}

/**
 * Detect a pipeline stage SKILL.md path, e.g.
 * `.../skills/03-work/SKILL.md`. Returns the stage key or null.
 */
export function parseStageSkillPath(filePath: string): string | null {
  // Accept absolute paths, `./`-prefixed, and bare relative paths like
  // `skills/03-work/SKILL.md` (the read tool allows relative paths).
  const match = filePath.match(/(?:^|[\\/])skills[\\/]([^\\/]+)[\\/]SKILL\.md$/)
  if (!match) {
    return null
  }
  const stageKey = match[1]
  return PIPELINE_STAGE_KEYS.has(stageKey) ? stageKey : null
}

/** Cheap prefix check for the pi `<file name="…">` attachment wrapper. */
export function looksLikeFileCarrier(text: string): boolean {
  return text.trimStart().startsWith("<file ")
}

/**
 * Parse an explicit stage command, optionally carried by one complete pi file
 * wrapper (opt-in: only the initial user input may travel as a sole @file).
 * Never scan reference text or unwrap nested/multiple attachments.
 */
export function parseStageSkillName(text: string, allowFileCarrier = false): string | null {
  let trimmed = text.trim()
  if (allowFileCarrier && looksLikeFileCarrier(trimmed)) {
    const carrier = trimmed.match(/^<file name="[^"\r\n]+">\r?\n([\s\S]*)\r?\n<\/file>$/)
    if (!carrier || /<\/?file(?:\s|>)/.test(carrier[1])) {
      return null
    }
    trimmed = carrier[1].trim()
  }
  const match = trimmed.match(/^\/skill:([^\s]+)/)
  if (!match) {
    return null
  }

  const skillName = match[1]
  return PIPELINE_STAGE_KEYS.has(skillName) ? skillName : null
}

function parseModelRef(
  modelRef: string,
  currentProvider?: string,
): { provider: string, id: string } | null {
  const trimmed = modelRef.trim()
  if (!trimmed) {
    return null
  }

  const slashIndex = trimmed.indexOf("/")
  if (slashIndex > 0 && slashIndex < trimmed.length - 1) {
    return {
      provider: trimmed.slice(0, slashIndex),
      id: trimmed.slice(slashIndex + 1),
    }
  }

  if (!currentProvider) {
    return null
  }

  return {
    provider: currentProvider,
    id: trimmed,
  }
}
