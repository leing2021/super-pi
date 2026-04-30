# Solution Search Strategy

Grep-first strategy for finding relevant solutions before planning or reviewing.

## Steps

1. **Extract keywords** from the task description
2. **Grep frontmatter** fields (tags, title) in both locations:
   ```bash
   grep -rl "tags:.*keyword" docs/solutions/ ~/.pi/agent/docs/solutions/
   ```
3. **Read frontmatter only** (first 15 lines) of matching files
4. **Score by:**
   - Severity match (higher severity = higher priority)
   - Tag relevance (exact matches rank higher)
5. **Fully read top 3** candidates
6. If no matches: report "No relevant solutions found" and proceed

## Search locations

| Level | Path | Use for |
|---|---|---|
| Project | `docs/solutions/` | Project-specific learnings |
| Global | `~/.pi/agent/docs/solutions/` | Cross-project patterns |

## Scoring rubric

| Score | Criteria |
|---|---|
| 5 | Exact tag match + high severity + same language |
| 4 | Tag match + same category |
| 3 | Partial tag match |
| 2 | Same category, no tag match |
| 1 | Worth reading for context |
| 0 | No relevance |

## Output

- List of relevant solutions with paths and relevance scores
- Key takeaways from top solutions
- How they apply to current task

## When to use

- `02-plan`: Before creating implementation units, check for existing patterns
- `04-review`: Before reviewing, check for known failure modes or solutions
