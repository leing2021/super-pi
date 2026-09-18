import { visibleWidth } from "@earendil-works/pi-tui"

export type QuestionOption = string | { label: string; description?: string }

export interface AskUserQuestionInput {
  question: string
  options?: QuestionOption[]
  allowCustom?: boolean
}

export interface AskUserQuestionUi {
  input(question: string): Promise<string | null>
  select(question: string, options: string[]): Promise<string | null>
  /**
   * Terminal-column cap applied to option labels before display. Set this only
   * for renderers that cannot truncate at draw time (e.g. the built-in
   * `ctx.ui.select()` fallback). Renderers that receive the real terminal width
   * (e.g. the custom scrollable selector) should omit it so the tool layer
   * never destroys text the renderer could have shown.
   */
  maxLabelWidth?: number
}

export interface AskUserQuestionResult {
  answer: string | null
  mode: "input" | "select" | "custom" | "cancelled"
}

/** Sentinel label used to offer a free-text custom answer. */
export const CUSTOM_SENTINEL = "Other"

/**
 * Default display width (terminal columns) for normalized option labels on the
 * built-in `ctx.ui.select()` fallback path, whose renderer cannot truncate at
 * draw time (see `docs/bug/ask-user-question-long-options-truncated.md`). The
 * custom scrollable selector truncates at render time against the real
 * terminal width instead, so it opts out of this cap. Width is measured in
 * terminal columns (CJK/emoji count as 2), not UTF-16 length.
 */
export const MAX_OPTION_LABEL_WIDTH = 60

/**
 * Truncate `str` so its terminal display width fits `maxWidth` columns,
 * appending an ellipsis when truncation happens. Iterates grapheme clusters
 * (via `Intl.Segmenter` when available), so multi-code-point sequences such as
 * ZWJ emoji families are measured and cut as a whole.
 */
function truncateToDisplayWidth(str: string, maxWidth: number): string {
  if (visibleWidth(str) <= maxWidth) return str
  let width = 0
  let out = ""
  for (const cluster of segmentGraphemes(str)) {
    const w = visibleWidth(cluster)
    if (width + w > maxWidth - 1) break
    out += cluster
    width += w
  }
  return out + "…"
}

/** Split into grapheme clusters; falls back to code points without `Intl.Segmenter`. */
function segmentGraphemes(str: string): string[] {
  if (typeof Intl.Segmenter === "undefined") return [...str]
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" })
  return [...segmenter.segment(str)].map((s) => s.segment)
}

/**
 * Build the single-line display label for one option.
 * Supports string options and structured { label, description } objects.
 *
 * Rules:
 * - Take only the first line (drop embedded `\n`).
 * - Trim surrounding whitespace.
 * - When `maxWidth` is given, truncate to that many terminal columns with an
 *   ellipsis (CJK/emoji count as 2 columns). When omitted, keep the full text
 *   and let a width-aware renderer truncate at draw time.
 */
export function toOptionDisplayLabel(option: QuestionOption, maxWidth?: number): string {
  let firstLine: string
  if (typeof option === "object" && option !== null && "label" in option) {
    const label = option.label.trim()
    const desc = option.description?.trim()
    const combined = desc ? `${label} — ${desc}` : label
    firstLine = combined.split("\n", 1)[0] ?? ""
  } else {
    firstLine = String(option).split("\n", 1)[0] ?? ""
  }
  const trimmed = firstLine.trim()
  return maxWidth === undefined ? trimmed : truncateToDisplayWidth(trimmed, maxWidth)
}

/**
 * Build display labels for all options, disambiguating collisions with a
 * numeric suffix so the selector never shows two identical rows.
 *
 * When `maxWidth` is given, labels are truncated to that many terminal
 * columns before deduplication (see {@link toOptionDisplayLabel}).
 *
 * @returns A map from display label back to the original full option string.
 *          When collisions exist, labels become `<label> (#<n>)`.
 */
export function normalizeQuestionOptions(options: QuestionOption[], maxWidth?: number): Map<string, string> {
  const labelToOriginal = new Map<string, string>()
  const labelCounts = new Map<string, number>()

  for (const original of options) {
    const baseLabel = toOptionDisplayLabel(original, maxWidth)
    const count = (labelCounts.get(baseLabel) ?? 0) + 1
    labelCounts.set(baseLabel, count)

    // Start from the count-based suffix, then keep appending (#n) until we find
    // a label that is truly unused. This handles pathological inputs where an
    // option's own text already ends in `(#k)` and would otherwise collide.
    let label = count === 1 ? baseLabel : `${baseLabel} (#${count})`
    let dedup = count
    while (labelToOriginal.has(label)) {
      dedup += 1
      label = `${baseLabel} (#${dedup})`
    }

    const resolvedValue = typeof original === "object" && original !== null && "label" in original
      ? original.label
      : String(original)
    labelToOriginal.set(label, resolvedValue)
  }

  return labelToOriginal
}

/** Choose a display label for the custom-answer sentinel that never collides. */
export function resolveCustomSentinelLabel(labelToOriginal: Map<string, string>): string {
  if (!labelToOriginal.has(CUSTOM_SENTINEL)) {
    return CUSTOM_SENTINEL
  }
  let index = 2
  while (labelToOriginal.has(`${CUSTOM_SENTINEL} (#${index})`)) {
    index += 1
  }
  return `${CUSTOM_SENTINEL} (#${index})`
}

export function createAskUserQuestionTool() {
  return {
    name: "ask_user_question",
    async execute(
      input: AskUserQuestionInput,
      ui: AskUserQuestionUi,
    ): Promise<AskUserQuestionResult> {
      if (!input.options || input.options.length === 0) {
        const answer = await ui.input(input.question)
        return answer === null
          ? { answer: null, mode: "cancelled" }
          : { answer, mode: "input" }
      }

      const allowCustom = input.allowCustom ?? true
      const labelToOriginal = normalizeQuestionOptions(input.options, ui.maxLabelWidth)
      const customLabel = allowCustom
        ? resolveCustomSentinelLabel(labelToOriginal)
        : null
      const displayOptions = customLabel
        ? [...labelToOriginal.keys(), customLabel]
        : [...labelToOriginal.keys()]

      const selected = await ui.select(input.question, displayOptions)

      if (selected === null) {
        return { answer: null, mode: "cancelled" }
      }

      if (allowCustom && customLabel && selected === customLabel) {
        const customAnswer = await ui.input("Your answer")
        return customAnswer === null
          ? { answer: null, mode: "cancelled" }
          : { answer: customAnswer, mode: "custom" }
      }

      return {
        answer: labelToOriginal.get(selected) ?? selected,
        mode: "select",
      }
    },
  }
}
