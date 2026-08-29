---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
---
# TypeScript Review Checklist

> TypeScript/JavaScript-specific defect patterns for code review. Used together with [common/code-review.md](../common/code-review.md).
> **Precision over recall:** only raise an issue when confident it is a real defect. Stay silent when surrounding context is unclear. Treat security/correctness as blocking; style/idiom as non-blocking.

## Null and Undefined Handling

- Optional chaining missing where a value can legitimately be `null`/`undefined`: `obj.prop.deep` crashing when `obj.prop` is optional. Use `obj?.prop` or an explicit guard.
- Non-null assertion (`!`) used to silence the compiler without evidence the value exists — every `!` must rest on a proven invariant (checked above, or constructed non-null).
- Array access `arr[i]` assumed defined when the index can be out of bounds or the array empty (`noUncheckedIndexedAccess` reveals these; without it, check length first).
- `value ?? fallback` vs `value || fallback` confusion: `||` also swallows `0`, `""`, `false`. Do not report when the falsy values are intended to fall through.

## Type Safety

- `any` leaking through a public API boundary (parameter, return type, or generic default) instead of `unknown` + narrowing.
- Unsafe assertions (`as Foo`) on data crossing a trust boundary (`JSON.parse`, `fetch`, user input) without a runtime validation step.
- Type assertions that claim more than they prove: `x as Foo` followed by unconditional `x.bar` access.
- Object spread of optional sources (`{...defaults, ...partial}`) when `partial` may contain explicit `undefined` values that override defaults; merge field-by-field when the distinction matters.
- Do not report `any` in test fixtures, or in third-party type shims the project has accepted.

## Async and Promise Handling

- Floating promises: promise created without `await`, `.then`, `.catch`, or `void` — rejections vanish silently. Especially fire-and-forget `async` calls in event handlers.
- `async` functions without any `await` — callers may not expect a promise; drop `async` or await inside.
- Sequential `await` in a loop over independent operations where `Promise.all` (or `allSettled` when partial failure is acceptable) is correct — confirm independence before flagging.
- `Promise.all` on operations where one rejection should not cancel the rest; `Promise.allSettled` is the right tool.
- `forEach` with an `async` callback — it does not wait; use `for...of` + `await`, or `Promise.all(map(...))`.
- Missing `try/catch` (or `.catch`) around awaited calls whose rejection is a realistic user-visible failure mode.
- Do not report when an upstream caller demonstrably handles the rejection, or the runtime treats unhandled rejections as fatal.

## Error Handling

- Empty `catch {}` that swallows errors without logging or re-raising.
- `catch` blocks that lose the original error; wrap with `new Error(msg, { cause: e })` or a typed error class instead.
- Broad `try` wrapping many statements where only one line can throw, hiding the real failure point.
- Errors converted to sentinel values (`return null` / `-1`) without the caller checking; prefer throwing or a result type.
- Do not report re-throws at top-level CLI handlers or framework-managed boundaries (Express error middleware, React error boundaries).

## Equality and Value Semantics

- `NaN` compared with `===`/`==` (always false); use `Number.isNaN`.
- Loose `==` against non-null literals (except the idiomatic `x == null` covering both null and undefined).
- Object/array compared with `===` where value equality was intended.
- `Object.is` semantics surprising at `0`/`-0` and `NaN` — flag only when those values are realistic.

## Resource Management

- Event listeners, timers (`setInterval`/`setTimeout`), subscriptions, or observers added without removal on teardown/dispose paths.
- Missing `AbortController` on long-lived fetches that can be cancelled (unmount, navigation, shutdown).
- DB connections / file handles opened without `finally` cleanup or an owning pool.
- Do not report short-lived scripts, or teardown already managed by a framework lifecycle.

## Concurrency and Shared State

Only flag with evidence of concurrent access (confirm via `code_search`):
- Module-level mutable state (singletons, caches, module-scoped arrays) mutated across requests or sessions.
- Check-then-act on shared state without synchronization; React stale-closure writes (`setX(x + 1)` in async callbacks) where `setX(v => v + 1)` is required.
- `await` gaps between read and write of shared in-memory state.
- Do not report single-threaded local variables or immutable data.

## Performance

Confirm hot path and data scale before flagging:
- Spread-in-loop `O(n²)` accumulation (`arr = [...arr, item]`); accumulate into a local array instead.
- Repeated expensive computation without memoization when inputs are stable and the call is hot.
- `.filter().map()` double pass where a single loop or `.reduce` is clearer and faster.
- Synchronous heavy work (`JSON.parse` of large payloads, `fs.readFileSync`) on request paths; move async.
- Do not report micro-optimizations in cold paths, or code the project has profiled and accepted.

## Not for this rule

- Do not report style issues the formatter/linter (`prettier`, `eslint`, `tsc --strict`) already catches, unless the diff shows a concrete user-visible consequence those tools miss.
- Do not report missing types in `.d.ts` shims, or `// @ts-expect-error` sites that are deliberate and localized.
- Do not report dead code intentionally kept for future use.
