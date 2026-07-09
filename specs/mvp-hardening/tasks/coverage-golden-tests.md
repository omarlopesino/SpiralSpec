---
name: Close the review's test-coverage gaps
goal: >
  Findings 7-9 get regression tests: human status output branches, next's
  "nothing to run", impact's git-fallback success/failure, the
  blocked+inprogress scope-claim semantics (plus a documenting sentence), and
  impact's dependents/scopeHits dedup.
ground: [validate-hint]
status: release
scope:
  - test/cli.test.ts
  - test/next.test.ts
  - test/impact.test.ts
  - test/fixtures/**
  - src/core/next.ts
blocked: null
complexity: medium
---

# Context

Review findings 7-9 (docs/reviews/2026-07-09-mvp-final-review.md). All
behaviors were manually exercised during review and behaved — these tests pin
them. Follow the existing fixture/golden patterns in `test/cli.test.ts` and
`test/fixtures/`. The only production-code change allowed is ONE documenting
sentence (comment) in `src/core/next.ts`.

**Finding 7 — untested CLI human-output branches** (`src/cli/program.ts`):

- `status` human output: the unexpanded-backlog lines
  (`unexpanded   <slug> — <goal>`, program.ts:133-135, needs a fixture with a
  `- [ ]` backlog entry not yet expanded) and the blocked suffix
  (`(blocked: ...)`, program.ts:131, fixture task with `blocked` set).
- `next` human output: the `nothing to run` branch (program.ts:163 — zero
  runnable AND zero excluded, e.g. a spec with no tasks).
- `impact` git-fallback (program.ts:186-198): success path — no `--files`
  flag, run inside a git repo (or a temp dir with an initialized repo) and
  assert output; failure path — no `--files` in a directory where
  `git diff` fails (temp dir that is not a git repo) → asserts
  `error: could not run git diff; pass --files explicitly` and exit 1.

**Finding 8 — blocked+inprogress scope semantics** (`src/core/next.ts`): a
task that is both `inprogress` and `blocked` still occupies its scope in the
clash pool (intended: WIP claims its files, blocked or not). One test — a
blocked inprogress task whose scope overlaps a todo task; the todo task must
be excluded for the scope clash. Plus ONE documenting sentence next to the
clash-pool logic in src/core/next.ts stating that blocked WIP still claims
its scope. Test can live in test/next.test.ts (unit) — do not duplicate at
CLI level.

**Finding 9 — impact's Set-dedup union** (`src/core/impact.ts`): all existing
fixtures produce disjoint `dependents`/`scopeHits`. Add a fixture where one
slug appears in BOTH (a task that ground-depends on the target AND whose
scope matches a changed file) and assert the slug appears exactly once in
`affected`. Unit test in test/impact.test.ts.

# Tasks

- [x] Fixture + golden test: status human output with unexpanded backlog
      lines and a blocked-suffix task
- [x] Golden test: next prints "nothing to run" on a task-less spec
- [x] Golden tests: impact git-fallback success (inside a repo) and failure
      (outside a repo → error + exit 1)
- [x] Unit test: blocked+inprogress task still claims scope in the clash
      pool; add the documenting sentence in src/core/next.ts
- [x] Unit test: impact dedup — slug in both dependents and scopeHits appears
      once in affected
- [x] Full suite green, build clean

# Iterations

- 2026-07-09: Implemented all five findings.
  - Finding 7a (status human output): reused the fixture's existing
    unexpanded `- [ ] cleanup` backlog line, and added `blocked: awaiting
    schema review` to `test/fixtures/project/specs/demo/tasks/setup-db.md`
    (setup-db is `status: verification`, so this doesn't touch any
    `next`-related exclusion/scope-clash logic in the same fixture). New
    test in `test/cli.test.ts` asserts both the `unexpanded   cleanup — ...`
    line and the `verification setup-db  (blocked: awaiting schema review)`
    line.
  - Finding 7b (next "nothing to run"): new test in `test/cli.test.ts` spins
    up a temp spec with a `context.md` and no `tasks/` dir at all (zero
    runnable, zero excluded).
  - Finding 7c (impact git-fallback): two new `test/cli.test.ts` tests.
    Success path `git init`s a temp dir, commits a baseline, leaves one file
    uncommitted so `git diff --name-only HEAD` reports it, and runs `impact`
    with no `--files`. Failure path runs `impact` (no `--files`) in a fresh
    temp dir that is not a git repo (and not nested under one, since
    `mkdtempSync(tmpdir())` lives outside any repo tree) — confirmed
    manually via a throwaway `git diff --name-only HEAD` in `/tmp` that it
    exits non-zero there before wiring the test.
  - Finding 8 (blocked+inprogress scope claim): added the one documenting
    sentence in `src/core/next.ts` above the `inprogress` filter (blocked WIP
    still claims its scope), plus a unit test in `test/next.test.ts` with a
    blocked+inprogress task whose scope overlaps a todo task — the todo task
    is excluded with `scope conflict with inprogress: <slug>`.
  - Finding 9 (impact Set-dedup): rather than adding a wholly new fixture,
    reused the existing `impact.test.ts` SPEC — task `migrate` already
    ground-depends on `setup-db` (dependent) and has scope `src/migrate/**`;
    calling `impactOf(SPEC, 'setup-db', ['db/schema.sql', 'src/migrate/index.ts'])`
    naturally puts `migrate` in both `dependents` and `scopeHits`. Asserted
    `affected` contains it exactly once.
  - Assumption: "add a fixture" for finding 9 was interpreted as "construct
    a scenario," not necessarily a new task/file — the existing tasks
    already exercise the exact overlap the finding describes, so a new
    fixture task would have been redundant.
  - Assumption: the blocked-suffix fixture change (setup-db) was made in the
    shared `demo` fixture rather than a fresh one-off fixture, since it's
    already used for golden/status tests and confirmed via grep that no
    other test depends on setup-db being unblocked.

# Testing

Commands run (from repo root):

- `npm test` → 15 test files, 104 tests, all passing. This includes 6 new
  tests added by this task: 1 status human-output (unexpanded backlog +
  blocked suffix) in test/cli.test.ts, 1 next "nothing to run" in
  test/cli.test.ts, 2 impact git-fallback (success/failure) in
  test/cli.test.ts, 1 blocked+inprogress scope-clash unit test in
  test/next.test.ts, and 1 impact dedup unit test in test/impact.test.ts.
- `npm run build` (`tsc`) → clean, no errors.

Spot-check that the new tests actually pin behavior (temporarily broke the
production logic locally, confirmed the corresponding test fails, then
restored the original code and reconfirmed the full suite is green):

- `src/core/next.ts`: changed the `inprogress` filter to
  `t.fm.status === 'inprogress' && !t.fm.blocked` (i.e. blocked WIP no longer
  claims its scope) → `npx vitest run test/next.test.ts` failed exactly the
  new "a blocked inprogress task still claims its scope in the clash pool"
  test (expected `b` excluded for scope conflict, got nothing). Reverted via
  `cp` of the pre-edit file, then re-ran `npm test` → 104/104 green again.
- `src/core/impact.ts`: changed
  `const affected = [...new Set([...deps, ...scopeHits])];` to
  `const affected = [...deps, ...scopeHits];` (no dedup) → `npx vitest run
  test/impact.test.ts` failed exactly the new "dedups a slug that is both a
  ground-dependent and a scope hit" test (`['migrate','migrate']` vs
  `['migrate']`). Reverted, then re-ran `npm test` and `npm run build` →
  clean.

How a human can verify: run `npm test` and `npm run build` from repo root;
both should be green/clean. To confirm the new tests are meaningful (not
vacuous), re-apply either of the two sed-style breaks above to
`src/core/next.ts` / `src/core/impact.ts` and re-run `npm test` — exactly one
new test should fail each time.
