/**
 * Subagent recursion depth guard.
 *
 * Prevents uncontrolled recursive subagent spawning by tracking depth
 * via environment variables. Inspired by pi-subagents' depth control
 * but implemented as a minimal, standalone module.
 *
 * Environment variables:
 *   PI_SUBAGENT_DEPTH     — current nesting depth (default: 0)
 *   PI_SUBAGENT_MAX_DEPTH — maximum allowed depth (default: 2)
 */

/** Default maximum subagent nesting depth */
export const DEFAULT_MAX_SUBAGENT_DEPTH = 2

/**
 * Read the current subagent depth from environment.
 * Returns 0 if unset or invalid.
 */
export function getCurrentDepth(): number {
  const raw = process.env.PI_SUBAGENT_DEPTH
  if (!raw) return 0
  const depth = parseInt(raw, 10)
  return Number.isNaN(depth) ? 0 : depth
}

/**
 * Read the maximum allowed depth from environment.
 * Falls back to DEFAULT_MAX_SUBAGENT_DEPTH if unset or invalid.
 */
export function getMaxDepth(): number {
  const raw = process.env.PI_SUBAGENT_MAX_DEPTH
  if (!raw) return DEFAULT_MAX_SUBAGENT_DEPTH
  const max = parseInt(raw, 10)
  return Number.isNaN(max) || max < 0 ? DEFAULT_MAX_SUBAGENT_DEPTH : max
}

/**
 * Check whether subagent execution is allowed at the current depth.
 * Returns an object with:
 *   allowed — whether execution can proceed
 *   depth   — the current depth
 *   max     — the maximum depth
 *   reason  — human-readable explanation if blocked
 */
export function checkSubagentDepth(): {
  allowed: boolean
  depth: number
  max: number
  reason?: string
} {
  const depth = getCurrentDepth()
  const max = getMaxDepth()

  if (depth >= max) {
    return {
      allowed: false,
      depth,
      max,
      reason: `Subagent recursion depth limit reached (depth=${depth}, max=${max}). ` +
        `Set PI_SUBAGENT_MAX_DEPTH to increase the limit.`,
    }
  }

  return { allowed: true, depth, max }
}

/**
 * Build environment variables to pass to a child subagent process.
 * Increments the depth counter so the child can guard its own spawns.
 *
 * @param overrides — optional overrides for max depth per-agent
 */
export function getChildDepthEnv(overrides?: {
  maxDepth?: number
}): Record<string, string> {
  const currentDepth = getCurrentDepth()
  const childDepth = currentDepth + 1
  let maxDepth = overrides?.maxDepth ?? getMaxDepth()
  if (maxDepth < 0) maxDepth = DEFAULT_MAX_SUBAGENT_DEPTH

  return {
    PI_SUBAGENT_DEPTH: String(childDepth),
    PI_SUBAGENT_MAX_DEPTH: String(maxDepth),
  }
}
