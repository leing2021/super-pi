// ============================================================================
// Compaction Prompt Optimizer
// ============================================================================
//
// Hooks into `session_before_compact` to inject custom instructions that make
// compaction summaries more focused and useful for coding agent context.
//
// This is a "prompt-only" optimization — it doesn't replace pi's compaction
// flow, just adds focus instructions to the summarization prompt.

/**
 * Custom instructions appended to compaction summarization prompts.
 *
 * Goals:
 * 1. Preserve exact technical identifiers (paths, names, error messages)
 * 2. Be terse on reasoning process, verbose on concrete state changes
 * 3. Summarize file reads by purpose rather than including code snippets
 * 4. Keep Critical Context section detailed for continuation
 */
export const COMPACTION_FOCUS_INSTRUCTIONS = `Additional focus for this summary:

1. Preserve EXACT file paths, function names, class names, variable names, and error messages — never paraphrase these
2. For each code change, note: file path, function/class, what changed, and why
3. Summarize file reads by their purpose (e.g., "read auth.ts to understand JWT middleware flow") rather than including code snippets
4. Be concise on the agent's reasoning process; be verbose on concrete state changes and decisions
5. Keep the "Critical Context" section detailed — this is what the agent needs to continue working
6. If any tests were run, summarize results by: file, pass/fail count, and specific failure messages
7. Note any blocked items and their exact error state`

/**
 * Additional instructions for turn-prefix summaries (split turns).
 * These are more concise since the turn suffix is retained.
 */
export const TURN_PREFIX_FOCUS_INSTRUCTIONS = `Focus the turn-prefix summary on:
- What the user originally asked for
- Key decisions made in the prefix
- Exact file paths and identifiers needed to understand the retained suffix
Skip reasoning details — only keep actionable context.`
