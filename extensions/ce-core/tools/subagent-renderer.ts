/**
 * TUI renderers for ce_subagent and ce_parallel_subagent.
 *
 * Displays real-time status in pi tool frames:
 *   - Collapsed: status icon + agent name + recent tool calls + usage
 *   - Expanded (Ctrl+O): full tool calls + final output + per-task usage
 *
 * Tool call formatting (formatToolCall) adapted directly from pi official
 * subagent example with super-pi skill semantic adaptations.
 */

import * as os from "node:os"
import { Container, Markdown, Spacer, Text } from "@mariozechner/pi-tui"
import {
  type SingleResult,
  getFinalOutput,
  getDisplayItems,
  isFailedResult,
  formatUsageStats,
  type DisplayItem,
} from "./subagent-events"
import type { SubagentLiveDetails } from "./subagent"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLLAPSED_ITEM_COUNT = 10

// ---------------------------------------------------------------------------
// Tool call formatting (from pi official subagent example)
// ---------------------------------------------------------------------------

export function formatToolCall(
  toolName: string,
  args: Record<string, unknown>,
  themeFg: (color: any, text: string) => string,
): string {
  const shortenPath = (p: string) => {
    const home = os.homedir()
    return p.startsWith(home) ? `~${p.slice(home.length)}` : p
  }

  switch (toolName) {
    case "bash": {
      const command = (args.command as string) || "..."
      const preview = command.length > 60 ? `${command.slice(0, 60)}...` : command
      return themeFg("muted", "$ ") + themeFg("toolOutput", preview)
    }
    case "read": {
      const rawPath = (args.file_path || args.path || "...") as string
      const filePath = shortenPath(rawPath)
      const offset = args.offset as number | undefined
      const limit = args.limit as number | undefined
      let text = themeFg("accent", filePath)
      if (offset !== undefined || limit !== undefined) {
        const startLine = offset ?? 1
        const endLine = limit !== undefined ? startLine + limit - 1 : ""
        text += themeFg("warning", `:${startLine}${endLine ? `-${endLine}` : ""}`)
      }
      return themeFg("muted", "read ") + text
    }
    case "write": {
      const rawPath = (args.file_path || args.path || "...") as string
      const filePath = shortenPath(rawPath)
      const content = (args.content || "") as string
      const lines = content.split("\n").length
      let text = themeFg("muted", "write ") + themeFg("accent", filePath)
      if (lines > 1) text += themeFg("dim", ` (${lines} lines)`)
      return text
    }
    case "edit": {
      const rawPath = (args.file_path || args.path || "...") as string
      return themeFg("muted", "edit ") + themeFg("accent", shortenPath(rawPath))
    }
    case "ls": {
      const rawPath = (args.path || ".") as string
      return themeFg("muted", "ls ") + themeFg("accent", shortenPath(rawPath))
    }
    case "find": {
      const pattern = (args.pattern || "*") as string
      const rawPath = (args.path || ".") as string
      return themeFg("muted", "find ") + themeFg("accent", pattern) + themeFg("dim", ` in ${shortenPath(rawPath)}`)
    }
    case "grep": {
      const pattern = (args.pattern || "") as string
      const rawPath = (args.path || ".") as string
      return (
        themeFg("muted", "grep ") +
        themeFg("accent", `/${pattern}/`) +
        themeFg("dim", ` in ${shortenPath(rawPath)}`)
      )
    }
    default: {
      const argsStr = JSON.stringify(args)
      const preview = argsStr.length > 50 ? `${argsStr.slice(0, 50)}...` : argsStr
      return themeFg("accent", toolName) + themeFg("dim", ` ${preview}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Theme type
// ---------------------------------------------------------------------------

interface Theme {
  fg: (color: any, text: string) => string
  bold: (text: string) => string
}

// ---------------------------------------------------------------------------
// renderCall
// ---------------------------------------------------------------------------

export function renderSubagentCall(
  args: {
    agent?: string
    task?: string
    chain?: Array<{ agent: string; task: string }>
    tasks?: Array<{ agent: string; task: string }>
  },
  theme: Theme,
): any {
  if (args.chain && args.chain.length > 0) {
    let text =
      theme.fg("toolTitle", theme.bold("ce_subagent ")) +
      theme.fg("accent", `chain (${args.chain.length} steps)`)
    for (let i = 0; i < Math.min(args.chain.length, 3); i++) {
      const step = args.chain[i]
      const cleanTask = step.task.replace(/\{previous\}/g, "").trim()
      const preview = cleanTask.length > 40 ? `${cleanTask.slice(0, 40)}...` : cleanTask
      text +=
        "\n  " +
        theme.fg("muted", `${i + 1}.`) +
        " " +
        theme.fg("accent", step.agent) +
        theme.fg("dim", ` ${preview}`)
    }
    if (args.chain.length > 3) text += `\n  ${theme.fg("muted", `... +${args.chain.length - 3} more`)}`
    return new Text(text, 0, 0)
  }

  if (args.tasks && args.tasks.length > 0) {
    let text =
      theme.fg("toolTitle", theme.bold("⬇ parallel ")) +
      theme.fg("accent", `${args.tasks.length} agents launching...`)
    for (let i = 0; i < args.tasks.length; i++) {
      const t = args.tasks[i]
      const num = theme.fg("muted", `${i + 1}.`)
      const preview = t.task.length > 50 ? `${t.task.slice(0, 50)}...` : t.task
      text += `\n  ${num} ${theme.fg("accent", t.agent)} ${theme.fg("dim", preview)}`
    }
    return new Text(text, 0, 0)
  }

  // Single mode
  const agentName = args.agent || "..."
  const preview = args.task ? (args.task.length > 60 ? `${args.task.slice(0, 60)}...` : args.task) : "..."
  let text =
    theme.fg("toolTitle", theme.bold("ce_subagent ")) +
    theme.fg("accent", agentName)
  text += `\n  ${theme.fg("dim", preview)}`
  return new Text(text, 0, 0)
}

// ---------------------------------------------------------------------------
// renderResult
// ---------------------------------------------------------------------------

interface RenderContext {
  expanded: boolean
}

export function renderSubagentResult(
  details: SubagentLiveDetails,
  context: RenderContext,
  theme: Theme,
): any {
  if (!details || !details.results || details.results.length === 0) {
    return new Text("(no output)", 0, 0)
  }

  const mdTheme = getMarkdownTheme()

  const renderDisplayItems = (items: DisplayItem[], limit?: number) => {
    const toShow = limit ? items.slice(-limit) : items
    const skipped = limit && items.length > limit ? items.length - limit : 0
    let text = ""
    if (skipped > 0) text += theme.fg("muted", `... ${skipped} earlier items\n`)
    for (const item of toShow) {
      if (item.type === "text") {
        const preview = context.expanded ? item.text : item.text.split("\n").slice(0, 3).join("\n")
        text += `${theme.fg("toolOutput", preview)}\n`
      } else {
        text += `${theme.fg("muted", "→ ") + formatToolCall(item.name, item.args, theme.fg.bind(theme))}\n`
      }
    }
    return text.trimEnd()
  }

  // --- Single mode ---
  if (details.mode === "single" && details.results.length === 1) {
    return renderSingleResult(details.results[0], context, theme, mdTheme, renderDisplayItems)
  }

  // --- Chain mode ---
  if (details.mode === "chain") {
    return renderChainResult(details.results, context, theme, mdTheme, renderDisplayItems)
  }

  // --- Parallel mode ---
  if (details.mode === "parallel") {
    return renderParallelResult(details.results, context, theme, mdTheme, renderDisplayItems)
  }

  return new Text("(no output)", 0, 0)
}

// ---------------------------------------------------------------------------
// Single result renderer
// ---------------------------------------------------------------------------

function renderSingleResult(
  r: SingleResult,
  context: RenderContext,
  theme: Theme,
  mdTheme: any,
  renderDisplayItems: (items: DisplayItem[], limit?: number) => string,
): any {
  const isError = isFailedResult(r)
  const icon = isError ? theme.fg("error", "✗") : r.exitCode === -1 ? theme.fg("warning", "⏳") : theme.fg("success", "✓")
  const displayItems = getDisplayItems(r.messages)
  const finalOutput = getFinalOutput(r.messages)

  if (context.expanded) {
    const container = new Container()
    let header = `${icon} ${theme.fg("toolTitle", theme.bold(r.agent))}`
    if (isError && r.stopReason) header += ` ${theme.fg("error", `[${r.stopReason}]`)}`
    container.addChild(new Text(header, 0, 0))
    if (isError && r.errorMessage)
      container.addChild(new Text(theme.fg("error", `Error: ${r.errorMessage}`), 0, 0))
    container.addChild(new Spacer(1))
    container.addChild(new Text(theme.fg("muted", "─── Task ───"), 0, 0))
    container.addChild(new Text(theme.fg("dim", r.task), 0, 0))
    container.addChild(new Spacer(1))
    container.addChild(new Text(theme.fg("muted", "─── Output ───"), 0, 0))
    if (displayItems.length === 0 && !finalOutput) {
      container.addChild(new Text(theme.fg("muted", r.exitCode === -1 ? "(running...)" : "(no output)"), 0, 0))
    } else {
      for (const item of displayItems) {
        if (item.type === "toolCall")
          container.addChild(
            new Text(theme.fg("muted", "→ ") + formatToolCall(item.name, item.args, theme.fg.bind(theme)), 0, 0),
          )
      }
      if (finalOutput) {
        container.addChild(new Spacer(1))
        container.addChild(new Markdown(finalOutput.trim(), 0, 0, mdTheme))
      }
    }
    const usageStr = formatUsageStats(r.usage, r.model)
    if (usageStr) {
      container.addChild(new Spacer(1))
      container.addChild(new Text(theme.fg("dim", usageStr), 0, 0))
    }
    return container
  }

  // Collapsed
  let text = `${icon} ${theme.fg("toolTitle", theme.bold(r.agent))}`
  if (isError && r.stopReason) text += ` ${theme.fg("error", `[${r.stopReason}]`)}`
  if (isError && r.errorMessage) text += `\n${theme.fg("error", `Error: ${r.errorMessage}`)}`
  else if (r.exitCode === -1) text += `\n${theme.fg("muted", "(running...)")}`
  else if (displayItems.length === 0) text += `\n${theme.fg("muted", "(no output)")}`
  else {
    text += `\n${renderDisplayItems(displayItems, COLLAPSED_ITEM_COUNT)}`
    if (displayItems.length > COLLAPSED_ITEM_COUNT) text += `\n${theme.fg("muted", "(Ctrl+O to expand)")}`
  }
  const usageStr = formatUsageStats(r.usage, r.model)
  if (usageStr) text += `\n${theme.fg("dim", usageStr)}`
  return new Text(text, 0, 0)
}

// ---------------------------------------------------------------------------
// Chain result renderer
// ---------------------------------------------------------------------------

function aggregateUsage(results: SingleResult[]) {
  const total = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 }
  for (const r of results) {
    total.input += r.usage.input
    total.output += r.usage.output
    total.cacheRead += r.usage.cacheRead
    total.cacheWrite += r.usage.cacheWrite
    total.cost += r.usage.cost
    total.contextTokens += r.usage.contextTokens
    total.turns += r.usage.turns
  }
  return total
}

function renderChainResult(
  results: SingleResult[],
  context: RenderContext,
  theme: Theme,
  mdTheme: any,
  renderDisplayItems: (items: DisplayItem[], limit?: number) => string,
): any {
  const successCount = results.filter(r => r.exitCode === 0).length
  const icon = successCount === results.length ? theme.fg("success", "✓") : theme.fg("error", "✗")

  if (context.expanded) {
    const container = new Container()
    container.addChild(
      new Text(
        `${icon} ${theme.fg("toolTitle", theme.bold("chain "))}${theme.fg("accent", `${successCount}/${results.length} steps`)}`,
        0, 0,
      ),
    )
    for (const r of results) {
      const rIcon = r.exitCode === 0 ? theme.fg("success", "✓") : theme.fg("error", "✗")
      const displayItems = getDisplayItems(r.messages)
      const finalOutput = getFinalOutput(r.messages)

      container.addChild(new Spacer(1))
      container.addChild(new Text(`${theme.fg("muted", `─── Step ${r.step ?? "?"}: `)}${theme.fg("accent", r.agent)} ${rIcon}`, 0, 0))
      container.addChild(new Text(theme.fg("muted", "Task: ") + theme.fg("dim", r.task), 0, 0))
      for (const item of displayItems) {
        if (item.type === "toolCall")
          container.addChild(new Text(theme.fg("muted", "→ ") + formatToolCall(item.name, item.args, theme.fg.bind(theme)), 0, 0))
      }
      if (finalOutput) {
        container.addChild(new Spacer(1))
        container.addChild(new Markdown(finalOutput.trim(), 0, 0, mdTheme))
      }
      const stepUsage = formatUsageStats(r.usage, r.model)
      if (stepUsage) container.addChild(new Text(theme.fg("dim", stepUsage), 0, 0))
    }
    const usageStr = formatUsageStats(aggregateUsage(results))
    if (usageStr) {
      container.addChild(new Spacer(1))
      container.addChild(new Text(theme.fg("dim", `Total: ${usageStr}`), 0, 0))
    }
    return container
  }

  // Collapsed
  let text = `${icon} ${theme.fg("toolTitle", theme.bold("chain "))}${theme.fg("accent", `${successCount}/${results.length} steps`)}`
  for (const r of results) {
    const rIcon = r.exitCode === 0 ? theme.fg("success", "✓") : theme.fg("error", "✗")
    const displayItems = getDisplayItems(r.messages)
    text += `\n\n${theme.fg("muted", `─── Step ${r.step ?? "?"}: `)}${theme.fg("accent", r.agent)} ${rIcon}`
    if (displayItems.length === 0) text += `\n${theme.fg("muted", "(no output)")}`
    else text += `\n${renderDisplayItems(displayItems, 5)}`
  }
  const usageStr = formatUsageStats(aggregateUsage(results))
  if (usageStr) text += `\n\n${theme.fg("dim", `Total: ${usageStr}`)}`
  text += `\n${theme.fg("muted", "(Ctrl+O to expand)")}`
  return new Text(text, 0, 0)
}

// ---------------------------------------------------------------------------
// Parallel result renderer
// ---------------------------------------------------------------------------

function renderParallelResult(
  results: SingleResult[],
  context: RenderContext,
  theme: Theme,
  mdTheme: any,
  renderDisplayItems: (items: DisplayItem[], limit?: number) => string,
): any {
  const running = results.filter(r => r.exitCode === -1).length
  const successCount = results.filter(r => r.exitCode !== -1 && !isFailedResult(r)).length
  const failCount = results.filter(r => r.exitCode !== -1 && isFailedResult(r)).length
  const isRunning = running > 0

  if (isRunning) {
    // --- Live progress: compact status line ---
    const doneCount = successCount + failCount
    const icon = theme.fg("warning", "⏳")
    const bar = renderProgressBar(doneCount, results.length, theme)
    const doneLabel = failCount > 0
      ? theme.fg("success", `${successCount}✓`) + " " + theme.fg("error", `${failCount}✗`)
      : theme.fg("success", `${successCount}✓`)
    const runningLabel = theme.fg("dim", `, ${running} running...`)
    return new Text(`${icon} ${bar} ${doneLabel}${runningLabel}`, 0, 0)
  }

  // --- Completed: summary card layout ---
  const allSuccess = failCount === 0
  const headerIcon = allSuccess ? theme.fg("success", "✓") : theme.fg("warning", "◐")
  const headerText = failCount > 0
    ? `${successCount}/${results.length} succeeded, ${failCount} failed`
    : `${successCount}/${results.length} succeeded`

  if (context.expanded) {
    // Expanded: header + per-task details with tool calls and output
    const container = new Container()
    container.addChild(new Text(`${headerIcon} ${theme.fg("toolTitle", theme.bold("parallel "))}${theme.fg("accent", headerText)}`, 0, 0))
    container.addChild(new Spacer(1))

    for (const r of results) {
      const rIcon = isFailedResult(r) ? theme.fg("error", "✗") : theme.fg("success", "✓")
      const finalOutput = getFinalOutput(r.messages)
      const summaryText = isFailedResult(r)
        ? (r.errorMessage || r.stderr || "unknown error")
        : (finalOutput ? summarizeText(finalOutput, 200) : "(no output)")

      container.addChild(new Text(`${rIcon} ${theme.fg("accent", r.agent)} — ${summaryText}`, 0, 0))

      if (!isFailedResult(r) && finalOutput) {
        container.addChild(new Markdown(finalOutput.trim(), 0, 0, mdTheme))
      }

      const taskUsage = formatUsageStats(r.usage, r.model)
      if (taskUsage) container.addChild(new Text(theme.fg("dim", taskUsage), 0, 0))
      container.addChild(new Spacer(1))
    }

    const usageStr = formatUsageStats(aggregateUsage(results))
    if (usageStr) {
      container.addChild(new Text(theme.fg("dim", `Total: ${usageStr}`), 0, 0))
    }
    return container
  }

  // Collapsed: one-line summary per task
  let text = `${headerIcon} ${theme.fg("toolTitle", theme.bold("parallel "))}${theme.fg("accent", headerText)}`
  for (const r of results) {
    const rIcon = isFailedResult(r) ? theme.fg("error", "✗") : theme.fg("success", "✓")
    const finalOutput = getFinalOutput(r.messages)
    const summaryText = isFailedResult(r)
      ? (r.errorMessage || r.stderr || "unknown error")
      : (finalOutput ? summarizeText(finalOutput, 120) : "(no output)")
    text += `\n  ${rIcon} ${theme.fg("accent", r.agent)} — ${summaryText}`
  }
  const usageStr = formatUsageStats(aggregateUsage(results))
  if (usageStr) text += `\n${theme.fg("dim", usageStr)}`
  text += `\n${theme.fg("muted", "(Ctrl+O to expand)")}`
  return new Text(text, 0, 0)
}

// ---------------------------------------------------------------------------
// Progress bar & text helpers
// ---------------------------------------------------------------------------

function renderProgressBar(done: number, total: number, theme: Theme): string {
  const width = Math.min(total, 20)
  const filled = Math.round((done / total) * width)
  const empty = width - filled
  const bar = theme.fg("success", "█".repeat(filled)) + theme.fg("dim", "░".repeat(empty))
  return bar
}

function summarizeText(text: string, maxLen: number): string {
  // Take first meaningful paragraph or line
  const firstLine = text.split("\n").find(l => l.trim().length > 0) || ""
  // Strip markdown headers and bold for summary
  const cleaned = firstLine.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/\[.*?\]\(.*?\)/g, "").trim()
  if (cleaned.length <= maxLen) return cleaned
  return cleaned.slice(0, maxLen - 1) + "…"
}

// ---------------------------------------------------------------------------
// Markdown theme helper
// ---------------------------------------------------------------------------

function getMarkdownTheme(): any {
  // Return a simple theme for testing / default usage
  // In production, pi provides getMarkdownTheme()
  try {
    const { getMarkdownTheme: gmt } = require("@mariozechner/pi-coding-agent")
    return gmt()
  } catch {
    return undefined
  }
}
