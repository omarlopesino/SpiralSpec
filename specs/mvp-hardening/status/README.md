# Current state

All seven tasks are implemented and user-verified (2026-07-09) and sit in
`release`. Wave 1 (skill-pending-iterations, yaml-safe-splices,
release-checklist) passed verification earlier; the user verified the
remaining four (resilient-spec-loading, reinit-and-version, validate-hint,
coverage-golden-tests) on 2026-07-09 ("everything is okay"). Suite 104/104
green, build clean. Nothing is runnable, blocked, or awaiting verification.

# Next steps

- Release-phase closeout (/spiral:release): work through the manual steps
  accumulated in status/release.md (npm metadata, skill-pack propagation,
  finding-1 verification statement), then move tasks to `done`.

# Completed tasks

- **coverage-golden-tests** (verification, 2026-07-09): resolved review
  findings 7–9 with 6 new regression tests. `test/cli.test.ts`: status
  human-output golden test (unexpanded backlog line + blocked suffix), next
  "nothing to run" output, and two impact git-fallback tests (inside a real
  temp git repo and outside one). `test/next.test.ts`: a blocked+inprogress
  task still claims its scope in the clash pool and excludes an overlapping
  todo task — the semantics are now also documented by a comment above the
  inprogress filter in `src/core/next.ts` (the one permitted source change).
  `test/impact.test.ts`: a task that is both a ground-dependent and a
  scope-hit appears once in `affected` (dedup). Fixture change:
  `test/fixtures/project/specs/demo/tasks/setup-db.md` gained
  `blocked: awaiting schema review` (safe — that task is in `verification`,
  outside next's todo/inprogress logic). The sub-agent mutation-tested both
  core-logic tests: temporarily breaking next's inprogress filter and
  impact's Set-dedup each failed exactly its new test. Verify: `npm test` —
  the new tests are in the three test files named above. Verified by
  orchestrator: `npm test` 104/104, build clean.

- **validate-hint** (verification, 2026-07-09): resolved reviewer
  recommendation 2. `spiralspec status` and `spiralspec next` now run
  `validateSpec()` and, when it reports issues, append a one-line warning to
  the human output ("warning: validate reports N issue(s) — parallel
  dispatch is not safe until fixed"). `--json` output, normal output on
  valid specs, and exit codes are unchanged. Implementation in
  `src/cli/program.ts` (status and next command handlers). Verify: break a
  task file in a spec (e.g. duplicate a scope claim), run
  `spiralspec status`/`next` → warning appears; `--json` stays byte-
  identical. Automated coverage: 5 new golden tests in `test/cli.test.ts`.
  Verified by orchestrator: `npm test` 98/98, build clean.

- **reinit-and-version** (verification, 2026-07-09): resolved review findings
  6 and 11 in `src/cli/program.ts`. The commander default on `init`'s
  `--agent` option is gone; when the flag is omitted the command now keeps
  the existing `cfg.agents` from `.spiralspec.yml`, falling back to the full
  `ADAPTER_IDS` pair only on a first init (empty config), while an explicit
  `--agent` still overrides. `program.version()` was added, reading
  `package.json` resolved relative to the module
  (`dirname(fileURLToPath(import.meta.url)) + ../../package.json`), which
  resolves correctly from both `src/cli/` and the built `dist/cli/` layout —
  orchestrator confirmed `node dist/cli/index.js --version` prints `0.1.0`.
  Verify: `spiralspec init --agent claude` then bare `spiralspec init` →
  `.spiralspec.yml` still lists only claude; `spiralspec --version` prints
  the package.json version. Automated coverage: 3 new agent-preservation
  golden tests plus a --version test in `test/cli.test.ts` (asserts against
  the real package.json value, not a hardcoded string). Verified by
  orchestrator: `npm test` 93/93, build clean. No changes were needed in
  `test/smoke.test.ts` despite it being in scope.

- **resilient-spec-loading** (verification, 2026-07-09): a directory named
  `*.md` inside `tasks/` and a `context.md` with broken YAML frontmatter no
  longer crash CLI commands — the spec degrades to invalid-but-inspectable
  and sibling specs are unaffected. `loadSpec` in `src/adapters/fs.ts` now
  lists `tasks/` with `withFileTypes: true` and keeps only `isFile()`
  entries, and wraps the context.md frontmatter parse in try/catch, falling
  back to `{ name: slug, autonomy: 'medium' }` plus an `invalid` entry
  (`slug: 'context'`) that the existing `invalid[]` plumbing in
  status/validate already surfaces — no changes needed in types.ts,
  validate.ts, or status.ts. Caveat: includes a type-cast
  `matter.clearCache()` call to work around a gray-matter bug where a
  thrown YAML parse is cached and a second in-process parse of the same
  broken content silently "succeeds". Verify: create a spec with a
  directory `tasks/foo.md/` or garbage in context.md's frontmatter, run
  `spiralspec status`/`validate` — the spec reports invalid, others still
  load; automated coverage in `test/fs.test.ts` (2 new unit tests) and
  `test/cli.test.ts` (2 new golden tests). Verified by orchestrator:
  `npm test` 89/89, build clean.

- **yaml-safe-splices** (verification, 2026-07-09): resolved review findings
  3 and 5. New exported `yamlScalar()` helper in
  `src/adapters/agents/claude.ts` (`yaml.dump(value, {lineWidth: -1})`
  trimmed) escapes every frontmatter splice site: SKILL.md name +
  description, command-file description, opencode description, and the
  `--name` value in `createSpec`; `scaffold.ts` now returns paths via
  `relative(specsDir, path)` instead of string slicing. New round-trip tests
  (colon, hash, embedded newline) in `test/agents.test.ts` and
  `test/scaffold.test.ts`, plus a trailing-slash `specsDir` test. Verified by
  orchestrator: `npm test` 85/85, `tsc` clean; shipped skill descriptions
  still render as unquoted single lines. Caveats/deviations (logged in the
  task's # Iterations): helper lives in claude.ts because types.ts was out of
  scope; the `date` template var is deliberately NOT escaped (template
  double-quotes it; js-yaml would single-quote date-like strings and corrupt
  the value); `templates/context.md` itself is unchanged — escaping happens
  at the render call site.

- **skill-pending-iterations** (verification, 2026-07-09): resolved review
  finding 1. `skills/refine.md` now prefixes iteration entries it authors on
  `inprogress` tasks with `(refined — pending)` and states the implementing
  agent drops the marker when acting; `skills/implement.md`'s dead-sub-agent
  heuristic now re-dispatches an `inprogress` task whose `# Iterations` has
  no entry for the current work OR only `(refined — pending)` entries.
  Rendered copies under `.claude/skills/` were regenerated via the installer.
  One orchestrator-review round: the first rewrite dropped the empty-
  Iterations dead case; corrected. Verify by reading both skill files against
  the finding-1 scenario in `docs/reviews/2026-07-09-mvp-final-review.md` —
  no automated test is possible for skill prose (the final report must state
  this).

- **release-checklist** (verification, 2026-07-09): added a "Manual
  pre-publish steps" section to `status/release.md` documenting that
  `repository`, `keywords`, `author`, `homepage` must be added to
  `package.json` by the user before `npm publish` (values deliberately left
  to the user — review finding 10). Verify by reading
  `specs/mvp-hardening/status/release.md`. Documentation-only; no code or
  tests touched. Caveat: the spec's final report must repeat this manual
  step.

# Blocked
