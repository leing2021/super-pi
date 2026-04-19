import { Type } from "@sinclair/typebox"

// ============================================================================
// Types
// ============================================================================

export interface BashOutputFilterInput {
  /** The bash command that was run */
  command: string
  /** The raw output text */
  output: string
  /** Whether the command exited with an error */
  isError: boolean
  /** Original full output path (if truncated by pi) */
  fullOutputPath?: string
}

export interface BashOutputFilterResult {
  /** Filtered output text */
  output: string
  /** Whether filtering was applied */
  filtered: boolean
  /** Original size in bytes */
  originalBytes: number
  /** Filtered size in bytes */
  filteredBytes: number
  /** The filter strategy that was applied */
  strategy: string
}

// ============================================================================
// Command Classification
// ============================================================================

type CommandCategory = "install" | "test" | "build" | "search" | "git-diff" | "list" | "http" | "unknown"

interface CommandPattern {
  pattern: RegExp
  category: CommandCategory
  /** Whether this is a "means" command (output is a side-effect) */
  isMeans: boolean
}

const COMMAND_PATTERNS: CommandPattern[] = [
  // Install commands — output is a side-effect
  { pattern: /\b(npm|yarn|pnpm|bun)\s+(install|i|add|ci|update|upgrade)\b/, category: "install", isMeans: true },
  { pattern: /\b(pip|pip3|poetry|conda)\s+(install|add)\b/, category: "install", isMeans: true },
  { pattern: /\b(cargo)\s+(install|add|update)\b/, category: "install", isMeans: true },
  { pattern: /\b(bundle|gem)\s+(install)\b/, category: "install", isMeans: true },
  { pattern: /\b(go)\s+(get|install|mod\s+(tidy|download))\b/, category: "install", isMeans: true },
  // Test commands — output is mostly noise (pass lines), failures are signal
  { pattern: /\b(npm|yarn|pnpm|bun)\s+(test|t|run\s+test)/, category: "test", isMeans: true },
  { pattern: /\b(vitest|jest|mocha|pytest|cargo\s+test|go\s+test|ruby|-Ilib)\b.*\b(test|spec)\b/, category: "test", isMeans: true },
  { pattern: /\b(jest|vitest|mocha|pytest|npx\s+(jest|vitest|mocha))\b/, category: "test", isMeans: true },
  { pattern: /\b(cargo)\s+test\b/, category: "test", isMeans: true },
  { pattern: /\b(go)\s+test\b/, category: "test", isMeans: true },
  // Build/compile commands — warnings/errors are signal
  { pattern: /\b(tsc|typescript|tscl)\b/, category: "build", isMeans: true },
  { pattern: /\b(npm|yarn|pnpm|bun)\s+(run\s+)?(build|compile)\b/, category: "build", isMeans: true },
  { pattern: /\b(cargo)\s+(build|check|clippy)\b/, category: "build", isMeans: true },
  { pattern: /\b(make|cmake|gcc|g\+\+|clang)\b/, category: "build", isMeans: true },
  { pattern: /\b(dotnet)\s+(build|publish)\b/, category: "build", isMeans: true },
  { pattern: /\b(gradle|mvn|mvnw)\b/, category: "build", isMeans: true },
  // Search commands — output IS the purpose, don't filter
  { pattern: /\b(grep|rg|ag|ack|git\s+grep)\b/, category: "search", isMeans: false },
  { pattern: /\b(rg|ripgrep)\b/, category: "search", isMeans: false },
  // Git diff/log — output IS the purpose
  { pattern: /\bgit\s+(diff|log|show|range-diff)\b/, category: "git-diff", isMeans: false },
  // File listing — moderate filtering ok
  { pattern: /\b(find|fd|ls\s+-R|tree|du|ncdu)\b/, category: "list", isMeans: false },
  // HTTP requests — can be verbose
  { pattern: /\b(curl|wget|httpie|http\s+)\b/, category: "http", isMeans: false },
]

function classifyCommand(command: string): CommandPattern | null {
  // Normalize command: remove leading whitespace, handle pipes
  const cmd = command.trim()

  // Check primary command (before any pipe)
  const primaryCmd = cmd.split("|")[0].trim()

  for (const pattern of COMMAND_PATTERNS) {
    if (pattern.pattern.test(primaryCmd)) {
      return pattern
    }
  }

  return null
}

// ============================================================================
// Output Filters
// ============================================================================

/**
 * Filter for install command output.
 * Keep: error lines, warning lines, summary lines (added/removed/changed counts).
 * Remove: progress bars, download lines, individual package install lines.
 */
