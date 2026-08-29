---
title: "Sync upstream ECC rules/ updates (fastapi.md, quarkus skill refs)"
status: rejected
date: 2026-08-29
---

# Out-of-Scope Entry

## Request

Check whether the upstream source repo [ECC](https://github.com/affaan-m/ECC) (formerly everything-claude-code, the origin of this package's `rules/` tree) has rule updates worth syncing into super-pi.

## Disposition

**Rejected after full diff** (2026-08-29, ECC main vs local `rules/`):

- `python/fastapi.md` (upstream-new, 58 lines) — framework-level rule in a language-only loading model. super-pi loads whole `rules/{lang}/` directories with no frontmatter `paths` filtering, so every Django/Flask project would read FastAPI rules as noise. No framework-level rule precedent exists locally.
- `java/{patterns,security,testing}.md` — each gained one "See skill: `quarkus-*`" line pointing at ECC's own skills (`quarkus-tdd`, `quarkus-security`, `quarkus-patterns`). super-pi has no such skills; absorbing creates dangling references.
- `typescript/security.md` — local uses `OPENAI_API_KEY` vs upstream `API_KEY`: local intentional customization, keep.

Local tree is **ahead** of upstream (review-checklist.md ×3, code-smells.md, naming.md, The Ladder, debt marker, precision gate are all local additions). Upstream re-scan has diminishing value unless rules loading gains per-file `paths` filtering.

Re-open condition: if `rules/{lang}/` loading starts honoring frontmatter `paths` (framework files load only on matching projects), fastapi.md becomes absorbable minus its "See skill: fastapi-patterns" line.

## Trigger phrases

ECC, everything-claude-code, upstream rules, rules sync, fastapi rules, quarkus rules, 同步上游 rules, rules 引用源
