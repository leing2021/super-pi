// ============================================================================
// Compaction Prompt Optimizer
// ============================================================================
//
// Focus instructions injected into pi's branch-summary prompts so summaries
// stay useful for coding-agent continuation.
//
// Consumed by the `session_before_tree` hook in `index.ts`, which returns
// `{ customInstructions, replaceInstructions }`. This return shape IS
// supported by pi (consumed in `agent-session.js` navigateTree →
// SessionBeforeTreeResult) and appends focus instructions to summaries
// generated on `/tree` navigation.
//
// Regular context compaction (manual `/compact`, threshold, overflow) is
// NOT covered: pi's `SessionBeforeCompactResult` only accepts `cancel` or a
// full `compaction` replacement — there is no prompt-only injection field
// (`customInstructions` is an event *input*, not a return value). Appending
// focus instructions there would require replacing pi's entire summarizer,
// so we deliberately do not hook it.
//
// This is a "prompt-only" optimization; it does not replace pi's flows.

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


