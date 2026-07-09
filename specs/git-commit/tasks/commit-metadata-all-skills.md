---
name: Generalize the commit template and wire metadata commits into verify/refine/plan
goal: >
  Generalize the "## Commit sub-agent prompt template" in `skills/implement.md`
  so it accepts an explicit file/glob scope (not only a task-derived one), then
  add a metadata-commit dispatch step, reusing that template, to the end of
  `skills/verify.md`, `skills/refine.md`, and `skills/plan.md` — so
  `status/README.md`/`backlog.md`/task-frontmatter edits made by those flows
  are committed, closing the gap where only `implement.md` and `release.md`
  had a commit trigger.
ground: [commit-spec-metadata]
status: backlog
scope:
  - skills/implement.md
  - skills/verify.md
  - skills/refine.md
  - skills/plan.md
  - .claude/skills/spiralspec-implement/SKILL.md
  - .claude/skills/spiralspec-verify/SKILL.md
  - .claude/skills/spiralspec-refine/SKILL.md
  - .claude/skills/spiralspec-plan/SKILL.md
  - .claude/commands/spiral/implement.md
  - .claude/commands/spiral/verify.md
  - .claude/commands/spiral/refine.md
  - .claude/commands/spiral/plan.md
  - .spiralspec/manifest.json
blocked: null
complexity: medium
---

# Context

Source-of-truth skill files live in `skills/*.md`, rendered by `spiralspec
init` into `.claude/skills/spiralspec-<id>/SKILL.md` and
`.claude/commands/spiral/<id>.md` (see `src/adapters/installer.ts` +
`src/adapters/agents/claude.ts`). The installer skips hand-edited generated
files unless run with `--force` — the ones in this repo are currently
untouched, so a plain `spiralspec init` will pick them up.

The "## Commit sub-agent prompt template" lives in `skills/implement.md` and
is already reused verbatim by `skills/release.md` step 3 (see that file). Its
current contract step 1 reads:

    1. Read the task file to extract the `scope:` globs from the frontmatter.

This assumes a single task file to derive scope from, which is what
`implement.md`'s own dispatch (step 6) provides. `release.md` step 3 already
claims to reuse the template "scoped explicitly to `specs/<spec>/**` instead
of task scope globs," but the template's written text has no such
explicit-scope path today — this is a latent gap (see `solution.md`,
"Decisions (from planning, 2026-07-09, commit-metadata-all-skills)").

