---
name: 10-rules
description: "Progressively load project coding rules on demand. Auto-triggered by plan, work, and review skills, or run manually with /skill:10-rules."
---

# Rules

Rules are loaded from two locations with clear priority:

1. **Project-level** `{repo-root}/rules/` — if it exists, takes priority. Users maintain this themselves; survives `pi update`.
2. **Package-level** `rules/` in the super-pi package — built-in defaults, used when no project-level override exists.

Detection: check `{repo-root}/rules/` first. If a file exists at the project level for the topic being loaded, use it. Otherwise fall back to the package-level copy.

## Core rule

Do not load the entire rules tree by default. Read only the files needed for the current task.

## Pre-flight: what to load by phase

### Before planning (02-plan)

Read at minimum:
- `rules/common/development-workflow.md`
- `rules/common/testing.md`
- **Detect the active language** from the project: check for `tsconfig.json` → typescript, `package.json` (without tsconfig) → javascript, `Cargo.toml` → rust, `go.mod` → golang, `pubspec.yaml` → dart, `pom.xml`/`build.gradle` → java, `*.sln`/`*.csproj` → csharp, `Package.swift` → swift, `requirements.txt`/`pyproject.toml`/`setup.py` → python, `composer.json` → php, `Makefile.PL`/`cpanfile` → perl, `build.gradle.kts` → kotlin. Load all files in the matching language directory (e.g. `rules/typescript/`).
- `rules/web/` files if the task involves frontend/browser concerns

### Before implementation (03-work)

Read the common minimum above, plus:
- The language directory matching the active codebase (e.g. `rules/typescript/` for TS work)
- `rules/web/` files if the task involves frontend/browser concerns

### Before review (04-review)

Read at minimum:
- `rules/common/code-review.md`
- The language directory matching the changed files

## Progressive loading order

1. **Workflow** — `common/development-workflow.md`
2. **Testing/TDD** — `common/testing.md`
3. **Scenario** — `web/*` only if frontend is relevant
4. **Language** — matching language directory only
5. **Additional** — security, performance, patterns, hooks, coding-style — only when the task calls for it

## Rule precedence

When the same topic exists at multiple layers, higher priority wins:

```
language-specific > web > common
```

Override mapping by topic:
- `common/testing.md` ← `web/testing.md` ← `<lang>/testing.md`
- `common/coding-style.md` ← `web/coding-style.md` ← `<lang>/coding-style.md`
- `common/patterns.md` ← `web/patterns.md` ← `<lang>/patterns.md`
- `common/security.md` ← `web/security.md` ← `<lang>/security.md`
- `common/hooks.md` ← `web/hooks.md` ← `<lang>/hooks.md`

## Available layers

- `common/` — always relevant baseline (10 files)
- `typescript/`, `python/`, `cpp/`, `csharp/`, `dart/`, `golang/`, `java/`, `kotlin/`, `perl/`, `php/`, `rust/`, `swift/` — language-specific overrides (5 files each)
- `web/` — frontend/web scenario (7 files, includes additive-only `design-quality.md` and `performance.md`)

## Output expectation

When rules are loaded, state briefly:
- which rule files were loaded
- which are acting as overrides
- what constraints they impose on the current task
