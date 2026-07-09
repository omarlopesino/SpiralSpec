---
name: Keep half-broken specs inspectable in loadSpec
goal: >
  A directory named *.md inside a spec's tasks/ and a context.md with invalid
  YAML frontmatter no longer take down CLI commands: the spec is reported as
  invalid-but-inspectable and other specs are unaffected.
ground: null
status: release
scope:
  - src/adapters/fs.ts
  - src/core/types.ts
  - src/core/validate.ts
  - src/core/status.ts
  - test/fs.test.ts
  - test/status.test.ts
  - test/validate.test.ts
  - test/cli.test.ts
blocked: null
complexity: medium
---

# Context

Review finding 4 (docs/reviews/2026-07-09-mvp-final-review.md): the
"half-broken spec must remain inspectable" principle is violated twice in
`loadSpec` (`src/adapters/fs.ts:7-28`):

1. **EISDIR on directory entries.** Line 19 uses
   `readdirSync(tasksDir).filter((f) => f.endsWith('.md'))` without
   `withFileTypes`; a *directory* named e.g. `notes.md` inside `tasks/` makes
   the subsequent `readFileSync` throw EISDIR. Fix:
   `readdirSync(tasksDir, { withFileTypes: true })`, filter to
   `e.isFile() && e.name.endsWith('.md')`.
2. **Broken context.md frontmatter.** Line 11 calls `parseSpecFrontmatter`
   (src/core/frontmatter.ts) unguarded; invalid YAML throws. Today the error
   is caught by `getSpec` in `src/cli/program.ts:21-30`, which prints
   `error: <message>` and exits 1 — a hard error, not inspectability. Fix:
   catch the parse error inside `loadSpec` and degrade.