**Current `skills/implement.md`** step 6 and the full template (do not change
step 6's implement-specific wording, only the template body per Tasks below):

    6. Dispatch a commit sub-agent using the "Commit sub-agent prompt template"
       below, selecting the `low` model tier from the `models:` mapping (not the
       task's own `complexity` tier). The dispatch covers both the task's
       implementation files and the spec's own metadata (`status/README.md`,
       `backlog.md`, and this task's file) — which will be committed as separate
       commits (status bookkeeping is a logically distinct change). Wait for it to
       finish before continuing.

    ## Commit sub-agent prompt template

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
        7. After committing implementation files, commit spec metadata as separate
           commit(s): derive the spec folder from the task file's path (one
           directory up from `tasks/`); for each of `status/README.md`,
           `backlog.md`, and the task's own file in that spec folder, check for
           uncommitted changes. If any of these files have changes, stage and
           commit them together as a single metadata commit. Skip files with no
           changes. Use a commit message like "docs: update spec metadata" and
           include an explanation of what changed.
        8. Return a short summary: which commit(s) were created for implementation
           (hash + one-line message each), which commit(s) for metadata (if any),
           or "nothing to commit" for either independently.

        Gap rule: if you cannot determine the task scope or commit convention,
        report what information is missing and stop.

**Current `skills/verify.md`** (5 numbered steps, ends with):

    5. Update `status/README.md`; suggest `/spiral:implement <spec>` for rework.

**Current `skills/refine.md`** (7 numbered steps, ends with):

    6. Update `status/README.md` (`# Current state`, `# Next steps`) so a reader
       who was not in this conversation understands what changed and why.
    7. Suggest the natural next verb: /spiral:plan to expand new entries,
       /spiral:implement to build.

**Current `skills/plan.md`** (8 numbered steps, ends with):

    7. Update `status/README.md`: rewrite `# Current state` and `# Next steps`
       (tell the user to review the tasks and flip approved ones
       `backlog → todo`; list unexpanded ledger entries as pending analysis).
    8. Present the plan: each task's goal, ground order, and scope. Ask for
       feedback — deeper reshaping (criteria, context, deleting tasks) belongs to
       /spiral:refine.

# Tasks

- [ ] In `skills/implement.md`, generalize the "## Commit sub-agent prompt
      template" so contract step 1 supports two modes, chosen by the
      dispatching skill: (a) task-derived — "Read the task file to extract
      the `scope:` globs from the frontmatter" (current behavior, used by
      `implement.md`'s own step 6 dispatch), or (b) explicit — the dispatching
      skill supplies a literal list of files/globs to stage directly, no task
      file involved. Update the template's opening description (currently
      "Your entire context is the task file below... Task file: <path>") so
      it documents both modes and their placeholders. Leave step 7 (the
      implementation-vs-metadata split) as-is — it only applies to
      task-derived (mode a) dispatches; explicit-scope (mode b) dispatches
      skip step 7 entirely since their whole scope already is the thing being
      committed (still subject to step 5's atomic-split rule if the scope
      spans more than one logical change).
- [ ] Update `skills/release.md` step 3's existing reuse of the template so it
      explicitly names mode (b) with its scope (`specs/<spec>/**`) — wording
      only, its behavior does not change.
- [ ] In `skills/verify.md`, add a new step 6 after existing step 5: dispatch
      a commit sub-agent (reuse the "## Commit sub-agent prompt template" from
      `skills/implement.md`, mode (b) explicit scope, at the `low` tier of the
      `models:` mapping) covering, for whichever verdict path was taken: the
      verified task's own file (`specs/<spec>/tasks/<slug>.md`),
      `status/README.md`, and `status/release.md`. Wait for it to finish
      before returning control.
- [ ] In `skills/refine.md`, add a new step 8 after existing step 7 (or fold
      into step 6/7 — keep whichever reads more naturally, but it must run
      after `status/README.md` is updated): dispatch a commit sub-agent
      (same template, mode (b), `low` tier) covering `backlog.md`,
      `status/README.md`, and any not-started (`backlog`/`todo`) task files
      edited this session. Exclude `acceptance-criteria.md`, `context.md`,
      and `solution.md` from this dispatch — those are human-owned and edited
      iteratively across refine rounds, not mechanical bookkeeping (same
      exclusion the per-task metadata commit already applies).
- [ ] In `skills/plan.md`, add a new step between existing steps 7 and 8 (so
      the new numbering is 7 update status/README.md, 8 commit, 9 present the
      plan): dispatch a commit sub-agent (same template, mode (b), `low`
      tier) covering `backlog.md`, `status/README.md`, and any
      `tasks/<slug>.md` files newly expanded this session.
- [ ] Each new commit-dispatch step must, like the existing ones in
      `implement.md`/`release.md`, wait for the sub-agent to finish before
      continuing, and treat "nothing to commit" as a normal (non-blocking)
      outcome.
- [ ] Run `spiralspec init` from the repo root so
      `.claude/skills/spiralspec-implement/SKILL.md`,
      `.claude/skills/spiralspec-verify/SKILL.md`,
      `.claude/skills/spiralspec-refine/SKILL.md`,
      `.claude/skills/spiralspec-plan/SKILL.md`, and their matching
      `.claude/commands/spiral/*.md` files pick up the changes.

# Iterations

# Testing
