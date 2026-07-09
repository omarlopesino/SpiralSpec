# Current state

`add-commit-substep` and `commit-spec-metadata` are both verified (pass),
sitting at `status: release`, awaiting deployment confirmation via
`/spiral:release git-commit` (see `status/release.md`). The third backlog
entry, `commit-metadata-all-skills`, is now implemented and self-verified
(see below); it generalizes the "## Commit sub-agent prompt template" in
`skills/implement.md` to support an explicit-scope mode (b) alongside the
existing task-derived mode (a), then wires a metadata-commit dispatch step
(mode (b)) into `skills/verify.md`, `skills/refine.md`, and `skills/plan.md`,
and updates `skills/release.md`'s existing template reuse to name mode (b)
explicitly (wording only). Mid-implementation the task hit a real scope gap
— its checklist required editing `skills/release.md` but the frontmatter
`scope:` list omitted it and its generated counterparts; the user chose to
expand scope rather than drop the item, and the sub-agent resumed to finish
it. Sitting at `status: verification`, awaiting human sign-off
(`/spiral:verify git-commit`).

# Next steps

- Verify `commit-metadata-all-skills`: read `skills/implement.md`'s template
  (mode (a)/(b) documentation), the new metadata-commit steps in
  `skills/verify.md` (step 6), `skills/refine.md` (step 8), and
  `skills/plan.md` (step 8, old step 8 renumbered to 9), and the wording-only
  change in `skills/release.md` step 3; confirm the four generated
  `.claude/skills/spiralspec-{implement,verify,refine,plan}/SKILL.md` and
  `.claude/skills/spiralspec-release/SKILL.md` match. Run
  `/spiral:verify git-commit` to record the verdict.
- Run `/spiral:release git-commit` to close out `add-commit-substep` and
  `commit-spec-metadata` (confirm the downstream re-run-`spiralspec init`
  step in `status/release.md`).
- `add-commit-substep`'s own per-task commit step has not yet been exercised
  on a real task in *another* spec (chicken-and-egg: it's the task that
  created step 6, so it couldn't use it on itself) — worth watching the first
  time that fires.
- Flagged during verification: the metadata commit message in the template's
  step 7 is hardcoded to "docs: update spec metadata" rather than going
  through the convention-detection step used for implementation commits —
  not blocking, worth revisiting later.

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
  Live-tested: dispatched the commit sub-agent on this task's own change set —
  produced `d1b1ff1` (implementation: the two skill files + generated
  counterparts + manifest) and `2ae3691` (metadata: this file, `backlog.md`,
  the task file) as two separate, correctly-scoped commits; `git status`
  confirms nothing outside scope was touched (`solution.md` and
  `add-commit-substep.md`'s later status flip were correctly left alone).
  Caveat: the metadata commit message is hardcoded to "docs: update spec
  metadata" rather than going through the same convention-detection step used
  for implementation commits — worth a look during verification.

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