**Degradation design (assumption logged in # Iterations):** reuse the
existing `invalid` mechanism on `SpecData` (`src/core/types.ts` —
`InvalidTask[]`) rather than a new shape: on context.md parse failure, push
an entry like `{ slug: 'context', file: 'context.md', error: <message> }`
and fall back to default frontmatter values (`name: <spec slug>`, the
schema's default autonomy, no created date — mirror whatever defaults
`parseSpecFrontmatter`/the SpecFrontmatter type make natural). If the
`InvalidTask` type name/fields make this awkward, a minimal additive change
to types.ts is in scope (keep `--json` output backward compatible: existing
fields unchanged, additions optional).

Required observable behavior (acceptance criteria):

- With a directory named `notes.md` inside a spec's `tasks/`: every CLI
  command (`status`, `next`, `validate`, `impact`) still works for that spec
  and for other specs.
- With a `context.md` whose frontmatter is invalid YAML: commands report that
  spec as invalid (status lists the invalid context.md entry; `validate`
  reports an issue and exits 1) instead of dying, and other specs are
  unaffected.

Check `src/core/validate.ts` — invalid entries should already surface as
validate issues (rule for invalid-parse files); confirm the context.md entry
flows through, add a rule only if it doesn't. `src/core/status.ts` already
carries `invalid` into the report and `program.ts` prints
`invalid <file>: <error>` lines — should need no change; verify.

# Tasks

- [x] fs.ts: readdirSync with withFileTypes, filter to files ending in .md
- [x] fs.ts: catch parseSpecFrontmatter errors, degrade to fallback fm +
      invalid entry
- [x] Confirm validate reports the broken-context spec as invalid (add rule
      only if missing)
- [x] Unit tests (test/fs.test.ts): directory-named-*.md case loads and skips
      the dir; broken-frontmatter case returns SpecData with the invalid
      entry and fallback fm
- [x] Golden tests (test/cli.test.ts): status on a spec with tasks/notes.md
      directory works; status + validate on broken-frontmatter spec report
      invalid instead of `error:` exit; a sibling healthy spec is unaffected
- [x] Full suite green, build clean

# Iterations

- 2026-07-09: Implemented both fixes in `src/adapters/fs.ts`:
  1. `readdirSync(tasksDir, { withFileTypes: true })` filtered to
     `e.isFile() && e.name.endsWith('.md')` — a directory named `notes.md`
     inside `tasks/` is now skipped instead of crashing `readFileSync` with
     EISDIR.
  2. `parseSpecFrontmatter` is now called inside a try/catch; on failure `fm`
     falls back to `{ name: slug, autonomy: 'medium', created: undefined }`
     and an `{ slug: 'context', file: 'context.md', error: 'invalid
     frontmatter: <message>' }` entry is pushed onto `invalid`, matching the
     `InvalidTask` shape used for tasks. No changes were needed in
     `types.ts` — the existing `InvalidTask` shape was sufficient (the
     planned assumption held, so no `--json` shape change at all).
  - `src/core/validate.ts` needed no change: `validateSpec`'s existing loop
    `for (const inv of spec.invalid) issues.push(...)` already surfaces the
    new `context.md` invalid entry as a validation issue generically.
    `src/core/status.ts` and `program.ts` also needed no change — verified
    by golden test, both already carry/print `invalid` entries correctly.
  - **Extra fix, discovered while writing the golden CLI tests (in scope of
    `fs.ts`, not a scope violation):** `gray-matter` caches parse results
    keyed by raw content (`matter.cache[file.content] = file`, set *before*
    parsing). When the YAML engine throws mid-parse, the cache is left
    holding a partial, data-less entry. A second `loadSpec` call on
    byte-identical broken `context.md` content in the same process (e.g. two
    CLI commands run in-process, or two different specs sharing broken
    content) then hit that stale cache entry and silently returned `data:
    {}` instead of throwing again — degrading only the *first* time, not
    reliably. This directly undermines the "other specs are unaffected" /
    "commands report invalid" acceptance criteria for any non-fresh-process
    usage, and was caught by my own golden test (`status` then `validate` on
    the same broken spec in one process: `validate` returned `OK` on the
    second parse). Fixed by calling `(matter as unknown as { clearCache():
    void }).clearCache()` at the top of the `context.md` parse in
    `loadSpec` — a type-safe cast since gray-matter's `.d.ts` doesn't
    declare `clearCache`/`cache`, kept local to `fs.ts` (no change to
    `src/core/frontmatter.ts`, which stayed out of scope). A real spawned
    CLI process (fresh `node` per invocation) was never affected by this;
    it only bites in-process reuse, which is exactly how the vitest golden
    tests (and any future long-running/embedded usage) exercise it.
  - Assumption: fixture specs for the two new scenarios are built at test
    runtime via `mkdtempSync`/`writeFileSync` (mirroring the existing
    pattern in `test/e2e.test.ts` and `test/scaffold.test.ts`) rather than
    as new files under `test/fixtures/project/specs/`, since the latter
    isn't covered by any scope glob on this task and the former keeps every
    change confined to `test/fs.test.ts` and `test/cli.test.ts`.

# Testing

Ran `npm test` (vitest) and `npm run build` (tsc) after each change.

- `npm run build` → clean, no type errors (including after adding the
  `gray-matter` cache-clear cast, which needed a local type assertion since
  `clearCache`/`cache` aren't in gray-matter's shipped `.d.ts`).
- `npm test` → all 15 test files, 89 tests pass, including:
  - `test/fs.test.ts`: 2 new tests — "skips a directory named *.md inside
    tasks/ instead of crashing on EISDIR" and "degrades a context.md with
    invalid YAML frontmatter to a fallback + invalid entry" (asserts
    `spec.fm`, `spec.invalid`, and that the sibling valid task still loads).
  - `test/cli.test.ts`: 2 new golden tests, each building an isolated
    `mkdtempSync` project with two sibling specs —
    - directory-shadowing case: `status --json` and `validate` both run
      clean (`invalid: []`, `validate` prints `OK`, `process.exitCode`
      stays `undefined`) on the spec with `tasks/notes.md/` as a directory,
      and the valid task still appears; the healthy sibling spec is
      unaffected.
    - broken-YAML case: `status --json` on the broken spec reports
      `invalid: [{ file: 'context.md', error: 'invalid frontmatter: ...' }]`
      without throwing; `validate` prints a `context.md: invalid
      frontmatter: ...` line and sets `process.exitCode` to `1` (run
      *after* `status` in the same process, on purpose, to pin the
      gray-matter cache regression above); the healthy sibling spec's
      `status --json` still reports `invalid: []`.
  - All prior tests (including the existing `demo` fixture's `tasks/broken.md`
    business-rule-invalid case) remain green, unmodified.

Human verification: `npm run build && npm test` from repo root. To see the
behavior live: `npm run build`, then in a scratch dir with
`specs/<slug>/context.md` containing invalid YAML frontmatter and/or
`specs/<slug>/tasks/<name>.md` as a directory, run `node
<repo>/dist/cli/*.js status <slug>` (or however the built CLI entrypoint is
invoked) and confirm it prints an `invalid` line rather than exiting with
`error: ...`.
