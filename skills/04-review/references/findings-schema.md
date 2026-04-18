# Findings schema

Each structured finding must include:

- `severity` — one of: `high`, `moderate`, `low`
- `summary` — one-line description of the issue
- `evidence` — code reference, diff excerpt, or file path
- `recommended action` — what should be done to address the finding

Optional fields:

- `related plan unit` — which implementation unit this relates to
- `related learning` — link to a `docs/solutions/` artifact
- `reviewer` — which reviewer persona flagged this
- `autofixable` — whether this finding can be automatically fixed
- `autofix applied` — whether the autofix was applied
- `autofix summary` — description of what was changed
