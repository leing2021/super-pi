# Module Design — deep-module vocabulary

A shared vocabulary for designing module shapes. Use these terms wherever code is being designed or restructured — `03-work` when building a module, `04-review` when auditing architecture. Consistent language is the whole point; don't drift into "component", "service", "API", or "boundary".

## Glossary

**Module** — anything with an interface and an implementation. Scale-agnostic: a function, class, package, or tier-spanning slice. _Avoid_: unit, component, service.

**Interface** — everything a caller must know to use the module correctly: the type signature, but also invariants, ordering constraints, error modes, required configuration, performance characteristics. _Avoid_: API, signature (too narrow — they refer only to the type-level surface).

**Implementation** — what's inside a module, its body of code. Distinct from **Adapter**: a module can have a small adapter with a large implementation (a Postgres repo) or a large adapter with a small implementation (an in-memory fake).

**Depth** — leverage at the interface: the amount of behaviour a caller (or test) can exercise per unit of interface they must learn. A module is **deep** when a large amount of behaviour sits behind a small interface, **shallow** when the interface is nearly as complex as the implementation.

**Seam** _(Michael Feathers)_ — a place where you can alter behaviour without editing in that place; the *location* at which a module's interface lives. Where to put the seam is its own design decision, distinct from what goes behind it. _Avoid_: boundary (overloaded with DDD's bounded context).

**Adapter** — a concrete thing that satisfies an interface at a seam. Describes *role* (what slot it fills), not substance (what's inside).

**Leverage** — what callers get from depth: more capability per unit of interface they learn. One implementation pays back across N call sites and M tests.

**Locality** — what maintainers get from depth: change, bugs, knowledge, and verification concentrate in one place rather than spreading across callers. Fix once, fixed everywhere.

## Deep vs shallow

**Deep module** = small interface + lots of implementation:

```
┌─────────────────────┐
│   Small Interface   │  ← Few methods, simple params
├─────────────────────┤
│                     │
│  Deep Implementation│  ← Complex logic hidden
│                     │
└─────────────────────┘
```

**Shallow module** = large interface + little implementation (avoid):

```
┌─────────────────────────────────┐
│       Large Interface           │  ← Many methods, complex params
├─────────────────────────────────┤
│  Thin Implementation            │  ← Just passes through
└─────────────────────────────────┘
```

## Principles

- **Depth is a property of the interface, not the implementation.** A deep module can be internally composed of small, mockable parts — they just aren't part of the interface.
- **The deletion test.** Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test *past* the interface, the module is probably the wrong shape.
- **One adapter means a hypothetical seam. Two adapters means a real one.** Don't introduce a seam unless something actually varies across it.

## Designing for testability

1. **Accept dependencies, don't create them.** `function processOrder(order, paymentGateway)` is testable; `function processOrder(order)` that news up its own gateway is not.
2. **Return results, don't produce side effects.** `function calculateDiscount(cart): Discount` is testable; `function applyDiscount(cart): void` that mutates is not.
3. **Small surface area.** Fewer methods = fewer tests needed. Fewer params = simpler test setup.

## Where this is used

- **03-work** — when designing or restructuring a module, use these terms to evaluate depth and seam placement.
- **04-review** — when auditing the architecture axis, flag shallow modules and missing seams using this vocabulary.
