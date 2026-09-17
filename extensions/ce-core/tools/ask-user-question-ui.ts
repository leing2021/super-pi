import {
  Container,
  Key,
  matchesKey,
  truncateToWidth,
  wrapTextWithAnsi,
} from "@earendil-works/pi-tui"

/**
 * Result shape returned by the scrollable ask_user_question custom UI.
 *
 * - `selectedLabel`: the normalized display label the user picked (may be the
 *   custom sentinel), or `null` when cancelled.
 * - The caller maps `selectedLabel` back to the original full option string.
 */
export interface AskUserQuestionSelection {
  selectedLabel: string | null
}

interface AskUserQuestionCustomOptions {
  question: string
  displayOptions: string[]
  customLabel: string | null
}

/**
 * Maximum number of option/question rows rendered before the viewport scrolls.
 * Keeps the dialog inside typical terminal heights while still being readable.
 */
const MAX_VISIBLE_ROWS = 10

/**
 * Render the question body as wrapped lines so long questions stay readable
 * inside the scrollable custom dialog.
 */
function renderQuestionLines(question: string, width: number, fg: (color: string, text: string) => string): string[] {
  const lines = wrapTextWithAnsi(question, width)
  return lines.map((line) => truncateToWidth(fg("text", line), width))
}

/**
 * Scrollable selector component for `ask_user_question`.
 *
 * Renders a wrapped (multi-line) question and a list of single-line options.
 * Handles:
 * - up/down navigation with scroll offset
 * - 1-9 direct selection via single-digit keypress
 * - Enter to confirm
 * - Escape / cancel keybinding to cancel
 * - Ctrl+] to peek terminal output above (Esc while collapsed uncollapses)
 * - optional "Other" custom entry label
 *
 * Built to work inside Pi's `ctx.ui.custom()` factory contract:
 * `(tui, theme, keybindings, done) => Component`.
 */
export class AskUserQuestionSelector extends Container {
  private readonly options: string[]
  private readonly question: string
  private readonly customLabel: string | null
  private readonly theme: { fg: (color: string, text: string) => string }
  private readonly done: (result: AskUserQuestionSelection) => void
  private selectedIndex = 0
  private scrollOffset = 0
  private resolved = false
  private isCollapsed = false

  constructor(
    opts: AskUserQuestionCustomOptions,
    theme: { fg: (color: string, text: string) => string },
    done: (result: AskUserQuestionSelection) => void,
  ) {
    super()
    this.options = opts.displayOptions
    this.question = opts.question
    this.customLabel = opts.customLabel
    this.theme = theme
    this.done = done
  }

  /** Resolve a selected display label into the result handed to `done()`. */
  private commit(index: number): void {
    if (this.resolved) return
    this.resolved = true
    const selected = this.options[index] ?? null
    this.done({ selectedLabel: selected })
  }

  handleInput(data: string): void {
    // Transcript peeking: Ctrl+] toggles collapsed state to let user inspect terminal buffer
    if (matchesKey(data, Key.ctrl("]")) || data === "\x1d") {
      this.isCollapsed = !this.isCollapsed
      return
    }

    if (this.isCollapsed) {
      // Esc while collapsed uncollapses rather than cancelling the prompt
      if (matchesKey(data, Key.escape)) {
        this.isCollapsed = false
      }
      return
    }

    // Number keys 1-9 for quick direct option picking (single-key guard)
    if (/^[1-9]$/.test(data)) {
      const num = Number(data)
      if (num <= this.options.length) {
        this.commit(num - 1)
        return
      }
    }

    if (matchesKey(data, Key.up) || data === "k") {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1)
      this.scrollOffset = Math.min(this.scrollOffset, this.selectedIndex)
    } else if (matchesKey(data, Key.down) || data === "j") {
      this.selectedIndex = Math.min(this.options.length - 1, this.selectedIndex + 1)
      const maxStart = Math.max(0, this.selectedIndex - MAX_VISIBLE_ROWS + 1)
      this.scrollOffset = Math.max(this.scrollOffset, maxStart)
    } else if (matchesKey(data, Key.enter) || data === "\n" || data === "\r") {
      this.commit(this.selectedIndex)
    } else if (matchesKey(data, Key.escape)) {
      if (this.resolved) return
      this.resolved = true
      this.done({ selectedLabel: null })
    }
  }

  render(width: number): string[] {
    const fg = this.theme.fg.bind(this.theme)

    if (this.isCollapsed) {
      const hint = " [Collapsed · Ctrl+] to expand]"
      const avail = Math.max(10, width - hint.length - 2)
      const firstLine = this.question.split("\n", 1)[0] ?? ""
      const qSummary = firstLine.length > avail ? `${firstLine.slice(0, avail - 1)}…` : firstLine
      return [
        truncateToWidth(fg("accent", "─".repeat(width)), width),
        truncateToWidth(fg("dim", `${hint} ${qSummary}`), width),
        truncateToWidth(fg("accent", "─".repeat(width)), width),
      ]
    }

    const lines: string[] = []
    const innerWidth = Math.max(20, width - 2)

    lines.push(truncateToWidth(fg("accent", "─".repeat(width)), width))
    for (const line of renderQuestionLines(this.question, innerWidth, fg)) {
      lines.push(` ${line}`)
    }
    lines.push("")

    const visible = this.options.slice(
      this.scrollOffset,
      this.scrollOffset + MAX_VISIBLE_ROWS,
    )
    for (let i = 0; i < visible.length; i++) {
      const optionIndex = this.scrollOffset + i
      const isSelected = optionIndex === this.selectedIndex
      const isCustom = this.customLabel !== null && visible[i] === this.customLabel
      const numPrefix = optionIndex < 9 ? `${optionIndex + 1}. ` : "   "
      const prefix = isSelected ? fg("accent", `→ ${numPrefix}`) : `  ${numPrefix}`
      const marker = isCustom ? fg("muted", " ✎") : ""
      lines.push(truncateToWidth(`${prefix}${fg(isSelected ? "accent" : "text", visible[i])}${marker}`, width))
    }

    if (this.options.length > MAX_VISIBLE_ROWS) {
      lines.push(
        truncateToWidth(
          fg("muted", `  (${this.selectedIndex + 1}/${this.options.length})`),
          width,
        ),
      )
    }

    lines.push("")
    lines.push(
      truncateToWidth(
        fg("dim", " ↑↓/jk navigate · 1-9 pick · Ctrl+] peek · Enter select · Esc cancel"),
        width,
      ),
    )
    lines.push(truncateToWidth(fg("accent", "─".repeat(width)), width))
    return lines
  }
}

/**
 * Build the factory passed to `ctx.ui.custom()`.
 *
 * Returns either a normalized display label (the user picked an option / custom
 * sentinel) or `null` when the user cancelled.
 */
export function createAskUserQuestionCustomFactory(opts: AskUserQuestionCustomOptions) {
  return (
    _tui: unknown,
    theme: { fg: (color: string, text: string) => string },
    _keybindings: unknown,
    done: (result: AskUserQuestionSelection) => void,
  ): AskUserQuestionSelector => {
    return new AskUserQuestionSelector(opts, theme, done)
  }
}
