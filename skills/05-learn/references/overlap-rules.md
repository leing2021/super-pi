# Overlap rules

Use these overlap levels when deciding whether to create a new solution doc or update an existing one.

- **High** — same problem, same root cause, and same solution approach. Update the existing doc.
- **Moderate** — related problem area but a different angle or solution. Create a new doc and cross-link it.
- **Low** — only loosely related. Create a distinct doc.

## Retirement

When an existing solution is discovered stale — the described code/API no longer exists, or the fix has been superseded:

- **Superseded** — fold into the replacing solution (keep the old tags searchable there) and delete the old one.
- **Dead reference** — delete. Git is the archive; no tombstones.
- **Scope narrowed** — update `applies_when` instead of deleting.

Never leave an artifact describing code that no longer exists — stale solutions pollute every future search.
