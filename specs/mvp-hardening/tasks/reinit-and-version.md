---
name: Preserve agents on bare re-init and add --version
goal: >
  A bare `spiralspec init` after `init --agent claude` keeps agents [claude]
  instead of reverting to the default pair, and `spiralspec --version` prints
  the package version.
ground: [resilient-spec-loading]
status: release
scope:
  - src/cli/program.ts
  - test/cli.test.ts
  - test/smoke.test.ts
blocked: null
complexity: low
---

# Context

Review findings 6 and 11 (docs/reviews/2026-07-09-mvp-final-review.md). Both
land in `src/cli/program.ts`.

**Finding 6 — bare re-init resets agents.** The `init` command
(`program.ts:64-82`) declares
`.option('--agent <list>', 'comma-separated agents', ADAPTER_IDS.join(','))` —
commander's default always wins when the flag is omitted, so
`init --agent claude` followed by a bare `init` silently reverts config to
both agents. Fix: drop the commander default (option type becomes
`agent?: string`); when the flag is omitted, fall back to the existing
`cfg.agents` from `loadConfig` (`src/adapters/config.ts`) — note `loadConfig`
returns `agents: []` when no `.spiralspec.yml` exists, so: flag present →
parse it; flag absent and `cfg.agents` non-empty → keep `cfg.agents`; flag
absent and `cfg.agents` empty (first init) → default to `ADAPTER_IDS`.
Passing `--agent` explicitly must still override (acceptance criterion).

**Finding 11 — no --version.** Commander was never given `.version()`. Add it
reading the real version from `package.json` — resolve the file relative to
the module, not cwd (pattern: `dirname(fileURLToPath(import.meta.url))` as in
`src/adapters/scaffold.ts:5`, then `../../package.json` from `src/cli/`;
verify the relative depth works from the built `dist/` layout too —
check `tsconfig`/build output structure). Parse with `JSON.parse` and pass to
`program.version(...)`.

# Tasks

- [x] init: remove commander default on --agent; implement omitted-flag
      fallback (existing cfg.agents, else ADAPTER_IDS on first init)
- [x] Add .version() reading package.json relative to the module
- [x] Test: init --agent claude, then bare init → .spiralspec.yml still has
      agents [claude]; bare first init → default pair; re-init with explicit
      --agent overrides
- [x] Test: --version prints the version read from package.json (assert
      against the actual package.json value, don't hardcode "0.1.0")
- [x] Full suite green, build clean

# Testing

Ran `npm test` and `npm run build`:

**Test Results:**
```
✓ test/cli.test.ts (12 tests) 76ms
  ✓ cli > init agent preservation > init --agent claude, then bare init preserves [claude]
  ✓ cli > init agent preservation > bare first init uses default agent pair
  ✓ cli > init agent preservation > init with explicit --agent overrides existing config
  ✓ cli > --version prints the package version

Test Files  15 passed (15)
Tests  93 passed (93)
```

**Build Results:**
```
> spiralspec@0.1.0 build
> tsc
(no errors)
```

All tests pass, including:
1. Three new tests for agent preservation on bare re-init (all scenarios: preserve single agent, default pair, explicit override)
2. One new test for --version output (verifies it matches package.json version without hardcoding)
3. All existing tests remain green

The implementation satisfies both acceptance criteria: bare re-init preserves agents when the flag is omitted, and --version reads and prints the actual version from package.json.

# Iterations

**2026-07-09 — Initial implementation**
- Removed default from commander's --agent option (line 66)
- Implemented fallback logic: flag present → parse; flag absent and cfg.agents non-empty → preserve; flag absent and cfg.agents empty → default to ADAPTER_IDS
- Added .version() reading package.json relative to module path using fileURLToPath/dirname pattern
- Added three golden tests for agent preservation scenarios
- Added test for --version command
- All 93 tests passing; build clean
