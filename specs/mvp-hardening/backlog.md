# Backlog

<!-- Planning ledger, drafted by /spiral:plan and verified by you.
     One line per proposed task:  - [ ] task-slug — one-line goal
     [x] means the entry is expanded into tasks/<slug>.md.
     Living document: refined, extended, and pruned as the spec advances. -->

- [x] skill-pending-iterations — mark refine-authored iteration entries as pending and teach implement's dead-sub-agent heuristic to re-dispatch on them (finding 1)
- [x] yaml-safe-splices — escape every YAML splice site (claude/opencode renderers, context scaffold) via js-yaml and replace createSpec's path slice with relative() (findings 3, 5)
- [x] resilient-spec-loading — survive directories named *.md in tasks/ and broken context.md frontmatter; report the spec invalid-but-inspectable (finding 4)
- [x] reinit-and-version — bare re-init preserves configured agents; add --version reading package.json (findings 6, 11)
- [x] validate-hint — next/status append a one-line warning when validate reports issues on the spec (reviewer recommendation 2)
- [x] coverage-golden-tests — golden tests for status human output, next nothing-to-run, impact git fallback, blocked+inprogress scope claim (+ doc sentence), impact dedup fixture (findings 7–9)
- [x] release-checklist — record npm metadata as a manual pre-publish step in status/release.md (finding 10)
