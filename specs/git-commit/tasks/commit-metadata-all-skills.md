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
status: release
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
  - skills/release.md
  - .claude/skills/spiralspec-release/SKILL.md
  - .claude/commands/spiral/release.md
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

- [x] In `skills/implement.md`, generalize the "## Commit sub-agent prompt
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
- [x] Update `skills/release.md` step 3's existing reuse of the template so it
      explicitly names mode (b) with its scope (`specs/<spec>/**`) — wording
      only, its behavior does not change.
- [x] In `skills/verify.md`, add a new step 6 after existing step 5: dispatch
      a commit sub-agent (reuse the "## Commit sub-agent prompt template" from
      `skills/implement.md`, mode (b) explicit scope, at the `low` tier of the
      `models:` mapping) covering, for whichever verdict path was taken: the
      verified task's own file (`specs/<spec>/tasks/<slug>.md`),
      `status/README.md`, and `status/release.md`. Wait for it to finish
      before returning control.
- [x] In `skills/refine.md`, add a new step 8 after existing step 7 (or fold
      into step 6/7 — keep whichever reads more naturally, but it must run
      after `status/README.md` is updated): dispatch a commit sub-agent
      (same template, mode (b), `low` tier) covering `backlog.md`,
      `status/README.md`, and any not-started (`backlog`/`todo`) task files
      edited this session. Exclude `acceptance-criteria.md`, `context.md`,
      and `solution.md` from this dispatch — those are human-owned and edited
      iteratively across refine rounds, not mechanical bookkeeping (same
      exclusion the per-task metadata commit already applies).
- [x] In `skills/plan.md`, add a new step between existing steps 7 and 8 (so
      the new numbering is 7 update status/README.md, 8 commit, 9 present the
      plan): dispatch a commit sub-agent (same template, mode (b), `low`
      tier) covering `backlog.md`, `status/README.md`, and any
      `tasks/<slug>.md` files newly expanded this session.
- [x] Each new commit-dispatch step must, like the existing ones in
      `implement.md`/`release.md`, wait for the sub-agent to finish before
      continuing, and treat "nothing to commit" as a normal (non-blocking)
      outcome.
- [x] Run `spiralspec init` from the repo root so
      `.claude/skills/spiralspec-implement/SKILL.md`,
      `.claude/skills/spiralspec-verify/SKILL.md`,
      `.claude/skills/spiralspec-refine/SKILL.md`,
      `.claude/skills/spiralspec-plan/SKILL.md`, and their matching
      `.claude/commands/spiral/*.md` files pick up the changes.

# Iterations

