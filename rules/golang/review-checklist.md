---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---
# Go Review Checklist

> Go-specific defect patterns for code review. Used together with [common/code-review.md](../common/code-review.md).
> **Precision over recall:** report only defects you are confident are real in the changed code. Verify claims with `file_read` and `code_search` before reporting.

## Errors, Panics, and API Contracts

- Errors returned from calls that are ignored, overwritten, or converted into success/default values that hide a failure. A deliberately best-effort operation is acceptable only when the ignored failure is safe and evident from context.
- Error wrapping that loses the original cause (`fmt.Errorf("...: %v", err)` when callers need `errors.Is`/`errors.As`), wraps nil, returns a misleading sentinel, or exposes internal details at a public boundary. Prefer `%w` when preserving identity.
- `panic`, `log.Fatal`, `os.Exit` in request, worker, library, or cleanup paths where a recoverable error can be returned. Do not flag impossible internal invariants or documented programmer contracts.
- Deferred cleanup that overwrites a primary error, drops a meaningful `Close`/`Commit`/`Rollback` error, or returns success after cleanup makes the result invalid.

## Nil, Interfaces, and Value Semantics

- A typed nil pointer, map, slice, function, channel, or error stored in a non-nil interface and later treated as absent. Check the concrete assignment and all interface checks first.
- Nil maps written to, nil channels used unintentionally (block forever), or nil pointers dereferenced on paths inputs or constructors can actually produce.
- Copying a value after first use when it contains `sync.Mutex`, `sync.RWMutex`, `sync.Once`, `sync.Pool`, `atomic` state, or another non-copyable synchronization primitive. Flag through value receivers, assignment, return, append, map values only when the value can have been used first.
- Value receivers or copies that silently mutate only a copy when callers expect shared state, especially for structs holding maps, slices, pointers, locks, or atomic state.
- `sync.Once` used for work that must retry after failure. `Once.Do` considers its func complete even if it panics; a captured error does not make a later `Do` retry.

## Context, Goroutines, and Cancellation

- Request-scoped work started with `context.Background()`/`TODO()` when it should inherit the caller's deadline, cancellation, values, or tracing. Independent background work is valid.
- `context.Context` stored in a struct or replaced with a custom context interface when it should be passed explicitly as the first parameter.
- `context.WithCancel`, `WithTimeout`, `WithDeadline` whose cancel function is not called once the derived context is no longer needed.
- Blocking I/O, waits, retries, selects, or loops on a request/worker path that lack cancellation or deadline where the dependency can stall.
- Goroutines that can outlive their owner (wait forever on a channel, lock, I/O, unbounded retry), lack shutdown, or have no way for errors/completion to be observed when that matters.
- Fire-and-forget goroutines that capture request-local mutable data, write to a response after handler returns, panic without recovery at a process boundary, or race with cleanup.
- Loop-variable or mutable outer-variable captures in goroutines/callbacks where a closure can observe a later value. Verify the module's `go` directive (Go 1.22 changed range-loop semantics).

## Channels, Locks, and Shared State

Only report races or deadlocks with evidence that state is reachable concurrently; inspect surrounding call sites. Do not flag immutable data, per-goroutine locals, or synchronization guaranteed by ownership.

- Unsynchronized concurrent reads/writes of maps, slices, pointers, counters, caches, or compound state; check-then-act sequences that can interleave.
- Holding a mutex/RWMutex across blocking I/O, channel operations, callbacks, network calls, or long CPU work when another path needs the lock to progress.
- `RLock` used while mutating protected data; unlocked mutation of a field whose peers protect it; atomic and non-atomic access mixed for the same state.
- Sends/receives that can block indefinitely because a peer may stop, a buffer may fill, or shutdown/cancellation is not selected.
- Multiple possible channel closers, send-on-closed-channel risk, or double-close.
- `select` defaults that busy-spin, drop required work, or bypass cancellation; unbounded retries without backoff/cancellation.
- WaitGroups with `Add` racing with `Wait`, missing `Done`, or concurrent Add after Wait begins.

## Not for this rule

- Do not report issues that `go vet`, Staticcheck, `go test -race`, the compiler, or `gofmt` already catch reliably.
- Do not infer concurrent invocation, attacker control, resource ownership, or error contracts solely from function names or package imports.
- Do not flag intentional immutable value objects, single-threaded locals, or documented ownership patterns.