function filterInstallOutput(output: string): string {
  const lines = output.split("\n")
  const kept: string[] = []
  let removedCount = 0

  for (const line of lines) {
    // Always keep: empty lines (structure), errors, warnings, summary
    if (
      line.trim() === "" ||
      /(error|ERR!|fatal|FAILED|failed|abort|timeout)/i.test(line) ||
      /\b(warn|WARN|warning|deprecat)\b/i.test(line) ||
      /\b(added|removed|changed|updated|audited)\s+\d+/i.test(line) ||
      /\bpackages?\b.*\b(look|found|installed|removed)\b/i.test(line) ||
      /\bvulnerabilities\b/i.test(line) ||
      /^\s*$/.test(line) ||
      line.startsWith("[") ||
      /^\s*(\d+ packages?|up to date|already|nothing)/i.test(line)
    ) {
      kept.push(line)
    } else {
      removedCount++
    }
  }

  // Deduplicate consecutive empty lines
  return deduplicateEmptyLines(kept.join("\n"))
}

/**
 * Filter for test command output.
 * Keep: FAIL, ERROR, summary, test suite headers.
 * Remove: PASS lines (✓, ✔, PASS, ✓), progress dots.
 */
function filterTestOutput(output: string): string {
  const lines = output.split("\n")
  const kept: string[] = []
  let removedCount = 0

  for (const line of lines) {
    // Always keep: errors, failures, summary, suite names
    if (
      line.trim() === "" ||
      /\b(FAIL|FAILING|FAILED|ERROR|✕|✗|×|✘|broken)\b/i.test(line) ||
      /\b(fail|failure|error|timeout|crash)\b.*\d/i.test(line) ||
      /\b(tests?|suites?|files?|passed|failed|skipped|pending)\s*[:=]?\s*\d/i.test(line) ||
      /\b(RUN|RUNS)\s/i.test(line) || // vitest running indicator
      /^\s*(FAIL|PASS|ERROR|SKIP|TODO)\s+(?:\s|\[)/i.test(line) ||
      /^[\s│┌┐└┘├┤┬┴┼─]+/.test(line) || // Box drawing (test summaries)
      /\b(synopsis|assert|expect|received|expected)\b/i.test(line) ||
      /\s+(→|at)\s+.*\.\w+\s*$/i.test(line) || // Stack traces
      /\d+\.\d+\s*(s|ms)\s*$/.test(line.trim()) || // Timing lines
      line.includes("Test Suites:") ||
      line.includes("Tests:") ||
      line.includes("Snapshots:") ||
      line.includes("Time:")
    ) {
      kept.push(line)
    } else if (
      // Specifically skip PASS lines
      /^\s*✓|✔|PASS|✅|·/.test(line) ||
      /^\s*√/.test(line) ||
      /^\s*ok\s+\d+/.test(line) ||
      /^\s*\.\s*$/.test(line.trim()) // Progress dots
    ) {
      removedCount++
    } else {
      // Keep lines that don't match pass patterns (context lines)
      kept.push(line)
    }
  }

  return deduplicateEmptyLines(kept.join("\n"))
}

/**
 * Filter for build/compile output.
 * Keep: error lines, warning lines (deduplicated), summary.
 * Remove: successful compilation lines, progress indicators.
 */
function filterBuildOutput(output: string): string {
  const lines = output.split("\n")
  const kept: string[] = []
  const seenWarnings = new Set<string>()
  let removedCount = 0

  for (const line of lines) {
    if (line.trim() === "") {
      kept.push(line)
      continue
    }

    // Always keep errors
    if (/\b(error|Error:|fatal|FAILED|failed)\b/i.test(line)) {
      kept.push(line)
      continue
    }

    // Deduplicate warnings (keep first occurrence)
    if (/\b(warning|warn)\b/i.test(line)) {
      const normalized = line.replace(/:\d+:\d+/g, ":N:N").trim()
      if (!seenWarnings.has(normalized)) {
        seenWarnings.add(normalized)
        kept.push(line)
      } else {
        kept.push(`  ... (${countByPattern(lines, normalized)} similar warnings omitted)`)
      }
      continue
    }

    // Keep summary lines
    if (
      /\b(compiled|built|generated|error|warning)\s*\d/i.test(line) ||
      /\b(Finished|Compiling|Building)\b/i.test(line) ||
      /error\(s\)|warning\(s\)/i.test(line)
    ) {
      kept.push(line)
      continue
    }

    // Skip progress/success lines
    if (
      /^\s*(Compiling|Building|Generating)\s/i.test(line) ||
      /^\s*\[.*\]\s/.test(line) // [1/10] style progress
    ) {
      removedCount++
      continue
    }

    // Keep everything else (might be important context)
    kept.push(line)
  }

  return deduplicateEmptyLines(kept.join("\n"))
}

/**
 * General filter for any large output.
 * Applies safe, universal compression:
 * - Collapse consecutive empty lines
 * - Remove ANSI escape sequences
 * - Trim trailing whitespace
 */
function filterGenericOutput(output: string): string {
  // Remove ANSI escape sequences
  const cleaned = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
  // Deduplicate empty lines
  return deduplicateEmptyLines(cleaned)
}

// ============================================================================
// Helpers
// ============================================================================

function deduplicateEmptyLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n")
}

