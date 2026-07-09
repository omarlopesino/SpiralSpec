# Solution

After implementing a task during spiralspec:implement skill, a subagent must be invoked 
to commit the files. The files must following git conventions if they are defined for the project.
Otherwise, just commit all the files. Do several commits better than just one commit. One commit must
only be done if the changes are atomic. Several commtis must be done when there are several changes.

## Decisions (from planning)

- **Commit scope**: the commit sub-agent only `git add`s files matching the
  completed task's own `scope` globs (frontmatter in `tasks/<slug>.md`) — never
  a blanket `git add -A`. This mirrors the disjoint-scope guarantee
  `spiralspec validate` already enforces between tasks and avoids sweeping up
  unrelated uncommitted changes elsewhere in the working tree.
- **Model** (assumption, log-and-proceed): dispatch the commit sub-agent at
  the `low` complexity tier, going through the same `models:` mapping in
  `.spiralspec.yml` that `skills/implement.md`'s "Model selection" section
  already uses (falls back to the session model if unmapped) — not a
  hardcoded "haiku" literal, so it stays consistent if the mapping changes.
- **Convention detection** (assumption, log-and-proceed): "if git conventions
  are defined for the project" means checking for a CONTRIBUTING.md /
  commit-convention doc, or inferring the pattern from recent `git log`
  history; absent either, fall back to a plain descriptive message.
- **Trigger point** (assumption, log-and-proceed): dispatched once per task,
  right after that task's own sub-agent flips its frontmatter to
  `status: verification` (i.e. inside `skills/implement.md` step 5), not
  batched at the end of a parallel dispatch round.

## Decisions (from refinement, 2026-07-09)

Beyond committing a task's own implementation files (above), the spec's own
*metadata* — `status/README.md`, `backlog.md`, and a task file's frontmatter
status flip — was never committed by the automated flow. Two more trigger
points, each producing a commit **separate** from the implementation commit
(status bookkeeping is a logically distinct change from the implementation
itself, same atomic-commit reasoning as above):

- **Per-task, on reaching verification**: in `skills/implement.md`, alongside
  the existing step 6 (commit sub-agent for the task's own `scope`), also
  commit the spec's own changed metadata for that task — `status/README.md`
  and the task file itself (whichever changed) — as its own commit.
- **On spec completion**: in `skills/release.md` step 3 ("When every task is
  `done`, announce the spec complete"), commit any remaining spec-folder
  changes (final `status/README.md`, `status/release.md` deployment details)
  as a wrap-up commit.

Not hooked off `implement.md`'s "runnable is empty" check — that only means
nothing left to *dispatch*; tasks can still be sitting in `verification`/
`release` awaiting a human, so it isn't the same as the spec truly being
done.

## Decisions (from refinement, 2026-07-09, round 2)

Dogfooding surfaced a gap: `status/README.md` and task frontmatter are
rewritten by *every* skill (`implement`, `verify`, `refine`, `release`,
`plan`), but the metadata-commit step above was only wired into
`implement.md` and `release.md`. Edits made during `/spiral:verify` (e.g. a
task's `verification → release` flip) or `/spiral:refine` (backlog/status
edits) had no trigger to commit them — confirmed live: after verifying and
refining, `status/README.md` and a task's frontmatter sat modified with
nothing to commit them.

Fix: `skills/verify.md`, `skills/refine.md`, and `skills/plan.md` each get
their own metadata-commit step at the end of their flow, reusing the same
`## Commit sub-agent prompt template` from `skills/implement.md` (same as
`release.md` already does), scoped to whatever each flow actually touched:

- **verify.md**: after either verdict path (pass or feedback), commit the
  affected task file(s) + `status/README.md` + `status/release.md`.
- **refine.md**: after updating `status/README.md`, commit `backlog.md`,
  `status/README.md`, and any not-started task files edited this session.
  `acceptance-criteria.md`, `context.md`, and `solution.md` remain excluded —
  same as the existing per-task metadata commit — since they're human-owned
  and edited iteratively across refine rounds, not mechanical bookkeeping.
- **plan.md**: after updating `status/README.md`, commit `backlog.md`,
  `status/README.md`, and newly expanded `tasks/<slug>.md` files.

Each is its own commit, separate from any implementation commit, same
atomic-commit reasoning as above.

## Decisions (from planning, 2026-07-09, commit-metadata-all-skills)

Challenge finding while expanding this entry: `skills/release.md` step 3
already claims to reuse the `## Commit sub-agent prompt template` "scoped
explicitly to `specs/<spec>/**` instead of task scope globs," but the
template's literal contract step 1 only knows how to derive scope by reading
a task file's frontmatter — there is no actual explicit-scope override in the
written prompt. `verify.md`, `refine.md`, and `plan.md` need the same
explicit-scope invocation (none of them centers on a single task file the way
`implement.md` does), so this latent gap must be closed for any of them to
work correctly.

**Assumption (log-and-proceed):** generalize the template's contract step 1
to accept either (a) a task file path to derive `scope:` globs from
(`implement.md`'s existing use), or (b) an explicit list of files/globs
supplied directly by the caller (`release.md`'s existing claim, and the new
`verify.md`/`refine.md`/`plan.md` uses). The dispatching skill states which
mode applies and supplies the concrete globs/files inline — no behavior change
for `implement.md`'s own dispatch. This is a prompt-wording generalization
only (no new files, no schema change), so it's treated as low-risk/reversible
rather than a hard gap requiring user sign-off.

`verify.md`/`refine.md`/`plan.md` dispatches are single-scope (mode b) —
unlike `implement.md`, they have no separate "implementation vs. metadata"
split to make within one dispatch, since their entire scope already *is*
metadata. Contract step 5 (split into atomic commits when multiple distinct
changes are staged) still applies if the scoped file set spans more than one
logical change.
