# Spec source detection

The 04-review Spec axis needs an originating spec to compare the diff against. When the user invokes 04-review standalone (no brainstorm, no plan), the Spec axis would otherwise be inert. This reference defines the probe that finds a spec source in priority order.

## Four-level probe

Try each source in order; use the first that applies:

1. **Plan artifact** (`docs/plans/`) — the default. Compare the diff against the plan's implementation units.
2. **Brainstorm artifact** (`docs/brainstorms/`) — trace back to the user's original wording to catch directional misunderstandings the plan itself encoded. A plan can faithfully implement the wrong thing if the brainstorm scope was misread.
3. **Issue references in commit messages** — scan `git log <base>..HEAD --oneline` for tokens like `#123`, `Closes #45`, `Fixes #67`, GitLab `!67`. When a ref is found, **identify it and ask the user** whether to treat the linked issue as the spec source. Do **not** auto-fetch (`gh issue view`, network calls). The decision to adopt a ref as spec stays with the user.
4. **Skip** — if none of the above yield a spec, the Spec axis is skipped for this run.

## Artifact-driven guard

The probe deliberately uses only local operations:

- `git log` for commit-message scanning — no network, no tracker API.
- No `gh issue view`, no GitHub/Linear/Jira fetch. super-pi's source of truth is the artifact, not an external tracker.

This is consistent with the four-filter evaluation in solution `2026-07-22-absorbing-external-skill-repos`: the artifact-driven filter rejects making an issue tracker a source of truth, but permits using a commit ref as an optional clue that a human promotes to spec.

## Why issue refs and not auto-fetch

- **Standalone-invocation coverage**: a team that tracks specs in GitHub issues can `/skill:04-review` a PR directly, without running 01-brainstorm. The commit-message ref is the only local signal that an issue exists.
- **No new hard dependency**: `git log` is always available; `gh` may not be installed or authenticated. Auto-fetch would couple review to tracker availability.
- **User stays in control**: a ref might be tangential (`#123` fixing an unrelated typo in the same commit). Asking before adopting prevents false specs from corrupting the Spec axis.

## Output against the chosen spec

Whichever source wins, the Spec axis reports three classes of finding against it:

- **missing** — requirements the spec asked for that the diff does not deliver.
- **scope creep** — behaviour in the diff the spec did not request.
- **wrong implementation** — requirements that look implemented but where the implementation is incorrect.