function countByPattern(lines: string[], normalizedPattern: string): number {
  let count = 0
  for (const line of lines) {
    if (line.replace(/:\d+:\d+/g, ":N:N").trim() === normalizedPattern) {
      count++
    }
  }
  return count
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// ============================================================================
// Main Filter Function
// ============================================================================

/** Minimum output size (bytes) to trigger any filtering */
const MIN_FILTER_THRESHOLD = 2048 // 2KB

/** Maximum filtered output size (bytes) — aggressive cutoff for very large outputs */
const MAX_FILTERED_SIZE = 30720 // 30KB

export function filterBashOutput(input: BashOutputFilterInput): BashOutputFilterResult {
  const { command, output, isError, fullOutputPath } = input
  const originalBytes = Buffer.byteLength(output, "utf-8")

  // Don't filter small outputs
  if (originalBytes < MIN_FILTER_THRESHOLD) {
    return {
      output,
      filtered: false,
      originalBytes,
      filteredBytes: originalBytes,
      strategy: "none (below threshold)",
    }
  }

  // Don't filter error outputs — they need to be complete
  if (isError) {
    return {
      output,
      filtered: false,
      originalBytes,
      filteredBytes: originalBytes,
      strategy: "none (error output)",
    }
  }

  const matched = classifyCommand(command)

  // If no pattern matched, apply generic filtering for large outputs
  if (!matched) {
    if (originalBytes > MAX_FILTERED_SIZE) {
      const filtered = filterGenericOutput(output)
      const filteredBytes = Buffer.byteLength(filtered, "utf-8")
      if (filteredBytes < originalBytes * 0.9) {
        return {
          output: appendFilterNotice(filtered, originalBytes, filteredBytes, "generic", fullOutputPath),
          filtered: true,
          originalBytes,
          filteredBytes,
          strategy: "generic (large unknown command)",
        }
      }
    }
    return {
      output,
      filtered: false,
      originalBytes,
      filteredBytes: originalBytes,
      strategy: "none (unknown command, below aggressive threshold)",
    }
  }

  // Don't filter "purpose" commands (search, git diff) unless extremely large
  if (!matched.isMeans && originalBytes < MAX_FILTERED_SIZE) {
    return {
      output,
      filtered: false,
      originalBytes,
      filteredBytes: originalBytes,
      strategy: `none (${matched.category}: purpose command, within limit)`,
    }
  }

  // Apply category-specific filter
  let filtered: string
  let strategyName: string

  switch (matched.category) {
    case "install":
      filtered = filterInstallOutput(output)
      strategyName = "install (errors + summary only)"
      break
    case "test":
      filtered = filterTestOutput(output)
      strategyName = "test (failures + summary only)"
      break
    case "build":
      filtered = filterBuildOutput(output)
      strategyName = "build (errors + deduplicated warnings)"
      break
    default:
      // Purpose commands that are very large get generic filtering
      filtered = filterGenericOutput(output)
      strategyName = `generic (${matched.category}: large output)`
      break
  }

  const filteredBytes = Buffer.byteLength(filtered, "utf-8")

  // If filtering didn't help much (< 20% reduction), keep original
  if (filteredBytes > originalBytes * 0.8) {
    return {
      output,
      filtered: false,
      originalBytes,
      filteredBytes,
      strategy: `none (${matched.category}: filtering insufficient, <20% reduction)`,
    }
  }

  return {
    output: appendFilterNotice(filtered, originalBytes, filteredBytes, strategyName, fullOutputPath),
    filtered: true,
    originalBytes,
    filteredBytes,
    strategy: strategyName,
  }
}

function appendFilterNotice(
  output: string,
  originalBytes: number,
  filteredBytes: number,
  strategy: string,
  fullOutputPath?: string,
): string {
  const saved = formatBytes(originalBytes - filteredBytes)
  const notice = `\n\n[Output filtered: ${formatBytes(originalBytes)} → ${formatBytes(filteredBytes)} (${saved} saved, strategy: ${strategy})${fullOutputPath ? `. Full output: ${fullOutputPath}` : ""}]`
  return output + notice
}
