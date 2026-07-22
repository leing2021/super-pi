# Premise Challenge

Before proposing solutions, challenge the premises. Run this after the diagnostic questions (Startup or Builder) and before Alternatives Generation.

## Steps

1. **Is this the right problem?** Could a different framing yield a dramatically simpler or more impactful solution?
2. **What happens if we do nothing?** Real pain point or hypothetical one?
3. **What existing code already partially solves this?** Map existing patterns, utilities, and flows that could be reused.
4. **If the deliverable is a new artifact** (CLI binary, library, package, container image, mobile app): **how will users get it?** Code without distribution is code nobody can use.
5. **External resource signal — verify intent before scope.** When the user mentions an existing resource ("I already have X", "I wrote a skill for Y", "we use Z elsewhere"), do not assume it means "include X in this project." It may mean the opposite: the problem is already solved and should be excluded. Reverse-verify with one question: "You mentioned X — do you want it incorporated here, or is it noting that X already handles this so we don't need to?" A wrong assumption here propagates through every downstream stage (plan, work, review) and surfaces only at merge — three gates that all trust the upstream.

## Failure mode

Skipping this check when the user references an external resource leads to scope creep in the opposite direction assumed: incorporating something the user considered already-handled. The later it surfaces, the costlier the rollback.

## Output format

Present premises as clear statements the user must agree with before proceeding:

```
PREMISES:
1. [statement] — agree/disagree?
2. [statement] — agree/disagree?
3. [statement] — agree/disagree?
```

Use `ask_user_question` to confirm each premise. If the user disagrees, revise understanding and loop back.
