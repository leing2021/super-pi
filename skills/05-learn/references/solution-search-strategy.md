# Solution Search Strategy

Grep-first, tiered retrieval for `docs/solutions/`. Use this in `02-plan` and `04-review` to find relevant learnings without loading all files.

## Search order

1. **Project-level**: `{project-root}/docs/solutions/` — project-specific solutions
2. **Global-level**: `~/.pi/agent/docs/solutions/` — cross-project solutions

## Steps

### Step 1: Extract keywords

From the task/feature description, identify:
- **Technical terms**: tool names, framework names, language concepts
- **Problem indicators**: error symptoms, failure modes, performance issues
- **Component types**: CLI, extension, skill, test, config

### Step 2: Grep frontmatter fields

Run parallel grep searches across both solution directories. Only return file paths, do not load content:

```bash
# Search tags (most precise)
grep -rl "tags:.*keyword1" docs/solutions/ ~/.pi/agent/docs/solutions/
# Search title
grep -rl "title:.*keyword" docs/solutions/ ~/.pi/agent/docs/solutions/
# Search applies_when
grep -rl "applies_when:" docs/solutions/ ~/.pi/agent/docs/solutions/ | head -5
```

### Step 3: Narrow if needed

- **>10 candidates**: Re-run with more specific keyword combinations
- **<3 candidates**: Broaden search to grep full file content, not just frontmatter

### Step 4: Read frontmatter only

For each candidate file, read only the first 15 lines (frontmatter):

```bash
head -15 <file>
```

### Step 5: Score and rank

Match quality:
- **Strong**: `tags` contain direct keyword matches
- **Moderate**: `title` or `applies_when` are semantically related
- **Weak**: No overlap — skip

Sort by `severity` (critical > high > medium > low) when multiple strong matches exist.

### Step 6: Full read top-N

Only fully read the **top 3** ranked files. Summarize relevance in 1-2 sentences per file.

## When to stop

If no candidates found after Step 2, do **not** fall back to reading all files. Report "No relevant solutions found" and proceed. An empty result is valuable information — it means the area has no prior learnings.
