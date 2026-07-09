# SpiralSpec MVP — Final Whole-Branch Review (2026-07-09)

Review of the merged MVP (range `9a052f4..24bfe45`, 17 commits, plus follow-up
fixes). Verdict: **ready to merge, no critical defects**. Suite 77/77, build
clean, `npm pack` contents verified, commit history clean.

This document preserves the review's findings as input for follow-up work
(e.g. a SpiralSpec-managed hardening spec). Items already fixed are marked so
they are not re-done.

## Already resolved (commit `1233de4`)

- ~~**`impact` silently succeeds on a nonexistent task slug**~~ — fixed: the
  impact command now prints `error: task not found: <slug>` and exits 1;
  regression test added in `test/cli.test.ts`.
- ~~**No build-on-publish hook**~~ — fixed: `"prepack": "npm run build"` added
  to `package.json`.
- ~~**Raw git stderr leaks on impact's git-diff fallback failure**~~ — fixed:
  `stdio: ['ignore', 'pipe', 'pipe']` on the `execSync` call.
- ~~**Stale comment on `SpecData.backlog`**~~ — fixed in `src/core/types.ts`.

Also resolved separately (commit `a1937ae`, decision D13): the mandatory
backlog-verification stop in `skills/plan.md` now scales with the autonomy
dial (required at low, one question at medium, never blocking at high).

## Open findings

### Skill content (LLM instructions)

1. **implement.md dead-sub-agent heuristic vs refine-authored iterations.**
   `skills/implement.md` treats "an `inprogress` task whose `# Iterations` has
   no entry for the current work" as a dead sub-agent to re-dispatch. But
   `skills/refine.md` may append an `# Iterations` entry describing a
   *requested change* (a pending instruction, not completed work). An
   orchestrator following both skills literally could mistake a pending
   instruction for live progress and fail to re-dispatch a stalled task.
   Candidate fix: refine prefixes its entries `(refined — pending)`, and
   implement.md's heuristic distinguishes pending-instruction entries from
   progress entries.

2. ~~**implement.md overstates the parallel-safety guarantee.**~~ — resolved
   with the D14 model-dispatch feature: step 4 now conditions parallel
   dispatch on `spiralspec validate <spec>` printing OK.

### Code hardening

3. **Renderer YAML splicing is unescaped.**
   `src/adapters/agents/claude.ts:11,15` and `opencode.ts:11` splice
   `s.description` / `s.id` directly into YAML frontmatter. A description
   containing `: ` or a newline silently corrupts the rendered file. Latent
   today (all six shipped descriptions are safe, package-controlled), but the
   same class of bug is user-reachable via
   `spiralspec new x --name "A: B"` → invalid YAML in `context.md`
   (`templates/context.md` + `src/adapters/scaffold.ts`). Fix: quote/escape
   scalar values (e.g. via `yaml.dump` for single scalars).

4. **`status` dies on a directory named `*.md` inside `tasks/`.**
   `src/adapters/fs.ts:19` — `readdirSync` without `withFileTypes`; a
   directory named e.g. `notes.md` makes `readFileSync` throw EISDIR and
   takes down every command for that spec, against the "half-broken spec must
   remain inspectable" principle. Same class: a `context.md` with broken YAML
   throws from `parseSpecFrontmatter` and kills all commands for the spec.
   Fix: filter to files (`withFileTypes: true`); catch context.md parse
   errors and report the spec as invalid-but-inspectable.

5. **`createSpec` trailing-slash slice assumption.**
   `src/adapters/scaffold.ts:28` — `path.slice(specsDir.length + 1)` returns
   wrong relative paths if `specsDir` ever arrives with a trailing slash.
   Latent (the CLI always passes `resolve()` output). Fix: use
   `relative(specsDir, path)`.

6. **Bare re-`init` resets a customized agent list.**
   `src/cli/program.ts` — commander's `--agent` default (`claude,opencode`)
   always wins when the flag is omitted, so `init --agent claude` followed by
   a bare `init` silently reverts to both agents. Fix: default to existing
   `cfg.agents` when the flag isn't explicitly passed.

### Test coverage

7. **CLI human-output branches and the git-diff fallback are untested.**
   `src/cli/program.ts` — human `status` output (unexpanded-backlog lines,
   blocked suffix), `next`'s "nothing to run", and the impact git-fallback
   paths (success and failure) have no golden tests. (Manually exercised
   during review; all behaved.)

8. **`next`'s blocked+inprogress scope semantics are untested/undocumented.**
   A task that is both `inprogress` and `blocked` still occupies its scope in
   the clash pool (intended: WIP claims its files). Deserves one test and one
   documenting sentence.

9. **`impact`'s Set-dedup never exercised on an actual duplicate.**
   All existing fixtures produce disjoint `dependents`/`scopeHits`. One test
   where a slug appears in both would pin the union semantics.

### Packaging / polish

10. **npm metadata missing.** `package.json` lacks `repository`, `keywords`,
    `author`, `homepage` — add before the first publish.

11. **No `--version` flag.** Commander was never given `.version()`; the only
    smoke check is `--help`. One-liner (read version from package.json).

### Accepted as-is (no action planned)

- `validate`'s backlog "not listed" rule skips invalid-parse files — confirmed
  harmless: rule 1 already fails validate on those files; no silent-pass path.
- Byte-identical unmanaged file gets adopted into the installer manifest —
  arguably the correct reading of D9 (indistinguishable from installer
  output).
- `segsOverlap` exponential worst case on many-`**` globs and `dependents`'
  O(n²) scan — irrelevant at spec-realistic sizes.

## Reviewer recommendations

1. Fix items 1-2 (skill content) early — they surface fastest in real use,
   and the idempotent installer exists precisely to iterate on skill prose.
2. Consider making `next`/`status` hint when `validate` would fail, since the
   parallel-safety guarantee is conditional on validation.
3. Dogfood: manage this list as a SpiralSpec spec.
