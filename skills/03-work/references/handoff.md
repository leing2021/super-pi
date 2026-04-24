# Handoff from 03-work

When execution reaches a meaningful checkpoint:

1. Summarize what was completed.
2. Report the latest verification results.
3. Recommend `04-review` as the next step.
4. Mention any remaining implementation risk.
5. Include checkpoint fields: `activeFiles`, `currentUnit`, `blocker`, `verification`, `contextTiers`, `handoffPath`.
6. Provide `🧠 Context Status` (health, handoff path, active files, new-session recommendation).
7. Save/mention handoff-lite path under `.context/compound-engineering/handoffs/` using the shared `Handoff-lite template` in `skills/references/pipeline-config.md`.
8. Recommend new session only when cross-phase + health is heavy/critical, and include a copyable prompt.
