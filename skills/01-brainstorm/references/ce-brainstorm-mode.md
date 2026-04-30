# CE Brainstorm Mode

Standard requirements discovery flow for feature additions to existing projects.

## When to use

- Adding a feature to an existing project
- User has a project but unclear about what to build
- Request is somewhat specific but needs elaboration

## Operating principle

**Requirements clarity** — the goal is to produce implementation-ready specifications.

## Workflow

1. Scan the repository for nearby context
2. Use `brainstorm_dialog` `start` to begin multi-round refinement
3. Present initial analysis and open questions to the user
4. Use `brainstorm_dialog` `refine` to incorporate user responses and refine analysis
5. Repeat step 4 until all questions are resolved

## Key questions

Ask one at a time:
- What problem does this feature solve?
- Who is the user/consumer?
- What does success look like?
- What are the boundaries?
- What could go wrong?

## End state

Requirements document covering:
- Feature purpose and scope
- User-facing behavior
- Edge cases and failure modes
- Success criteria
- Likely file changes

## Difference from other modes

| Aspect | CE Brainstorm | Startup Diagnostic | Builder Mode |
|---|---|---|---|
| Goal | Implementation clarity | Business validation | Buildable prototype |
| Questions | Requirements-focused | Problem-first | Solution-first |
| Output | Spec document | One action | Build steps |
