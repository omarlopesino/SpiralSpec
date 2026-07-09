# Release steps

<!-- Deploy/build/manual actions accumulated as tasks complete. -->

- On the next SpiralSpec release, downstream projects need to re-run
  `spiralspec init` to receive the new commit-dispatch step in
  `.claude/skills/spiralspec-implement/SKILL.md`, the extended metadata-commit
  step (step 7) in its "## Commit sub-agent prompt template", and the new
  wrap-up metadata commit in `.claude/skills/spiralspec-release/SKILL.md` step
  3. Projects that hand-edited either generated file will have it skipped
  unless they re-run with `--force` (and then reconcile their edits).