- 2026-07-09: Implemented all checklist items except the `skills/release.md`
  wording update. Generalized the "## Commit sub-agent prompt template" in
  `skills/implement.md` to document mode (a) task-derived (existing
  behavior) and mode (b) explicit (a literal file/glob list, no task file),
  with mode (b) explicitly noted as skipping step 7. Left step 7's text
  itself untouched per the task's own instruction. Added the metadata-commit
  dispatch step to `skills/verify.md` (new step 6), `skills/refine.md` (new
  step 8), and `skills/plan.md` (new step 8, renumbering the old step 8 to
  9), each reusing the template in mode (b) at the `low` model tier and
  treating "nothing to commit" as non-blocking. Ran `spiralspec init`, which
  regenerated `.claude/skills/spiralspec-{implement,verify,refine,plan}/SKILL.md`
  and updated `.spiralspec/manifest.json`; the matching
  `.claude/commands/spiral/*.md` stubs were unaffected since they only
  reference the skill by name and never inline its body. Confirmed
  `.claude/skills/spiralspec-release/SKILL.md` and
  `.claude/commands/spiral/release.md` were NOT regenerated with different
  content (`git diff` empty for both) — expected, since `skills/release.md`
  itself was not edited.

  **Blocked item**: Tasks checklist item 2 requires editing
  `skills/release.md`, but this task's frontmatter `scope:` list does not
  include `skills/release.md`, `.claude/skills/spiralspec-release/SKILL.md`,
  or `.claude/commands/spiral/release.md`. Per contract step 2 ("You may
  ONLY create or modify files matching the scope globs in the frontmatter")
  and the medium-autonomy gap rule ("stop and return the question"), I did
  not make this edit — I made it once, then reverted it (`git checkout --
  skills/release.md`) on noticing the scope mismatch. This is very likely a
  frontmatter omission by the planning step rather than an intentional
  exclusion, since `solution.md`'s "commit-metadata-all-skills" decision
  entry (referenced in this task's own `# Context`) and `status/README.md`
  both describe `release.md`'s reuse of the template as part of this task's
  work. Proposed resolutions (pick one):
  1. Add `skills/release.md`, `.claude/skills/spiralspec-release/SKILL.md`,
     and `.claude/commands/spiral/release.md` to this task's `scope:` list
     and re-dispatch to apply the one-line wording change (mechanical, no
     behavior change — see the exact edit already drafted and reverted
     above: replace "but scoped explicitly to `specs/<spec>/**` instead of
     task scope globs" with "mode (b) explicit scope, at the `low` tier of
     the `models:` mapping) with the scope `specs/<spec>/**`").
  2. Drop checklist item 2 from this task and file it as a separate
     follow-up task/backlog entry scoped to `skills/release.md`.
  Not treating this as architectural or high-risk (per the low/medium gap
  rule, I did not decide it myself) — it is a one-line wording change with
  no functional effect, but it is still outside my granted scope.

- 2026-07-09 (follow-up): Coordinator expanded this task's frontmatter
  `scope:` to add `skills/release.md`, `.claude/skills/spiralspec-release/SKILL.md`,
  and `.claude/commands/spiral/release.md`, and cleared `blocked:` back to
  `null` (resolution 1 from the proposals above). Applied the drafted edit
  to `skills/release.md` step 3: replaced "but scoped explicitly to
  `specs/<spec>/**` instead of task scope globs" with "mode (b) explicit
  scope, at the `low` tier of the `models:` mapping" and moved the
  `specs/<spec>/**` scope phrase to read naturally with the new wording —
  wording only, no behavior change. Re-ran `spiralspec init`;
  `.claude/skills/spiralspec-release/SKILL.md` and `.spiralspec/manifest.json`
  picked up the change (confirmed via `git diff --stat` and a grep for
  "mode (b)" in the generated file); `.claude/commands/spiral/release.md`
  was unaffected, consistent with the earlier finding that command stubs
  never inline skill body content. Re-ran `npm test` (104/104 passing) and
  `spiralspec validate git-commit` (`OK`) — no regressions. All checklist
  items are now complete.

# Testing

Commands run and actual output:

First pass — commands run and actual output:

    $ spiralspec init
    installed .claude/skills/spiralspec-define/SKILL.md
    installed .claude/commands/spiral/define.md
    installed .claude/skills/spiralspec-implement/SKILL.md
    installed .claude/commands/spiral/implement.md
    installed .claude/skills/spiralspec-plan/SKILL.md
    installed .claude/commands/spiral/plan.md
    installed .claude/skills/spiralspec-refine/SKILL.md
    installed .claude/commands/spiral/refine.md
    installed .claude/skills/spiralspec-release/SKILL.md
    installed .claude/commands/spiral/release.md
    installed .claude/skills/spiralspec-verify/SKILL.md
    installed .claude/commands/spiral/verify.md

    $ spiralspec validate git-commit
    OK

    $ npm test
    Test Files  15 passed (15)
         Tests  104 passed (104)

Manual verification performed (first pass):

- `git diff --stat .claude/skills/spiralspec-release/SKILL.md
  .claude/commands/spiral/release.md` was empty after `spiralspec init` —
  confirmed the then-untouched `skills/release.md` source produced no change
  in its generated counterparts (before the follow-up below).
- `grep -n "mode (b)\|mode (a)" .claude/skills/spiralspec-implement/SKILL.md`
  shows the generated skill picked up the new mode documentation.
- Read the full diff of `skills/implement.md`, `skills/verify.md`,
  `skills/refine.md`, `skills/plan.md` to confirm each new/edited step reuses
  the "## Commit sub-agent prompt template" by name, names mode (b) and the
  `low` tier explicitly, and treats "nothing to commit" as non-blocking.

Follow-up pass (after scope expansion) — commands run and actual output:

    $ spiralspec init
    installed .claude/skills/spiralspec-define/SKILL.md
    installed .claude/commands/spiral/define.md
    installed .claude/skills/spiralspec-implement/SKILL.md
    installed .claude/commands/spiral/implement.md
    installed .claude/skills/spiralspec-plan/SKILL.md
    installed .claude/commands/spiral/plan.md
    installed .claude/skills/spiralspec-refine/SKILL.md
    installed .claude/commands/spiral/refine.md
    installed .claude/skills/spiralspec-release/SKILL.md
    installed .claude/commands/spiral/release.md
    installed .claude/skills/spiralspec-verify/SKILL.md
    installed .claude/commands/spiral/verify.md

    $ git diff --stat .claude/skills/spiralspec-release/SKILL.md \
        .claude/commands/spiral/release.md .spiralspec/manifest.json
     .claude/skills/spiralspec-release/SKILL.md | 11 ++++++-----
     .spiralspec/manifest.json                  | 10 +++++-----
     2 files changed, 11 insertions(+), 10 deletions(-)

    $ grep -n "mode (b)" .claude/skills/spiralspec-release/SKILL.md
    21:   `## Commit sub-agent prompt template` from `skills/implement.md`, mode (b)

    $ npm test
    Test Files  15 passed (15)
         Tests  104 passed (104)

    $ spiralspec validate git-commit
    OK

How a human can verify:

1. Read `skills/implement.md`'s "## Commit sub-agent prompt template" section
   and confirm it now documents both mode (a) (task-derived, used by
   `implement.md` step 6) and mode (b) (explicit file/glob list, used by
   `verify.md`, `refine.md`, `plan.md`, and `release.md`), and that step 7 of
   the contract text itself is unchanged from before this task.
2. Read `skills/verify.md` step 6, `skills/refine.md` step 8, and
   `skills/plan.md` step 8 (with step 9 now the former step 8) — each should
   dispatch a commit sub-agent reusing the template in mode (b) at the `low`
   tier, and each should be a genuine blocking step in that skill's numbered
   flow.
3. Read `skills/release.md` step 3 and confirm it now names mode (b)
   explicitly instead of the old "scoped explicitly ... instead of task
   scope globs" phrasing, with the same `specs/<spec>/**` scope and no
   behavior change.
4. Confirm `.claude/skills/spiralspec-release/SKILL.md` contains the updated
   wording (`grep -n "mode (b)"`) and that `.spiralspec/manifest.json`'s hash
   for that file was updated by the second `spiralspec init` run.
5. Run `spiralspec validate git-commit` (expect `OK`) and `npm test` (expect
   all 104 tests passing) to confirm nothing regressed.
