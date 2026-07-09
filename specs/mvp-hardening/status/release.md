# Release steps

<!-- Deploy/build/manual actions accumulated as tasks complete. -->

## Manual pre-publish steps

- **npm metadata**: Add `repository`, `keywords`, `author`, and `homepage` to `package.json` before `npm publish`. These values are deliberately left to the user to configure.
- **Skill-pack propagation** (skill-pending-iterations): projects that already installed the skill pack must re-run `spiralspec update` after upgrading to pick up the revised refine/implement prose (this repo's own `.claude/`/`.opencode/` copies were already regenerated).
- **Finding-1 verification statement** (skill-pending-iterations): the final report must state that the dead-sub-agent fix has no automated test — it was verified by a human reading `skills/implement.md` and `skills/refine.md` against the review's finding-1 scenario (verified by the user on 2026-07-09).
