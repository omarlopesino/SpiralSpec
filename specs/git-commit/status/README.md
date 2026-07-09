# Current state

`add-commit-substep` verified (pass), sitting at `status: release`, awaiting
deployment confirmation via `/spiral:release git-commit` (see
`status/release.md`). `commit-spec-metadata` implemented and self-verified;
sitting at `status: verification`, awaiting human sign-off
(`/spiral:verify git-commit`). No other tasks in the backlog — both are now
expanded and either release-ready or verification-ready.

# Next steps

- Verify `commit-spec-metadata`: read `skills/implement.md` step 6 + the
  extended "## Commit sub-agent prompt template" step 7-8, and
  `skills/release.md` step 3; confirm the generated
  `.claude/skills/spiralspec-implement/SKILL.md` /
  `.claude/skills/spiralspec-release/SKILL.md` match. Run
  `/spiral:verify git-commit` to record the verdict.
- Run `/spiral:release git-commit` to close out `add-commit-substep` (confirm
  the downstream re-run-`spiralspec init` step in `status/release.md`).
- Neither commit mechanism has been exercised end-to-end against a real task
  yet — worth watching closely the first time either fires for real (this
  spec's own future task-completions and eventual `done` are the first live
  test).

# Completed tasks

- **commit-spec-metadata** (2026-07-09): Extended `skills/implement.md` step 6
  so the commit dispatch also covers spec metadata (`status/README.md`,
  `backlog.md`, the task's own file) as a commit separate from the
  implementation commit — added as step 7 in the "## Commit sub-agent prompt
  template" (staged/committed together as one metadata commit, skipping files
  with no changes). Extended `skills/release.md` step 3 to dispatch the same
  template, scoped to `specs/<spec>/**`, as a wrap-up commit when every task
  reaches `done`, before announcing the spec complete.
  How to verify: read `skills/implement.md` (step 6, template steps 7-8) and
  `skills/release.md` step 3; diff-check the two generated
  `.claude/skills/spiralspec-*/SKILL.md` files match. `npm test` — 104/104
  passing (sub-agent's self-report; re-run locally to confirm).
  Caveats: not yet exercised against a real task/commit; the metadata commit
  message is currently hardcoded to "docs: update spec metadata" rather than
  going through the same convention-detection step used for implementation
  commits — worth a look during verification.

- **add-commit-substep** (2026-07-09): Added step 6 to `skills/implement.md`
  — after a task reaches `status: verification`, dispatch a commit sub-agent
  (model: `low` tier of the `models:` mapping, i.e. `haiku`) using the new
  "## Commit sub-agent prompt template" section. That sub-agent stages only
  the completed task's own `scope` globs (never `git add -A`), splits
  unrelated changes into separate atomic commits, follows a detected project
  commit convention or falls back to a plain message, and never
  force-pushes/amends. A blocked/failed commit sub-agent is now recorded in
  `status/README.md` `# Blocked` per the new `## Rules` entry, same as a
  blocked implementation task.
  How to verify: read `skills/implement.md` (steps 6, the new template
  section, and the `## Rules` addition); diff-check
  `.claude/skills/spiralspec-implement/SKILL.md` matches. `npm test` — 104/104
  passing (sub-agent's self-report; re-run locally to confirm).
  Caveats: not yet exercised against a real task/commit — verify the prompt
  actually produces correct git behavior the next time it's dispatched for
  real.

# Blocked
