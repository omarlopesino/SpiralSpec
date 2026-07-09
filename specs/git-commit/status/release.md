# Release steps

<!-- Deploy/build/manual actions accumulated as tasks complete. -->

- On the next SpiralSpec release, downstream projects need to re-run
  `spiralspec init` to receive the new commit-dispatch step in
  `.claude/skills/spiralspec-implement/SKILL.md`, the extended metadata-commit
  step (step 7) in its "## Commit sub-agent prompt template", and the new
  wrap-up metadata commit in `.claude/skills/spiralspec-release/SKILL.md` step
  3. Projects that hand-edited either generated file will have it skipped
  unless they re-run with `--force` (and then reconcile their edits).
- Same re-run applies for `commit-metadata-all-skills`: the template now
  documents an explicit-scope mode (b) alongside the existing task-derived
  mode (a), and `.claude/skills/spiralspec-verify/SKILL.md`,
  `.claude/skills/spiralspec-refine/SKILL.md`, and
  `.claude/skills/spiralspec-plan/SKILL.md` each gained a new metadata-commit
  dispatch step reusing that template in mode (b). Same hand-edit caveat
  applies to any of these four generated files.

# Deployment (2026-07-10)

All three tasks (`add-commit-substep`, `commit-spec-metadata`,
`commit-metadata-all-skills`) confirmed done. No external publish (e.g. npm)
was required — this repo dogfoods its own skill pack directly, and
`spiralspec init` was already re-run in-repo after each task, regenerating
all five affected `.claude/skills/spiralspec-*/SKILL.md` files
(implement, verify, refine, plan, release) and their `.claude/commands/spiral/*.md`
counterparts. Downstream projects consuming spiralspec still need to re-run
`spiralspec init` (or `--force` if they've hand-edited the generated files)
to pick up these changes on their next update.
