// ============================================================================
// Read Output Filter
// ============================================================================
//
// Filters `read` tool output at the source (via tool_result hook) to reduce
// context waste from large file reads. Symmetric with bash-output-filter.ts.
//
// Strategies:
// 1. Lock / generated files → extreme compression (summary only)
// 2. package.json → keep scripts + dep summary, drop full version lists
// 3. Large code files → keep signatures/structure, collapse bodies
// 4. Large markdown → keep headings + code blocks + lists + expanded paragraphs per section
// 5. Generic → head/tail truncation for very large files

// ============================================================================
// Types
// ============================================================================

export interface ReadOutputFilterInput {
  /** File path that was read */
  path: string
  /** The raw output text */
  output: string
  /** Whether the read resulted in an error */
  isError?: boolean
  /** Whether the file is an image (skip filtering) */
  isImage?: boolean
}

export interface ReadOutputFilterResult {
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
// File Classification
// ============================================================================

type FileCategory =
  | "lock-file"
  | "generated-file"
  | "minified-file"
  | "package-json"
  | "code"
  | "markdown"
  | "config"
  | "unknown"

interface FilePattern {
  test: (path: string) => boolean
  category: FileCategory
}

const FILE_PATTERNS: FilePattern[] = [
  // Lock files — extreme compression
  { test: (p) => /(^|\/)(package-lock\.json|yarn\.lock|bun\.lock|pnpm-lock\.yaml|Gemfile\.lock|Podfile\.lock|composer\.lock|Cargo\.lock)$/.test(p), category: "lock-file" },
  // Minified / bundle files
  { test: (p) => /\.(min\.js|min\.css|bundle\.js|chunk\.js|vendor\.js)$/i.test(p), category: "minified-file" },
  // Generated files
  { test: (p) => /\.(generated\.\w+|auto\.\w+|pb\.ts)$/i.test(p) || /(?:^|\/)(generated|auto-generated|__generated__)\//i.test(p), category: "generated-file" },
  // package.json — smart filter
  { test: (p) => /(^|\/)package\.json$/.test(p), category: "package-json" },
  // Markdown
  { test: (p) => /\.(md|mdx)$/i.test(p), category: "markdown" },
  // Config files (JSON/YAML/TOML without lock)
  { test: (p) => /\.(jsonc?|ya?ml|toml|ini|conf|rc)$/i.test(p) && !/lock/i.test(p), category: "config" },
  // Code files
  { test: (p) => /\.(ts|tsx|js|jsx|py|rs|go|java|kt|rb|c|cpp|h|hpp|cs|swift|zig|scala|clj)$/i.test(p), category: "code" },
  // Code files (alternate extensions)
  { test: (p) => /\.(vue|svelte|astro|sol|dart|lua|r|pl|pm|sh|bash|zsh|fish|ps1)$/i.test(p), category: "code" },
]

function classifyFile(path: string): FileCategory {
  const normalized = path.replace(/\\/g, "/")
  for (const pattern of FILE_PATTERNS) {
    if (pattern.test(normalized)) return pattern.category
  }
  return "unknown"
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum output size (bytes) to trigger any filtering */
const MIN_FILTER_THRESHOLD = 2048 // 2KB

/** Minimum output size (bytes) to trigger markdown filtering */
const MARKDOWN_FILTER_THRESHOLD = 8192 // 8KB — markdown docs are dense, don't filter small ones

/** Maximum size for structural code compression trigger */
const CODE_COMPRESS_THRESHOLD = 8192 // 8KB

/** Maximum filtered output size (bytes) */
const MAX_FILTERED_SIZE = 30720 // 30KB

// ============================================================================
// Filter: Lock Files
// ============================================================================

function filterLockFile(output: string, path: string): string {
  const bytes = Buffer.byteLength(output, "utf-8")
  const lines = output.split("\n").length

  // Try to extract name and lockfileVersion from JSON lock files
  let summary = `Lock file: ${path.split("/").pop()}`

  try {
    const data = JSON.parse(output)
    if (data.name) summary += `\nProject: ${data.name}`
    if (data.lockfileVersion) summary += `\nLockfile version: ${data.lockfileVersion}`
    if (data.packages) {
      const pkgCount = Object.keys(data.packages).length
      summary += `\nPackages: ${pkgCount}`
    }
  } catch {
    // Not JSON (yarn.lock, etc.) — count lines
    summary += `\nLines: ${lines}`
  }

  summary += `\nOriginal size: ${formatBytes(bytes)}`
  return summary
}

// ============================================================================
// Filter: Minified / Generated Files
// ============================================================================

function filterMinifiedFile(output: string, path: string): string {
  const bytes = Buffer.byteLength(output, "utf-8")
  const ext = path.split(".").pop() ?? ""
  return [
    `Minified ${ext} file: ${path.split("/").pop()}`,
    `Size: ${formatBytes(bytes)} (${output.split("\n").length} lines)`,
    `First 500 chars:`,
    output.slice(0, 500),
    "",
    `[... ${formatBytes(bytes - 500)} omitted]`,
  ].join("\n")
}

function filterGeneratedFile(output: string, path: string): string {
  const bytes = Buffer.byteLength(output, "utf-8")
  const lines = output.split("\n")

  // Keep first 30 lines + last 10 lines + count
  if (lines.length <= 50) return output

  const head = lines.slice(0, 30)
  const tail = lines.slice(-10)
  const omitted = lines.length - 40

  return [
    ...head,
    "",
    `[... ${omitted} lines omitted (generated file, ${formatBytes(bytes)})]`,
    "",
    ...tail,
  ].join("\n")
}

// ============================================================================
// Filter: package.json
// ============================================================================

function filterPackageJson(output: string): string {
  try {
    const pkg = JSON.parse(output)
    const sections: string[] = []

    sections.push(`Name: ${pkg.name ?? "unknown"}`)
    if (pkg.version) sections.push(`Version: ${pkg.version}`)
    if (pkg.description) sections.push(`Description: ${pkg.description}`)

    if (pkg.scripts && Object.keys(pkg.scripts).length > 0) {
      sections.push("")
      sections.push("Scripts:")
      for (const [name, cmd] of Object.entries(pkg.scripts)) {
        sections.push(`  ${name}: ${cmd}`)
      }
    }

    if (pkg.dependencies) {
      const depCount = Object.keys(pkg.dependencies).length
      sections.push("")
      sections.push(`Dependencies (${depCount}):`)
      if (depCount <= 15) {
        for (const [name, ver] of Object.entries(pkg.dependencies)) {
          sections.push(`  ${name}: ${ver}`)
        }
      } else {
        // Show first 10 + summary
        const entries = Object.entries(pkg.dependencies)
        for (const [name, ver] of entries.slice(0, 10)) {
          sections.push(`  ${name}: ${ver}`)
        }
        sections.push(`  ... and ${depCount - 10} more`)
      }
    }

    if (pkg.devDependencies) {
      const devCount = Object.keys(pkg.devDependencies).length
      sections.push("")
      sections.push(`DevDependencies (${devCount}):`)
      if (devCount <= 10) {
        for (const [name, ver] of Object.entries(pkg.devDependencies)) {
          sections.push(`  ${name}: ${ver}`)
        }
      } else {
        const entries = Object.entries(pkg.devDependencies)
        for (const [name, ver] of entries.slice(0, 5)) {
          sections.push(`  ${name}: ${ver}`)
        }
        sections.push(`  ... and ${devCount - 5} more`)
      }
    }

    return sections.join("\n")
  } catch {
    // Not valid JSON — generic truncation
    return truncateGeneric(output)
  }
}

// ============================================================================
// Filter: Large Code Files — Structural Compression
// ============================================================================

/**
 * Structural compression for code files.
 * Keeps: imports, exports, type definitions, function/class signatures, comments with TODO/FIXME/HACK
 * Collapses: function bodies > N lines, consecutive blank lines
 */
function filterCodeFile(output: string): string {
  const lines = output.split("\n")
  const kept: string[] = []
  let bodyDepth = 0
  let bodyLines = 0
  let skippedInBody = 0
  const MAX_BODY_LINES = 8 // keep first N lines of a body

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Track brace depth for body detection
    const opens = (line.match(/\{/g) || []).length
    const closes = (line.match(/\}/g) || []).length

    // Always keep: empty lines (structure), imports, exports, type/interface/class declarations
    // comments with TODO/FIXME/HACK, decorators
    if (
      trimmed === "" ||
      /^(import |export |from )/.test(trimmed) ||
      /^(export )?(default |abstract |async |const |let |var |function |class |interface |type |enum )/.test(trimmed) ||
      /^(\/\/|#|\/\*|\*)/.test(trimmed) ||
      /\b(TODO|FIXME|HACK|XXX|WARN|BUG|NOTE)\b/i.test(trimmed) ||
      /^@/.test(trimmed) || // decorators
      /^}\s*$/.test(trimmed) // closing brace
    ) {
      // If we were skipping body lines, add omission marker
      if (skippedInBody > 0) {
        kept.push(`  [... ${skippedInBody} lines omitted]`)
        skippedInBody = 0
      }
      kept.push(line)
      bodyDepth += opens - closes
      bodyLines = 0
      continue
    }

    // Inside a body (after opening brace)
    bodyDepth += opens - closes

    if (bodyDepth > 1 || (bodyDepth === 1 && bodyLines < MAX_BODY_LINES)) {
      kept.push(line)
      bodyLines++
    } else if (bodyDepth === 1 && bodyLines >= MAX_BODY_LINES) {
      // Skip body lines but track count
      skippedInBody++
      bodyLines++
    } else {
      // Top-level or unknown — keep it
      kept.push(line)
    }
  }

  // Final omission marker
  if (skippedInBody > 0) {
    kept.push(`  [... ${skippedInBody} lines omitted]`)
  }

  return deduplicateEmptyLines(kept.join("\n"))
}

// ============================================================================
// Filter: Markdown
// ============================================================================

function filterMarkdown(output: string): string {
  const lines = output.split("\n")
  const kept: string[] = []
  let inParagraph = false
  let paragraphLineCount = 0
  let inCodeBlock = false
  let omitMarkerPlaced = false

  const MAX_PARAGRAPH_LINES = 3 // Keep first N lines of each paragraph (vs 1 before)

  for (const line of lines) {
    const trimmed = line.trim()

    // Track code block state
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock
      kept.push(line)
      continue
    }

    // Keep all lines inside code blocks
    if (inCodeBlock) {
      kept.push(line)
      omitMarkerPlaced = false
      continue
    }

    // Always keep headings
    if (/^#{1,6}\s/.test(trimmed)) {
      kept.push(line)
      inParagraph = false
      paragraphLineCount = 0
      omitMarkerPlaced = false
      continue
    }

    // Empty lines — reset paragraph state
    if (trimmed === "") {
      kept.push(line)
      inParagraph = false
      paragraphLineCount = 0
      omitMarkerPlaced = false
      continue
    }

    // Always keep list items (-, *, numbered) — they often contain key definitions
    if (/^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      kept.push(line)
      omitMarkerPlaced = false
      // List items don't count as paragraph continuation
      continue
    }

    // Keep first N lines of each paragraph
    if (!inParagraph) {
      kept.push(line)
      inParagraph = true
      paragraphLineCount = 1
      omitMarkerPlaced = false
    } else {
      paragraphLineCount++
      if (paragraphLineCount <= MAX_PARAGRAPH_LINES) {
        kept.push(line)
      } else {
        // Place omit marker once per paragraph
        if (!omitMarkerPlaced) {
          kept.push(`  [... additional paragraph content omitted]`)
          omitMarkerPlaced = true
        }
      }
    }
  }

  return deduplicateEmptyLines(kept.join("\n"))
}

// ============================================================================
// Filter: Generic
// ============================================================================

function truncateGeneric(output: string): string {
  const lines = output.split("\n")
  const bytes = Buffer.byteLength(output, "utf-8")

  if (lines.length <= 100) return output

  const head = lines.slice(0, 50)
  const tail = lines.slice(-10)
  const omitted = lines.length - 60

  return [
    ...head,
    "",
    `[... ${omitted} lines omitted (${formatBytes(bytes)})]`,
    "",
    ...tail,
  ].join("\n")
}

// ============================================================================
// Helpers
// ============================================================================

function deduplicateEmptyLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n")
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function appendFilterNotice(
  output: string,
  originalBytes: number,
  filteredBytes: number,
  strategy: string,
  path?: string,
): string {
  const saved = formatBytes(originalBytes - filteredBytes)
  const pathHint = path ? `: bash cat ${path}` : ": bash cat <path>"
  return `${output}\n\n[Read output filtered: ${formatBytes(originalBytes)} → ${formatBytes(filteredBytes)} (${saved} saved, strategy: ${strategy}). If you need the full content, use${pathHint}]`
}

// ============================================================================
// Main Filter Function
// ============================================================================

export function filterReadOutput(input: ReadOutputFilterInput): ReadOutputFilterResult {
  const { path, output, isError, isImage } = input
  const originalBytes = Buffer.byteLength(output, "utf-8")

  // Don't filter images
  if (isImage) {
    return { output, filtered: false, originalBytes, filteredBytes: originalBytes, strategy: "none (image)" }
  }

  // Don't filter error outputs
  if (isError) {
    return { output, filtered: false, originalBytes, filteredBytes: originalBytes, strategy: "none (error)" }
  }

  // Don't filter small outputs
  if (originalBytes < MIN_FILTER_THRESHOLD) {
    return { output, filtered: false, originalBytes, filteredBytes: originalBytes, strategy: "none (below threshold)" }
  }

  const category = classifyFile(path)

  let filtered: string
  let strategyName: string

  switch (category) {
    case "lock-file":
      filtered = filterLockFile(output, path)
      strategyName = "lock-file (summary only)"
      break

    case "minified-file":
      filtered = filterMinifiedFile(output, path)
      strategyName = "minified (head only)"
      break

    case "generated-file":
      filtered = filterGeneratedFile(output, path)
      strategyName = "generated (head + tail)"
      break

    case "package-json":
      filtered = filterPackageJson(output)
      strategyName = "package.json (scripts + dep summary)"
      break

    case "code":
      if (originalBytes >= CODE_COMPRESS_THRESHOLD) {
        filtered = filterCodeFile(output)
        strategyName = "code (structural compression)"
      } else {
        return { output, filtered: false, originalBytes, filteredBytes: originalBytes, strategy: "none (code file below threshold)" }
      }
      break

    case "markdown":
      if (originalBytes >= MARKDOWN_FILTER_THRESHOLD) {
        filtered = filterMarkdown(output)
        strategyName = "markdown (headings + code + lists + expanded paragraphs)"
      } else {
        return { output, filtered: false, originalBytes, filteredBytes: originalBytes, strategy: "none (markdown below 8KB threshold)" }
      }
      break

    case "config":
      // Config files: only filter if very large
      if (originalBytes > MAX_FILTERED_SIZE) {
        filtered = truncateGeneric(output)
        strategyName = "config (generic truncation)"
      } else {
        return { output, filtered: false, originalBytes, filteredBytes: originalBytes, strategy: "none (config, within limit)" }
      }
      break

    default:
      // Unknown files: only filter if very large
      if (originalBytes > MAX_FILTERED_SIZE) {
        filtered = truncateGeneric(output)
        strategyName = "generic (large unknown file)"
      } else {
        return { output, filtered: false, originalBytes, filteredBytes: originalBytes, strategy: "none (unknown, within limit)" }
      }
      break
  }

  const filteredBytes = Buffer.byteLength(filtered, "utf-8")

  // If filtering didn't help much (< 20% reduction), keep original
  if (filteredBytes > originalBytes * 0.8) {
    return { output, filtered: false, originalBytes, filteredBytes, strategy: `none (${category}: filtering insufficient, <20% reduction)` }
  }

  return {
    output: appendFilterNotice(filtered, originalBytes, filteredBytes, strategyName, path),
    filtered: true,
    originalBytes,
    filteredBytes,
    strategy: strategyName,
  }
}
