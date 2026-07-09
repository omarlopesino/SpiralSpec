# Current state

`add-commit-substep` implemented and self-verified; sitting at
`status: verification`, awaiting human sign-off (`/spiral:verify git-commit`).
No other tasks in the backlog.

# Next steps

- Verify the change: read `skills/implement.md` steps 5-8 and the new
  "## Commit sub-agent prompt template" section, and confirm the generated
  `.claude/skills/spiralspec-implement/SKILL.md` /
  `.claude/commands/spiral/implement.md` match.
- Run `/spiral:verify git-commit` to record the verdict and move the task to
  `done` (or send it back with feedback).
- The actual end-to-end behavior (a real commit sub-agent dispatch scoped to
  a task's globs) is only exercised the next time `/spiral:implement` runs a
  real task in this or another spec — worth watching the first time it fires.

# Completed tasks

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
