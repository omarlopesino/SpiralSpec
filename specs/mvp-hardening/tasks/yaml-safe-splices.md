---
name: Escape YAML splice sites and fix createSpec relative paths
goal: >
  All YAML frontmatter splice sites (agent renderers and the context.md
  scaffold) escape scalar values via js-yaml so hostile strings ("A: B", "#",
  newlines) produce parseable YAML; createSpec computes returned paths with
  relative() instead of string slicing.
ground: null
status: release
scope:
  - src/adapters/agents/claude.ts
  - src/adapters/agents/opencode.ts
  - src/adapters/scaffold.ts
  - templates/context.md
  - test/agents.test.ts
  - test/scaffold.test.ts
blocked: null
complexity: medium
---

# Context

Review findings 3 and 5 (docs/reviews/2026-07-09-mvp-final-review.md).

**Finding 3 — unescaped YAML splicing.** Raw strings are spliced into YAML
frontmatter at:

- `src/adapters/agents/claude.ts:11` — `description: ${s.description}` inside
  the SKILL.md template (the `name: spiralspec-${s.id}` splice is
  package-controlled but escape it too for uniformity if trivial)
- `src/adapters/agents/claude.ts:15` — `description: ${s.description}` in the
  command file template
- `src/adapters/agents/opencode.ts:11` — `description: ${s.description}`
- the scaffold path: `templates/context.md` has `name: {{name}}` filled by
  `render()` in `src/adapters/scaffold.ts` with the raw `--name` value, so
  `spiralspec new x --name "A: B"` writes invalid frontmatter today.

Fix: escape each scalar with the repo's existing YAML dependency **js-yaml**
(already imported in `src/adapters/config.ts`) — do NOT add a new package.
Pattern: `yaml.dump(value).trimEnd()` on the single scalar yields a safely
quoted/escaped YAML representation. Note `yaml.dump` of a multi-line string
produces block/quoted forms spanning lines — splicing must still yield valid
YAML for the `key: <value>` position (verify with a newline-containing value;
a `JSON.stringify`-style double-quoted flow scalar via
`yaml.dump(v, { forceQuotes: true, ... })` or dumping `{ description: v }` and
extracting is acceptable as long as it round-trips through `yaml.load`).
Put the helper in one place (e.g. `src/adapters/agents/types.ts` or a small
util) and use it at every splice site. Escape at the value level, not by
hand-rolled quoting (technical acceptance criterion).

For the scaffold: escape the `name` value where `createSpec`
(`src/adapters/scaffold.ts:11-29`) passes vars to `render()`, or at the
`render()` splice — the resulting `context.md` frontmatter must parse via
`yaml.load` and `parseSpecFrontmatter` (src/core/frontmatter.ts). The `date`
var is machine-generated and safe but escaping it too is harmless.

**Finding 5 — trailing-slash slice.** `src/adapters/scaffold.ts:28`:
`path.slice(specsDir.length + 1)` returns wrong relative paths if `specsDir`
arrives with a trailing slash. Replace with `relative(specsDir, path)` from
`node:path` — keep the existing `.split('\\').join('/')` normalization for
Windows separators.

Constraint: rendered output for the six shipped (safe) skill descriptions
should stay effectively unchanged — existing golden/installer tests must keep
passing without weakening them (plain safe strings should ideally render
unquoted; if js-yaml quotes some, updating expected fixtures is acceptable
only when output still parses to identical values).

# Tasks

- [x] Add a single YAML-scalar escape helper using js-yaml
- [x] Use it at claude.ts:11, claude.ts:15, opencode.ts:11
- [x] Escape the name var in the createSpec → render() scaffold path
- [x] Replace scaffold.ts:28 slice with relative(specsDir, path)
- [x] Tests (test/agents.test.ts): renderer output parses via yaml.load when a
      skill description contains ": ", "#", and a newline
- [x] Tests (test/scaffold.test.ts): createSpec with name "A: B" (and a
      newline-containing name) writes a context.md whose frontmatter parses;
      createSpec with a trailing-slash specsDir returns correct relative paths
