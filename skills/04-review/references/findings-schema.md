# Findings schema

## Isolation frontmatter (required for every findings artifact)

Start every findings artifact with machine-readable isolation metadata:

```yaml
---
isolation: isolated   # or: degraded
spawn_error: cli_not_found | version | timeout | child_failed   # only when isolation: degraded
---
```

- `isolation: isolated` — produced by a fresh spawned reviewer session (no author context)
- `isolation: degraded` — isolated spawn failed; the review ran in the author's session with reduced independence. Downstream consumers (05-learn, handoff) must treat degraded findings as lower-confidence evidence.
- `spawn_error` — required when degraded: why the spawn failed (`cli_not_found`, `version`, `timeout`, or `child_failed` — the reviewer process exited nonzero, detail included) so the user knows what to fix before re-running

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

## Review summary block

End every review with a summary that includes:

- `rules applied` — language + rule files actually loaded for this review (mirror of the `Rules loaded:` manifest)
- findings count by severity: `high / moderate / low`
- verification status of confirmed findings (fixed / pushed back / deferred)
