# Solution

Work through the review's open findings group by group. Source document:
`docs/reviews/2026-07-09-mvp-final-review.md` (finding numbers below are its
numbering). Candidate fixes named there are the intended approach unless the
plan phase finds a better one.

## Skill content (finding 1)

`skills/implement.md` + `skills/refine.md`: refine prefixes iteration entries
it authors with a pending marker (candidate: `(refined — pending)`), and
implement's dead-sub-agent heuristic is reworded to treat pending-instruction
entries as "no progress" — so a stalled `inprogress` task with only a
refine-authored entry still gets re-dispatched. These files are installer
inputs; the idempotent installer (`spiralspec init`) propagates prose changes,
so also regenerate/verify the rendered copies under `.claude/skills/`.

No automated test for this finding — skill prose is not machine-verifiable.
The final report must state that automated verification is not possible and
that a human verifies by reading both skill files against the review's
scenario.

## Code hardening (findings 3–6)

- **3 — YAML escaping.** `src/adapters/agents/claude.ts:11,15`,
  `src/adapters/agents/opencode.ts:11`, and the scaffold path
  (`templates/context.md` + `src/adapters/scaffold.ts`) splice raw strings
  into YAML. Escape scalar values via the `yaml` package (e.g. `yaml.dump`
  of the single scalar, trimmed) at every splice site.
- **4 — resilient spec reading.** `src/adapters/fs.ts:19`: use
  `readdirSync(..., { withFileTypes: true })` and filter to files. Catch
  `parseSpecFrontmatter` errors on `context.md` and surface the spec as
  invalid-but-inspectable (status/validate report it; commands don't throw).
- **5 — relative paths.** `src/adapters/scaffold.ts:28`: replace
  `path.slice(specsDir.length + 1)` with `relative(specsDir, path)`.
- **6 — re-`init` config preservation.** `src/cli/program.ts`: stop relying
  on commander's `--agent` default; when the flag is omitted, fall back to
  existing `cfg.agents` (default pair only on first init).

## Test coverage (findings 7–9)

Golden tests in `test/cli.test.ts` (follow existing fixture patterns):

- Human `status` output: unexpanded-backlog lines and the blocked suffix.
- `next`: the "nothing to run" branch.
- `impact`: git-fallback success and failure paths.
- `next`: a task both `inprogress` and `blocked` still claims its scope in
  the clash pool — one test plus one documenting sentence next to the logic.
- `impact`: a fixture where one slug appears in both `dependents` and
  `scopeHits`, pinning the Set-union dedup.

## Validation hint in `next`/`status` (reviewer recommendation 2)

`src/cli/program.ts`: the `next` and `status` commands run `validateSpec`
(`src/core/validate.ts`) on the spec they are reporting and, when it returns
issues, append one warning line to their human output, e.g.
`warning: validate reports N issue(s) — parallel dispatch is not safe until
fixed`. Normal output, exit code, and `--json` shape stay unchanged (if a
warning is added to JSON output, it goes in a new optional field). Two golden
tests: warning present on an invalid spec, absent on a valid one.

## Packaging (findings 10–11)

- `src/cli/program.ts`: `.version()` reading from `package.json`, plus a
  smoke test.
- Finding 10 (npm metadata: `repository`, `keywords`, `author`, `homepage`)
  is **not implemented by the agent** — the values are the user's to choose.
  Record it in `status/release.md` and the final report as a manual
  pre-publish step.
