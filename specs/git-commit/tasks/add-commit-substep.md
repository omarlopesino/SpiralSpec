---
name: Dispatch a commit sub-agent after each implemented task
goal: >
  After a task's own sub-agent flips its frontmatter to
  `status: verification`, the orchestrator (skills/implement.md) dispatches a
  fresh, scoped commit sub-agent that commits exactly the files the task was
  allowed to touch, then regenerates the installed skill pack so this repo's
  own `.claude/` copies pick up the change.
ground: null
status: release
scope:
  - skills/implement.md
  - .claude/skills/spiralspec-implement/SKILL.md
  - .claude/commands/spiral/implement.md
  - .spiralspec/manifest.json
blocked: null
complexity: low
---

# Context

`skills/implement.md` is the source of truth for the "implement" skill. It is
rendered by `spiralspec init` (see `src/adapters/installer.ts` +
`src/adapters/agents/claude.ts`) into
`.claude/skills/spiralspec-implement/SKILL.md` and
`.claude/commands/spiral/implement.md`. The installer skips files that were
hand-edited (sha256 mismatch vs `.spiralspec/manifest.json`) unless run with
`--force` — the current generated files in this repo are untouched, so a
plain `spiralspec init` (no `--force` needed) will pick up your edit.

Current `skills/implement.md` step 5 (do not change its existing wording,
only what's noted below):

    5. After each sub-agent finishes: confirm the task file reached
       `status: verification`; then update `status/README.md` (`# Current state`,
       `# Next steps`, a `# Completed tasks` entry: how it was done, how to verify
       it, caveats) and append any deploy/build/manual steps to
       `status/release.md`. YOU write the reports, never the sub-agent — and write
       for a reader who has not seen this conversation.

Current step 6 and 7:

    6. Re-run `spiralspec next`. At autonomy **high**: continue until `runnable`
       is empty. At **low/medium**: report and ask before the next batch.
    7. When everything is excluded, report why per task and what the user must do.

The file also has a "Model selection" section describing the `.spiralspec.yml`
`models: { low: ..., medium: ..., high: ... }` mapping (tier comes from a
task's `complexity` frontmatter), and a "Sub-agent prompt template" section
for implementation sub-agents, followed by a "## Rules" section.

# Tasks

- [ ] In `skills/implement.md`, insert a new step immediately after the
      existing step 5 (renumber the old steps 6 and 7 to 7 and 8) that
      dispatches a commit sub-agent for the just-finished task, using the
      "Commit sub-agent prompt template" (added below), at the `low` tier of
      the same `models:` mapping described in "Model selection" — not the
      task's own `complexity` tier, and not a hardcoded model name. Wait for
      it to finish before continuing to the next task.
- [ ] Add a new `## Commit sub-agent prompt template` section (place it after
      the existing `## Sub-agent prompt template` section, before `## Rules`)
      containing a self-contained prompt, following the structure of the
      existing sub-agent prompt template, that instructs the commit sub-agent
      to:
      - Only `git add` files matching the completed task's own `scope` globs
        (read from that task's frontmatter) — never `git add -A` or anything
        outside those globs.
      - If nothing matching those globs is staged/changed, report "nothing to
        commit" and stop without creating a commit.
      - Look for a project commit-message convention (e.g. a CONTRIBUTING.md
        or commit-convention doc, or infer the pattern from recent
        `git log` history); if none is found, fall back to a plain
        descriptive message.
      - Split staged changes into multiple atomic commits when they contain
        more than one logically distinct change, rather than one commit.
      - Never force-push, amend, or otherwise rewrite history — plain commits
        only.
      - Return a short summary: commit(s) created (hashes + one-line
        messages), or "nothing to commit".
- [ ] Add one line to the existing `## Rules` section: a failed/blocked
      commit sub-agent (e.g. a pre-commit hook rejects the commit) is
      recorded in `status/README.md` `# Blocked` the same way a blocked
      implementation task is — it must never abort the rest of the sprint.
- [ ] Run `spiralspec init` from the repo root so the generated
      `.claude/skills/spiralspec-implement/SKILL.md` and
      `.claude/commands/spiral/implement.md` pick up the new content (the
      command file only changes if the skill's frontmatter `description`
      changed, which it should not here).

# Iterations

2026-07-09: Added commit sub-agent dispatch step and prompt template to `skills/implement.md`. Inserted new step 6 (commit sub-agent dispatch) after existing step 5, renumbered old steps 6-7 to 7-8. Added comprehensive "## Commit sub-agent prompt template" section with 7-step contract covering scope-based file staging, commit convention detection, atomic commits, and summary reporting. Added rule to Rules section about failed/blocked commit sub-agents being recorded in status/README.md without aborting the sprint. Ran `spiralspec init` to regenerate .claude/skills/spiralspec-implement/SKILL.md and related files. All 104 tests pass.

# Testing

Commands run:
- `npm run build` — TypeScript compilation completed successfully
- `npm test` — Vitest test suite execution

Test results:
```
 Test Files  15 passed (15)
      Tests  104 passed (104)
   Start at  21:53:56
   Duration  600ms
```

Verification: All 104 tests across 15 test files passed, including installer.test.ts which validates the skill file generation and installation process. The generated .claude/skills/spiralspec-implement/SKILL.md file contains the new commit sub-agent dispatch step 6 and the Commit sub-agent prompt template section, confirming the changes were correctly installed. Manual inspection of the generated file shows all three additions (new step 6, commit template, and blocked sub-agent rule) are present and properly formatted.
