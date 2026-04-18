# Premise Challenge

Before proposing solutions, challenge the premises. Run this after the diagnostic questions (Startup or Builder) and before Alternatives Generation.

## Steps

1. **Is this the right problem?** Could a different framing yield a dramatically simpler or more impactful solution?
2. **What happens if we do nothing?** Real pain point or hypothetical one?
3. **What existing code already partially solves this?** Map existing patterns, utilities, and flows that could be reused.
4. **If the deliverable is a new artifact** (CLI binary, library, package, container image, mobile app): **how will users get it?** Code without distribution is code nobody can use.

## Output format

Present premises as clear statements the user must agree with before proceeding:

```
PREMISES:
1. [statement] — agree/disagree?
2. [statement] — agree/disagree?
3. [statement] — agree/disagree?
```

Use `ask_user_question` to confirm each premise. If the user disagrees, revise understanding and loop back.
