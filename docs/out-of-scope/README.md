# Out-of-Scope Knowledge Base

Records requests that were **rejected** or **already implemented**, so they don't get re-proposed. Distinct from `docs/solutions/` (which records solved problems) — this KB records what NOT to do again.

## Why

Without this KB, the same rejected request returns every few sessions. `01-brainstorm` and `02-plan` search here before proposing work, preventing duplicate effort.

## When to write here (05-learn)

`05-learn` writes an entry when a request turns out to be:

- **Rejected** — the work was considered and ruled out (wrong direction, not worth it, conflicts with an ADR).
- **Already implemented** — the requested behaviour already exists in the codebase. Point to where it lives; this is NOT a rejection, just "already done".

Do NOT write here for: solved problems (those go to `docs/solutions/`), or ephemeral "not right now" deferrals.

## Format

One markdown file per entry: `docs/out-of-scope/<YYYY-MM-DD>-<slug>.md`

Use the template at `skills/05-learn/assets/out-of-scope-template.md`.

## Consumption rules

- **01-brainstorm** — before fleshing out a new idea, grep `docs/out-of-scope/` for matching trigger phrases. If found, surface it: "This was recorded as out-of-scope on <date>: <reason>. Still want to proceed?"
- **02-plan** — before planning a unit, check whether the feature was previously rejected. A rejected item can be re-opened, but the original reasoning must be acknowledged first.
