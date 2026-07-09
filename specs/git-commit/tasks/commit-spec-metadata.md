---
name: Commit spec metadata alongside implementation and at spec completion
goal: >
  Extend the commit mechanism added by add-commit-substep so that spec
  metadata (status/README.md, backlog.md, a task's own frontmatter) is
  committed too — as its own commit, separate from the implementation
  commit — at two points: per-task right after it reaches verification, and
  a wrap-up commit when the whole spec reaches done.
ground: [add-commit-substep]
status: release
scope:
  - skills/implement.md
  - skills/release.md
  - .claude/skills/spiralspec-implement/SKILL.md
  - .claude/skills/spiralspec-release/SKILL.md
  - .claude/commands/spiral/implement.md
  - .claude/commands/spiral/release.md
  - .spiralspec/manifest.json
blocked: null
complexity: low
---

# Context

`skills/implement.md` and `skills/release.md` are source-of-truth skill files
rendered by `spiralspec init` into `.claude/skills/spiralspec-<id>/SKILL.md`
and `.claude/commands/spiral/<id>.md` (see `src/adapters/installer.ts` +
`src/adapters/agents/claude.ts`). The installer skips hand-edited generated
files unless run with `--force` — the ones in this repo are currently
untouched, so a plain `spiralspec init` will pick them up.

`skills/implement.md` currently has (step 6 dispatches a commit sub-agent
that ONLY handles the task's own implementation `scope` globs — it never
touches spec metadata):

    5. After each sub-agent finishes: confirm the task file reached
       `status: verification`; then update `status/README.md` (`# Current state`,
       `# Next steps`, a `# Completed tasks` entry: how it was done, how to verify
       it, caveats) and append any deploy/build/manual steps to
       `status/release.md`. YOU write the reports, never the sub-agent — and write
       for a reader who has not seen this conversation.
    6. Dispatch a commit sub-agent using the "Commit sub-agent prompt template"
       below, selecting the `low` model tier from the `models:` mapping (not the
       task's own `complexity` tier). Wait for it to finish before continuing.
    7. Re-run `spiralspec next`. At autonomy **high**: continue until `runnable`
       is empty. At **low/medium**: report and ask before the next batch.
    8. When everything is excluded, report why per task and what the user must do.

And the current `## Commit sub-agent prompt template` section (this is the
template you'll extend — it presently only stages/commits the task's own
`scope` globs):

    Dispatch with exactly this structure (fill the placeholders):

        You are committing files for a completed spec task. Your entire context is
        the task file below; do not read other spec artifacts.
        Project root: <absolute path>. Task file: <absolute path to tasks/<slug>.md>.

        Contract — follow in order:
        1. Read the task file to extract the `scope:` globs from the frontmatter.
        2. Stage exactly the files matching those globs that have been
           created/modified in this working tree. Never use `git add -A`, `git add
           .`, or anything that stages files outside the task's scope.
        3. If nothing is staged after step 2, report "nothing to commit" and stop.
        4. Search for a commit-message convention (e.g. CONTRIBUTING.md,
           commit-convention documentation, or infer patterns from recent
           `git log --oneline` output). If none is found, use a plain descriptive
           message that matches the task's goal.
        5. Use `git diff --cached` to review staged changes. If they contain
           multiple logically distinct changes, create multiple atomic commits
           instead of one. Each commit should be small and focused.
        6. Commit the staged changes (or each atomic batch) with `git commit`.
           Never force-push, amend, rebase, or rewrite history.
        7. Return a short summary: which commit(s) were created (hash + one-line
           message each), or "nothing to commit".

        Gap rule: if you cannot determine the task scope or commit convention,
        report what information is missing and stop.

`skills/release.md` currently has:

    3. When every task is `done`, announce the spec complete. The folder remains
       in place as documentation.

# Tasks

- [ ] In `skills/implement.md` step 6, after "Wait for it to finish before
      continuing", add that the same dispatch also covers the spec's own
      metadata: the task's spec-folder `status/README.md`, `backlog.md`, and
      the task's own file (`specs/<spec>/tasks/<slug>.md`) — as a **separate
      commit** from the implementation commit (status bookkeeping is a
      logically distinct change).
- [ ] Extend the `## Commit sub-agent prompt template` in `skills/implement.md`
      with an additional contract step (after the existing step 6 "Commit the
      staged changes...", before the "Return a short summary" step) that: for
      each of `status/README.md`, `backlog.md`, and this task's own file in
      the same spec folder (derive the spec folder from the task file's own
      path — one directory up from `tasks/`), if it has uncommitted changes,
      stage and commit it as its own separate commit (skip files with no
      changes). Update the final "Return a short summary" step so it reports
      both the implementation commit(s) and the metadata commit, or "nothing
      to commit" for either independently.
- [ ] In `skills/release.md` step 3, before "announce the spec complete", add:
      dispatch a commit sub-agent (reuse the `## Commit sub-agent prompt
      template` from `skills/implement.md`, but scoped explicitly to
      `specs/<spec>/**` instead of a task's `scope` globs) to commit any
      remaining spec-folder changes as a wrap-up commit; if there's nothing
      to commit, skip straight to announcing completion.
- [ ] Run `spiralspec init` from the repo root so
      `.claude/skills/spiralspec-implement/SKILL.md`,
      `.claude/skills/spiralspec-release/SKILL.md`, and their matching
      `.claude/commands/spiral/*.md` files pick up the changes.

# Iterations

**2026-07-09** — Implemented all three task checklist items:
1. Updated `skills/implement.md` step 6 to document that the commit dispatch covers both implementation and spec metadata files
2. Extended the `## Commit sub-agent prompt template` in `skills/implement.md` with new step 7 to handle metadata commits (`status/README.md`, `backlog.md`, task file itself) as separate commits from implementation commits
3. Updated `skills/release.md` step 3 to include a wrap-up commit dispatch for any remaining spec-folder changes before announcing completion
4. Ran `spiralspec init` to regenerate all generated skill and command files from updated sources
5. Verified with full test suite: all 104 tests pass

Assumptions: The metadata commit step should commit all three files together in one metadata commit (as a logically distinct change from implementation), rather than individually. Task file derivation uses the pattern: given `specs/<spec>/tasks/<slug>.md`, the spec folder is `specs/<spec>/`.

# Testing

Ran `npm test` which executes the full test suite via Vitest.

**Command run:**
```
npm test
```

**Output:**
All 104 tests across 15 test files passed (610ms duration).

**How to verify:**
1. Run `npm test` — all tests should pass
2. Inspect the generated skill files in `.claude/skills/spiralspec-implement/SKILL.md` and `.claude/skills/spiralspec-release/SKILL.md` to confirm they contain the new metadata commit logic
3. Review `.claude/commands/spiral/implement.md` and `.claude/commands/spiral/release.md` which are command-line variants of the skills
4. Manually run `spiralspec init --force` to verify it regenerates without errors

The changes preserve backward compatibility: the commit sub-agent now handles both implementation and metadata files, with metadata as logically separate commits.
