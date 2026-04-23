---
name: 09-help
description: Explain when to use each Compound Engineering Phase 1 skill and how they connect.
---

# Help

Use this skill when the user asks how to use the package, which workflow step comes next, or which Compound Engineering skill fits the current task.

## Phase 1 skill guide

- `01-brainstorm` — use when the request is ambiguous, needs requirements discovery, or the user has a new idea. Three modes: CE requirements discovery (adding features), Startup Diagnostic (YC-style forcing questions for new products/startups), Builder Mode (side projects, hackathons, learning).
- `02-plan` — use when requirements are clear enough to turn into implementation units. After planning, user can optionally run a CEO-style strategic review or strict review (error maps, failure modes, test diagrams).
- `03-work` — use when there is a plan or a tightly scoped task ready for controlled execution.
- `04-review` — use after code changes to produce structured findings. After code review, user can optionally extend to browser-based QA testing (find visual/functional bugs with agent-browser) and regression test generation.
- `05-learn` — use after solving a problem so the repo gains a durable learning in `docs/solutions/`.
- `08-status` — use when the user wants to know which artifact already exists and what the next workflow step should be.

## Recommended flow

1. Start with `01-brainstorm` when the problem is still fuzzy or you have a new idea.
   - **Startup founders** get the YC-style diagnostic: demand reality, status quo, narrowest wedge.
   - **Side project builders** get generative brainstorming: coolest version, fastest path to ship.
   - **Feature additions** get the standard CE requirements discovery.
2. Move to `02-plan` once the desired behavior is clear.
   - Optionally run **CEO Review** to challenge premises, map alternatives, check dream-state alignment.
   - Or **Strict Review** for full error maps, failure modes, and test diagrams.
3. Use `03-work` to execute the plan.
4. Run `04-review` after implementation.
   - Optionally extend to **Browser QA** for visual and functional bug finding.
   - Or **Browser QA + Regression Tests** to also generate automated test coverage.
5. Capture key learnings with `05-learn`.
6. Use `08-status` at any point to inspect repo-local workflow state.

## Output

When responding, explain the smallest useful next step instead of forcing the full sequence.
