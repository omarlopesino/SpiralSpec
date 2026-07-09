# Current state

All three tasks are verified (pass) and sitting at `status: release`,
awaiting deployment confirmation via `/spiral:release git-commit` (see
`status/release.md`): `add-commit-substep`, `commit-spec-metadata`, and
`commit-metadata-all-skills`. The last of these generalizes the "## Commit
sub-agent prompt template" in `skills/implement.md` to support an
explicit-scope mode (b) alongside the existing task-derived mode (a), then
wires a metadata-commit dispatch step (mode (b)) into `skills/verify.md`,
`skills/refine.md`, and `skills/plan.md`, and updates `skills/release.md`'s
existing template reuse to name mode (b) explicitly (wording only).
Mid-implementation it hit a real scope gap — its checklist required editing
`skills/release.md` but the frontmatter `scope:` list omitted it and its
generated counterparts; the user chose to expand scope rather than drop the
item, and the sub-agent resumed to finish it. The newly-built `verify.md`
step 6 (metadata commit dispatch) is exercised for the first time right after
this verdict — see `# Next steps`.

# Next steps

- Run `/spiral:release git-commit` to close out all three tasks (confirm the
  downstream re-run-`spiralspec init` step in `status/release.md`, which now
  lists four generated skill files needing re-sync: implement, verify,
  refine, plan, plus release).
- `add-commit-substep`'s own per-task commit step, and `commit-metadata-all-
  skills`' new verify/refine/plan metadata-commit steps, have not yet been
  exercised on a real task in *another* spec (chicken-and-egg: these are the
  tasks that created those steps) — worth watching the first time each
  fires for real.
- Flagged during verification: the metadata commit message in the template's
  step 7 is hardcoded to "docs: update spec metadata" rather than going
  through the convention-detection step used for implementation commits —
  not blocking, worth revisiting later.

# Completed tasks

- **commit-metadata-all-skills** (2026-07-09): Generalized the "## Commit
  sub-agent prompt template" in `skills/implement.md` to document mode (a)
  task-derived (existing behavior) and mode (b) explicit (a literal
  file/glob list, no task file; skips step 7's metadata split). Added a new
  metadata-commit dispatch step reusing that template in mode (b) at the
  `low` tier to `skills/verify.md` (step 6), `skills/refine.md` (step 8), and
  `skills/plan.md` (step 8, renumbering the old step 8 to 9). Updated
  `skills/release.md` step 3's existing template reuse to name mode (b)
  explicitly (wording only, no behavior change). Ran `spiralspec init` to
  regenerate all five affected `.claude/skills/spiralspec-*/SKILL.md` files.
  How to verify: read `skills/implement.md`'s template (mode a/b docs),
  `skills/verify.md` step 6, `skills/refine.md` step 8, `skills/plan.md` step
  8, and `skills/release.md` step 3; diff-check the generated counterparts.
  `npm test` — 104/104 passing; `spiralspec validate git-commit` — OK
  (re-run and confirmed during verification).
  Caveat: mid-implementation the task's frontmatter `scope:` omitted
  `skills/release.md` and its generated counterparts even though the
  checklist required editing them — a planning oversight, resolved by
  expanding scope rather than dropping the item. Worth double-checking
  future tasks' `scope:` lists against their own `# Tasks` checklists during
  planning.

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
