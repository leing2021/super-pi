/**
 * Subagent event model and JSON event parser.
 *
 * Provides the data types and parsing logic for pi --mode json event streams,
 * used by both ce_subagent and ce_parallel_subagent for live TUI updates.
 *
 * Adapted from pi official subagent example patterns.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UsageStats {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  cost: number
  contextTokens: number
  turns: number
}

export interface SingleResult {
  agent: string
  task: string
  exitCode: number
  messages: unknown[]
  stderr: string
  usage: UsageStats
  model?: string
  stopReason?: string
  errorMessage?: string
  step?: number
}

export type DisplayItem =
  | { type: "text"; text: string }
  | { type: "toolCall"; name: string; args: Record<string, unknown> }

// ---------------------------------------------------------------------------
// Parsed event types
// ---------------------------------------------------------------------------

export interface MessageEndEvent {
  type: "message_end"
  message: unknown
  usage?: {
    input?: number
    output?: number
    cacheRead?: number
    cacheWrite?: number
    cost?: { total?: number }
    totalTokens?: number
  }
  stopReason?: string
  model?: string
}

export interface ToolResultEndEvent {
  type: "tool_result_end"
  message: unknown
}

export type ParsedEvent = MessageEndEvent | ToolResultEndEvent

// ---------------------------------------------------------------------------
// Result helpers
// ---------------------------------------------------------------------------

export function makeInitialResult(agent: string, task: string, step?: number): SingleResult {
  return {
    agent,
    task,
    exitCode: -1,
    messages: [],
    stderr: "",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 },
    step,
  }
}

export function isFailedResult(result: SingleResult): boolean {
  return (
    (result.exitCode !== -1 && result.exitCode !== 0) ||
    result.stopReason === "error" ||
    result.stopReason === "aborted"
  )
}

export function getFinalOutput(messages: unknown[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as { role?: string; content?: unknown[] } | undefined
    if (!msg || msg.role !== "assistant") continue
    const parts = msg.content
    if (!Array.isArray(parts)) continue
    for (const part of parts) {
      const p = part as { type?: string; text?: string } | undefined
      if (p?.type === "text" && typeof p.text === "string") return p.text
    }
  }
  return ""
}

export function getDisplayItems(messages: unknown[]): DisplayItem[] {
  const items: DisplayItem[] = []
  for (const msg of messages) {
    const m = msg as { role?: string; content?: unknown[] } | undefined
    if (!m || m.role !== "assistant") continue
    const parts = m.content
    if (!Array.isArray(parts)) continue
    for (const part of parts) {
      const p = part as { type?: string; text?: string; name?: string; arguments?: unknown } | undefined
      if (!p) continue
      if (p.type === "text" && typeof p.text === "string") {
        items.push({ type: "text", text: p.text })
      } else if (p.type === "toolCall" && typeof p.name === "string") {
        items.push({ type: "toolCall", name: p.name, args: (p.arguments ?? {}) as Record<string, unknown> })
      }
    }
  }
  return items
}

// ---------------------------------------------------------------------------
// JSON event parser
// ---------------------------------------------------------------------------

export function parseJsonEvent(line: string): ParsedEvent | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  let raw: unknown
  try {
    raw = JSON.parse(trimmed)
  } catch {
    return null
  }

  if (typeof raw !== "object" || raw === null) return null
  const obj = raw as Record<string, unknown>

  if (obj.type === "message_end" && obj.message) {
    // pi JSON mode puts usage/stopReason/model inside message object
    const msgObj = typeof obj.message === "object" && obj.message !== null
      ? obj.message as Record<string, unknown>
      : undefined
    const rawUsage = obj.usage ?? msgObj?.usage
    const rawStopReason = typeof obj.stopReason === "string"
      ? obj.stopReason
      : typeof msgObj?.stopReason === "string" ? (msgObj.stopReason as string) : undefined
    const rawModel = typeof obj.model === "string"
      ? obj.model
      : typeof msgObj?.model === "string" ? (msgObj.model as string) : undefined
    return {
      type: "message_end",
      message: obj.message,
      usage: typeof rawUsage === "object" && rawUsage !== null
        ? rawUsage as MessageEndEvent["usage"]
        : undefined,
      stopReason: rawStopReason,
      model: rawModel,
    }
  }

  if (obj.type === "tool_result_end" && obj.message) {
    return {
      type: "tool_result_end",
      message: obj.message,
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Event application
// ---------------------------------------------------------------------------

export function applyEventToResult(result: SingleResult, event: ParsedEvent): void {
  if (event.type === "message_end") {
    result.messages.push(event.message)
    const msg = event.message as { role?: string; errorMessage?: string } | undefined
    if (msg?.role === "assistant") {
      result.usage.turns++
      if (event.usage) {
        result.usage.input += event.usage.input ?? 0
        result.usage.output += event.usage.output ?? 0
        result.usage.cacheRead += event.usage.cacheRead ?? 0
        result.usage.cacheWrite += event.usage.cacheWrite ?? 0
        result.usage.cost += event.usage.cost?.total ?? 0
        result.usage.contextTokens = event.usage.totalTokens ?? result.usage.contextTokens
      }
      if (event.stopReason) result.stopReason = event.stopReason
      if (event.model && !result.model) result.model = event.model
      if (msg.errorMessage) result.errorMessage = msg.errorMessage
    }
  } else if (event.type === "tool_result_end") {
    result.messages.push(event.message)
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatTokens(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`
  if (count < 1000000) return `${Math.round(count / 1000)}k`
  return `${(count / 1000000).toFixed(1)}M`
}

export function formatUsageStats(
  usage: UsageStats,
  model?: string,
): string {
  const parts: string[] = []
  if (usage.turns) parts.push(`${usage.turns} turn${usage.turns > 1 ? "s" : ""}`)
  if (usage.input) parts.push(`↑${formatTokens(usage.input)}`)
  if (usage.output) parts.push(`↓${formatTokens(usage.output)}`)
  if (usage.cacheRead) parts.push(`R${formatTokens(usage.cacheRead)}`)
  if (usage.cacheWrite) parts.push(`W${formatTokens(usage.cacheWrite)}`)
  if (usage.cost) parts.push(`$${usage.cost.toFixed(4)}`)
  if (usage.contextTokens && usage.contextTokens > 0) {
    parts.push(`ctx:${formatTokens(usage.contextTokens)}`)
  }
  if (model) parts.push(model)
  return parts.join(" ")
}

// ---------------------------------------------------------------------------
// Shared result helpers (used by subagent.ts and parallel-subagent.ts)
// ---------------------------------------------------------------------------

export function isSingleResult(val: unknown): val is SingleResult {
  return (
    typeof val === "object" &&
    val !== null &&
    "agent" in val &&
    "exitCode" in val &&
    "messages" in val &&
    "usage" in val
  )
}

export function makeFailedResult(agent: string, task: string, error: string): SingleResult {
  return {
    agent,
    task,
    exitCode: 1,
    messages: [],
    stderr: error,
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 },
    errorMessage: error,
    stopReason: "error",
  }
}

export type AnyRunner =
  | ((prompt: string, options?: any) => Promise<SingleResult>)
  | ((prompt: string, options?: any) => Promise<string>)

export async function invokeRunner(
  runner: AnyRunner,
  prompt: string,
  options: any,
): Promise<SingleResult> {
  const result = await runner(prompt, options)

  if (typeof result === "string") {
    return {
      agent: "",
      task: "",
      exitCode: 0,
      messages: [{ role: "assistant", content: [{ type: "text", text: result }] }],
      stderr: "",
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 },
    }
  }

  if (isSingleResult(result)) {
    return result
  }

  return result as unknown as SingleResult
}
