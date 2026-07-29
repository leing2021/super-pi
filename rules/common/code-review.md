# Code Review Standards

## Purpose

Code review ensures quality, security, and maintainability before code is merged. This rule defines when and how to conduct code reviews.

## Precision Discipline

**Favor precision over recall.** Report only defects you are confident are real in the changed code and its reachable context. A false positive costs more reviewer trust than a missed minor issue.

### Gate-keeping rules

1. **Verify before asserting** — Before flagging a non-local claim (race condition, security boundary, resource leak), use `file_read` and `code_search` to establish call sites, ownership, synchronization, and input boundaries. Do not infer concurrent invocation, attacker control, or error contracts from function names or package imports alone.

2. **Do not duplicate deterministic tools** — Do not flag issues that the language compiler, formatter, linter, or type checker already catches reliably, unless the diff shows a concrete user-visible consequence those tools will not express.

3. **Stay silent when context is unclear** — If the surrounding code, ownership, or data flow cannot be determined from available evidence, do not guess. A miss on an unclear code path is acceptable; a false alarm on it damages trust.

4. **Distinguish blocking vs non-blocking** — Treat correctness and security findings as blocking (CRITICAL/HIGH). Style-only, idiom, or naming suggestions are non-blocking (LOW). Explicitly label each finding's severity.

5. **No cargo-cult patterns** — Do not report a pattern just because it is "best practice." Evaluate whether the pattern applies to THIS codebase, THIS data flow, and THIS risk profile. If the code deviates from convention for a deliberate reason visible in context, accept it.

## When to Review

**MANDATORY review triggers:**

- After writing or modifying code
- Before any commit to shared branches
- When security-sensitive code is changed (auth, payments, user data)
- When architectural changes are made
- Before merging pull requests

**Pre-Review Requirements:**

Before requesting review, ensure:

- All automated checks (CI/CD) are passing
- Merge conflicts are resolved
- Branch is up to date with target branch

## Review Checklist

Before marking code complete:

- [ ] Code is readable and well-named
- [ ] Functions are focused (<50 lines)
- [ ] Files are cohesive (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Errors are handled explicitly
- [ ] No hardcoded secrets or credentials
- [ ] No console.log or debug statements
- [ ] Tests exist for new functionality
- [ ] Test coverage meets 80% minimum

## Security Review Triggers

**STOP and use security-reviewer agent when:**

- Authentication or authorization code
- User input handling
- Database queries
- File system operations
- External API calls
- Cryptographic operations
- Payment or financial code

## Review Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| CRITICAL | Security vulnerability or data loss risk | **BLOCK** - Must fix before merge |
| HIGH | Bug or significant quality issue | **WARN** - Should fix before merge |
| MEDIUM | Maintainability concern | **INFO** - Consider fixing |
| LOW | Style or minor suggestion | **NOTE** - Optional |

## Agent Usage

Use these agents for code review:

| Agent | Purpose |
|-------|---------|
| **code-reviewer** | General code quality, patterns, best practices |
| **security-reviewer** | Security vulnerabilities, OWASP Top 10 |
| **typescript-reviewer** | TypeScript/JavaScript specific issues |
| **python-reviewer** | Python specific issues |
| **go-reviewer** | Go specific issues |
| **rust-reviewer** | Rust specific issues |

## Review Workflow

```
1. Run git diff to understand changes
2. Check security checklist first
3. Review code quality checklist
4. Run relevant tests
5. Verify coverage >= 80%
6. Use appropriate agent for detailed review
```

## Common Issues to Catch

### Security

- **Precision gate:** Before reporting any security issue, confirm the data source and attack surface with `code_search`. A pattern that looks like SQL injection but uses parameterized queries is not a finding.
- Hardcoded credentials (API keys, passwords, tokens)
- SQL injection (string concatenation in queries)
- XSS vulnerabilities (unescaped user input)
- Path traversal (unsanitized file paths)
- CSRF protection missing
- Authentication bypasses

### Code Quality

- Large functions (>50 lines) - split into smaller
- Large files (>800 lines) - extract modules
- Deep nesting (>4 levels) - use early returns
- Missing error handling - handle explicitly
- Mutation patterns - prefer immutable operations
- Missing tests - add test coverage

### Performance

- N+1 queries - use JOINs or batching
- Missing pagination - add LIMIT to queries
- Unbounded queries - add constraints
- Missing caching - cache expensive operations

## Approval Criteria

- **Approve**: No CRITICAL or HIGH issues
- **Warning**: Only HIGH issues (merge with caution)
- **Block**: CRITICAL issues found

## Integration with Other Rules

This rule works with:

- [testing.md](testing.md) - Test coverage requirements
- [security.md](security.md) - Security checklist
- [git-workflow.md](git-workflow.md) - Commit standards
- [agents.md](agents.md) - Agent delegation
