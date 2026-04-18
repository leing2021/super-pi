# QA Test Mode

After code review is complete, offer the user browser-based QA testing using `agent-browser`. This catches visual, functional, and UX bugs that code review alone cannot find.

## When to offer

After the review findings are produced and any autofixes applied, ask the user:

> Code review complete. Want me to also run the app through browser-based QA?
>
> - **A) Just code review** — done, no browser testing (existing behavior)
> - **B) Run browser QA** — use agent-browser to test the live app, find visual/functional bugs
> - **C) Browser QA + write regression tests** — find bugs, fix them, and add regression tests

If the user picks A, proceed directly to the handoff.

## Prerequisites

Before starting QA, ensure:
1. The app is running locally (check common ports: 3000, 4000, 8080, 5173)
2. `agent-browser` is available: `which agent-browser`
3. If the app isn't running, ask the user to start it and tell you the URL

## QA tiers

| Tier | What gets fixed | Time |
|------|----------------|------|
| Quick | Critical + high severity | ~2 min |
| Standard | + medium severity | ~5-10 min |
| Exhaustive | + low/cosmetic severity | ~15-20 min |

Default is Standard unless the user specifies otherwise.

## Workflow

### Phase 1: Orient

```bash
agent-browser open <target-url>
agent-browser snapshot -i
agent-browser console --errors
```

Map the application structure. Note framework (Next.js, Rails, SPA, etc.).

### Phase 2: Explore

Visit pages systematically. At each page:

```bash
agent-browser open <page-url>
agent-browser snapshot -i
agent-browser screenshot /tmp/qa-screenshots/<page-name>.png
agent-browser console --errors
```

For each page, check the per-page exploration checklist:

1. **Visual scan** — layout issues, broken images, alignment
2. **Interactive elements** — click buttons, links, controls. Do they work?
3. **Forms** — fill and submit. Test empty, invalid, edge cases
4. **Navigation** — check all paths in and out
5. **States** — empty state, loading, error, overflow
6. **Console** — any JS errors after interactions?

### Phase 3: Document

Document each issue immediately with:
- Screenshot evidence
- Severity (critical/high/medium/low)
- Category (visual/functional/UX/content/performance/accessibility)
- Reproduction steps

### Phase 4: Fix loop (modes B and C)

For each fixable issue, in severity order:

1. **Locate source** — grep for the component, find the responsible file
2. **Fix** — minimal change that resolves the issue
3. **Commit** — `git commit -m "fix(qa): ISSUE-NNN — description"`
4. **Re-test** — navigate back and verify the fix with a screenshot
5. **Classify** — verified / best-effort / reverted

Self-regulation: Stop every 5 fixes and check with the user. Hard cap at 50 fixes.

### Phase 5: Regression tests (mode C only)

For each verified fix, write a regression test:
- Trace the bug's codepath through the code you just fixed
- Set up the exact precondition that triggered the bug
- Assert the correct behavior (NOT "it renders" — test what it DOES)
- Include attribution comment: `// Regression: ISSUE-NNN — {what broke}`
- Run the test, commit if passing

## Issue severity rubric

| Severity | Definition | Examples |
|----------|-----------|---------|
| Critical | Blocks a core workflow, data loss, crash | Form submit causes error page, checkout broken |
| High | Major feature broken, no workaround | Search returns wrong results, file upload fails |
| Medium | Feature works but with problems, workaround exists | Slow page load, form validation missing |
| Low | Minor cosmetic or polish issue | Typo, 1px alignment issue, hover state |

## Health score

Compute a weighted score:

| Category | Weight |
|----------|--------|
| Console errors | 15% |
| Broken links | 10% |
| Visual | 10% |
| Functional | 20% |
| UX | 15% |
| Performance | 10% |
| Content | 5% |
| Accessibility | 15% |

Each category starts at 100. Deduct per finding: critical (-25), high (-15), medium (-8), low (-3).

## Diff-aware mode

If the user is on a feature branch with no explicit URL, automatically:
1. Analyze the branch diff: `git diff main...HEAD --name-only`
2. Identify affected pages/routes from the changed files
3. Detect the running app on common local ports
4. Test only the affected pages
5. Report findings scoped to the branch changes

## Framework-specific guidance

- **Next.js**: Check for hydration errors, test client-side navigation, monitor `_next/data` requests
- **Rails**: Check CSRF tokens, test Turbo/Stimulus integration, verify flash messages
- **SPA (React/Vue/Angular)**: Use `snapshot -i` for navigation, check stale state, test browser back/forward
