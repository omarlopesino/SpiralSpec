# Release steps

<!-- Deploy/build/manual actions accumulated as tasks complete. -->

- On the next SpiralSpec release, downstream projects need to re-run
  `spiralspec init` to receive the new commit-dispatch step in
  `.claude/skills/spiralspec-implement/SKILL.md`. Projects that hand-edited
  that file will have it skipped unless they re-run with `--force` (and then
  reconcile their edits).
