# Language Detection

Detect the project's primary language by checking for these files in the repo root:

| File(s) | Language | Rules directory |
|---------|----------|----------------|
| `tsconfig.json` | TypeScript | `rules/typescript/` |
| `package.json` (without `tsconfig.json`) | JavaScript | `rules/typescript/` |
| `Cargo.toml` | Rust | `rules/rust/` |
| `go.mod` | Go | `rules/golang/` |
| `pubspec.yaml` | Dart | `rules/dart/` |
| `pom.xml` / `build.gradle` | Java | `rules/java/` |
| `*.sln` / `*.csproj` | C# | `rules/csharp/` |
| `Package.swift` | Swift | `rules/swift/` |
| `requirements.txt` / `pyproject.toml` / `setup.py` | Python | `rules/python/` |
| `composer.json` | PHP | `rules/php/` |
| `Makefile.PL` / `cpanfile` | Perl | `rules/perl/` |
| `build.gradle.kts` | Kotlin | `rules/kotlin/` |

## Rules loading strategy

Rules are loaded from two locations with priority:

1. **Project-level** `{repo-root}/rules/` — takes priority, survives `pi update`.
2. **Package-level** `rules/` in the super-pi package — built-in defaults.

Check project-level first. If a file exists there for the topic, use it. Otherwise fall back to package-level.

## Project-level extensions

A repo can extend the built-in marker table at the top of this file by creating `{repo-root}/rules/language-detection.md` with additional rows in the same table format (`File(s)` | `Language` | `Rules directory`). Use it when your project uses a language that is not in the built-in table.

Merge semantics (applied before detection):

- **Append:** project-level rows add new languages on top of the built-in table.
- **Same marker → project-level wins:** if a marker file appears in both tables, the project-level row replaces the built-in one.
- **Fall back:** if the project-level file is missing, empty, or a row is malformed, the built-in table applies — behavior never changes silently. A row pointing at a rules directory that does not exist is detected as the language but surfaces as `lang: missing` in the `Rules loaded:` manifest.

The `Rules loaded:` manifest must state the mapping source, e.g. `language=zig (via build.zig, project-level map)` so a broken project-level row is visible in output.

## Rule precedence

```
language-specific > web > common
```

Override mapping by topic:
- `common/testing.md` ← `web/testing.md` ← `<lang>/testing.md`
- `common/coding-style.md` ← `web/coding-style.md` ← `<lang>/coding-style.md`
- `common/patterns.md` ← `web/patterns.md` ← `<lang>/patterns.md`
- `common/security.md` ← `web/security.md` ← `<lang>/security.md`
- `common/hooks.md` ← `web/hooks.md` ← `<lang>/hooks.md`

## Do not load all rules at once

Only load what the current task needs. See each skill's SKILL.md for phase-specific loading instructions.
