# Code Smells — Fowler Baseline

A fixed baseline of code smells (Fowler, _Refactoring_, ch.3) for the **Standards axis** of review. Applies even when a repo documents no conventions. Used by `04-review`, and by `03-work` REFACTOR phase as a check list.

## Two binding rules

1. **The repo overrides.** A documented repo standard (in `rules/` or `CODING_STANDARDS.md` / `CONTRIBUTING.md`) always wins. Where a repo endorses something this baseline would flag, suppress the smell.
2. **Always a judgement call.** Each smell is a labelled heuristic — report it as "possible Feature Envy", never a hard violation. Skip anything tooling (compiler, formatter, linter, type checker) already enforces.

## Severity mapping

These smells are orthogonal to the P0/P1/P2 severity ladder:

- Default **P2** (建议) — pure maintainability/readability smell with no correctness impact.
- Escalate to **P1** (重要) when the smell is endorsed by a repo doc, or when it materially harms this codebase's data flow / testability.
- Escalate to **P0** (阻断) only when the smell coincides with a real defect (e.g. Duplicated Code that diverges and causes a bug).

## The 12 smells (diff-friendly)

Each entry reads *what it is* → *how to fix*. Match against the diff, not the whole file.

- **Mysterious Name** — a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code** — the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy** — a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps** — the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession** — a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches** — the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery** — one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change** — one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality** — abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains** — long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man** — a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest** — a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

## What is deliberately NOT here

These are Fowler's file-level smells, **excluded from the review baseline** because they read against a whole file, not a diff — weak signal in a diff-based review. They belong in architecture audit (`references/module-design.md`) and `03-work` REFACTOR, not in `04-review` Standards axis:

- Long Method, Large Class, Long Parameter List, Data Class, Dead Code, Comments, Divergent … (full file-level set).

If a review surfaces one of these against the whole file anyway, report it as an **architecture-axis** finding using `module-design.md` vocabulary (shallow module, missing seam), not as a smell.
