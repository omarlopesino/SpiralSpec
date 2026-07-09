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