- [x] Full suite green, build clean

# Iterations

- 2026-07-09: Added `yamlScalar(value)` in `src/adapters/agents/claude.ts`
  (`yaml.dump(value, { lineWidth: -1 }).trimEnd()`) and used it at all three
  named splice sites (`claude.ts` SKILL.md + command templates, both `name`
  and `description`; `opencode.ts` command template, imported from
  `claude.ts`) plus the `name` var in `scaffold.ts`'s `createSpec` →
  `render()` path. Fixed the trailing-slash bug by replacing
  `path.slice(specsDir.length + 1)` with `relative(specsDir, path)` (Windows
  `\`→`/` normalization kept). Added hostile-value round-trip tests to
  `test/agents.test.ts` and `test/scaffold.test.ts`, plus a trailing-slash
  specsDir test. Full suite green (85/85), `npm run build` clean.

  Assumptions / gap resolutions (none blocking, both within the scope
  contract):
  - The task's suggested helper location (`src/adapters/agents/types.ts`)
    is not in this task's scope globs, so the helper lives in `claude.ts`
    (which is in scope) and is imported by `opencode.ts` and `scaffold.ts`
    — satisfies "one place" without touching an out-of-scope file.
  - Did NOT escape the `date` var in `scaffold.ts`'s `createSpec`, despite
    the task text saying it'd be "harmless": verified experimentally that
    `yaml.dump` single-quotes date-like strings (e.g. `'2026-07-09'`) to
    avoid the YAML timestamp type, and `templates/context.md` already wraps
    `{{date}}` in explicit double quotes (`created: "{{date}}"`) — escaping
    would have produced the corrupt `created: "'2026-07-09'"`. `date` is
    machine-generated and never hostile, so it's left unescaped with a
    comment explaining why.
  - Added `lineWidth: -1` to the `yaml.dump` call (not in the task's
    example pattern) after discovering js-yaml's default ~80-col wrapping
    folds the six shipped (long, safe) skill descriptions into multi-line
    `>-` block scalars, which would have changed rendered output more than
    "effectively unchanged" as required. With `lineWidth: -1`, verified via
    a manual `installSkillPack` run into a temp dir that all six shipped
    skills still render as single unquoted `description: ...` lines,
    identical to pre-change output, while hostile values are still
    correctly quoted/escaped.

# Testing

Commands run:

- `npm run build` → `tsc` completes with no errors/output.
- `npm test` → `vitest run`: **15 test files, 85 tests, all passed** (0
  failures), including the 5 new/updated tests in `test/agents.test.ts`
  (hostile description with `": "`, `"#"`, and embedded newlines renders
  through both adapters and round-trips via `gray-matter` and direct
  `yaml.load` of the frontmatter block) and 3 new tests in
  `test/scaffold.test.ts` (hostile name `"A: B"`, a newline-containing name,
  and a trailing-slash `specsDir` all produce correct, parseable output).
- Manual check: built `dist/adapters/installer.js` and ran
  `installSkillPack(tmpDir, ['claude', 'opencode'])` against the real
  `skills/*.md` sources — confirmed all six shipped skill/command files
  still render their `description:` as a single unquoted plain-scalar line
  (e.g. `description: Read the definition artifacts, challenge the
  solution, surface gaps, and generate the task breakdown.`), unchanged
  from before this task.

How a human can verify:

1. Run `npm test` — expect all tests green, in particular
   `test/agents.test.ts` and `test/scaffold.test.ts`.
2. Run `npm run build` — expect a clean `tsc` compile.
3. Manually: `node -e "const{createSpec}=require('./dist/adapters/scaffold.js');createSpec('/tmp/x','s','A: B')"` (after
   `npm run build`) then inspect `/tmp/x/s/context.md` — `name: 'A: B'` (or
   equivalent quoted form) that `js-yaml`/`gray-matter` parses back to the
   literal string `A: B`.
4. Diff `.claude/skills/*/SKILL.md` and `.opencode/commands/*.md` generated
   before/after this change for the shipped skills — descriptions are
   byte-identical.
