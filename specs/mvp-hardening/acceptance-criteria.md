# Acceptance Criteria

## Functional

- **Dead-sub-agent heuristic disambiguated (finding 1).** Following
  `skills/refine.md` on a not-yet-started change to an `inprogress` task and
  then following `skills/implement.md` leads the orchestrator to re-dispatch
  the stalled task: refine-authored `# Iterations` entries are visibly
  pending instructions, and implement's heuristic tells them apart from
  progress entries. No automated test is attempted — none is possible for
  skill prose. Verified by a human reading both skill files against the
  scenario in the review; the final report must state this explicitly.
- **YAML output survives hostile scalars (finding 3).**
  `spiralspec new x --name "A: B"` produces a `context.md` whose frontmatter
  parses; rendered agent files (claude, opencode) parse even if a skill
  description contains `: `, `#`, or a newline.
- **Half-broken specs stay inspectable (finding 4).** With a directory named
  `notes.md` inside a spec's `tasks/`, every CLI command still works for that
  spec and others. With a `context.md` whose frontmatter is invalid YAML,
  commands report that spec as invalid instead of crashing, and other specs
  are unaffected.
- **Re-`init` preserves configuration (finding 6).** After
  `spiralspec init --agent claude`, a later bare `spiralspec init` keeps
  `agents: [claude]` instead of reverting to the default pair. Passing
  `--agent` explicitly still overrides.
- **`spiralspec --version` prints the package version (finding 11).**
- **`next`/`status` hint when validation fails (reviewer recommendation 2).**
  On a spec where `spiralspec validate` reports issues, `next` and `status`
  append a one-line warning (issue count + that parallel dispatch is unsafe
  until fixed) without changing their normal output or exit code; on a valid
  spec their output is unchanged.
- **npm metadata is a documented manual step (finding 10).** The agent does
  NOT edit `package.json` metadata (`repository`, `keywords`, `author`,
  `homepage` are the user's values to choose). Instead, the final report and
  `status/release.md` list adding them as a manual pre-publish step for the
  user.

## Technical

- Fix finding 5: `createSpec` computes relative paths via
  `relative(specsDir, path)`, not string slicing.
- YAML escaping uses a real YAML serializer for scalars (e.g. `yaml.dump` on
  the single value), not hand-rolled quoting.
- New regression tests cover: the hostile-name scaffold, the `tasks/`
  directory-entry case, the broken-frontmatter case, re-`init` agent
  preservation, `--version`, and the `next`/`status` validation hint (present
  on an invalid spec, absent on a valid one).
- Coverage findings 7–9 get tests: human `status` output (unexpanded-backlog
  lines, blocked suffix), `next`'s "nothing to run", impact's git-fallback
  success and failure paths, `next`'s blocked+inprogress scope-claim
  semantics (plus one documenting sentence where that behavior lives), and
  an `impact` fixture where a slug appears in both `dependents` and
  `scopeHits`.
- Items listed as "already resolved" or "accepted as-is" in the review are
  not reworked; no behavior changes beyond the findings addressed.
- Full test suite passes and the build is clean.
