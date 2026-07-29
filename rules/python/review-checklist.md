---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Review Checklist

> Python-specific defect patterns for code review. Used together with [common/code-review.md](../common/code-review.md).
> **Precision over recall:** only raise an issue when confident it is a real defect. Stay silent when surrounding context is unclear. Treat security/correctness as blocking; style/idiom as non-blocking.

## Mutable Default Arguments and Shared State

- Mutable default arguments (`def f(x=[])` or `def f(x={})`): the default is created once and shared across every call. Default to `None` and build inside the body.
- Class-level mutable attributes shared unintentionally across instances when a per-instance value was intended.
- Module-level mutable globals (lists, dicts, caches) mutated across requests or threads, retaining state that surprises the caller.
- Closures that capture a loop variable by reference and all end up seeing its final value.
- Do not report when the function never mutates the argument, or the shared default is a deliberate documented cache or sentinel.

## Boundary and Edge-Case Handling

- Empty inputs assumed non-empty: indexing `xs[0]`, `max()`/`min()`, slicing without first handling empty `list`, `str`, `dict`, or iterator.
- Off-by-one and out-of-range access on indices, ranges, or slices, especially at first/last element.
- `None` reaching code that assumes a value, when an upstream call or default can legitimately return `None`. Confirm the data source with `file_read` before flagging.
- Comparing floats for exact equality with `==`; use `math.isclose` or explicit tolerance.
- Integer/float division assumptions: unintended truncation with `//`, or `ZeroDivisionError` when a divisor can be zero.
- Dictionary access by key without handling the missing-key case (`d[k]` vs `d.get(k)`).
- Do not report edge cases that a caller or type contract has already ruled out, or inputs that cannot occur given validated boundaries upstream.

## Error Handling and Exceptions

- Bare `except:` swallows everything including `KeyboardInterrupt` and `SystemExit`; catch `except Exception` at minimum.
- `except Exception` broader than the failure being handled; narrow it to the specific exception types expected.
- Exceptions caught and silently discarded (`pass`) without logging or re-raising.
- Original traceback lost when re-raising; prefer `raise NewError(...) from err` to preserve the cause.
- Broad `try` blocks that wrap far more than the line that can actually fail, hiding where the error originates.
- `assert` used for runtime validation of external input — assertions are stripped under `python -O`.

## Identity and Equality Comparisons

- Using `is`/`is not` to compare against literals (strings, numbers, tuples); this relies on implementation-specific interning rather than value equality — use `==`.
- Comparing against `True`/`False` with `==`, where a truthy-but-not-`True` value (e.g. `1`) would compare unequal; prefer plain truthiness check.
- Comparing against `None` with `==`/`!=` rather than `is`/`is not` — minor style preference.

## Resource Management

- Files, sockets, locks, or DB connections opened without a `with` statement, risking leaks on early return or exception.
- Resources acquired in a `try` whose `finally` cleanup is missing or incomplete on the error path.
- Do not report short-lived scripts, or handles already managed by an enclosing `with` or framework.

## Performance

Confirm data scale and hot path before flagging:
- Building strings with `+=` in a loop instead of accumulating in a list and `"".join(...)`.
- Repeated membership tests against a `list` where a `set` or `dict` would turn O(n) into O(1).
- Building a full list when a generator would avoid holding everything in memory.
- Passing eagerly formatted f-string to `logging` (`logging.info(f"...")`) instead of `logging.info("%s", value)`, which defeats lazy formatting.

## Concurrency

Only flag when there is evidence of multi-threaded or async invocation (confirm with `code_search`):
- CPU-bound work parallelized with `threading` under the GIL where `multiprocessing` is the right tool.
- Check-then-act races on shared state without a `Lock`, or non-atomic compound operations.
- Do not report single-threaded locals, immutable data, or framework-managed async contexts.

## Not for this rule

- Do not report spelling errors at reference sites (determined by the declaration).
- Do not report dead code that is intentionally preserved for documentation or future use.
- Do not report resource management issues in short-lived scripts.
- Do not flag style preferences that the project's formatter (black, ruff) already enforces.
