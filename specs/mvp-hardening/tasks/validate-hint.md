---
name: Warn in next/status when validate reports issues
goal: >
  On a spec where `spiralspec validate` reports issues, `next` and `status`
  append a one-line warning (issue count + parallel dispatch unsafe) to their
  human output; normal output, exit code, and --json shape stay unchanged.
ground: [reinit-and-version]
status: release
scope:
  - src/cli/program.ts
  - test/cli.test.ts
blocked: null
complexity: low
---

# Context

Reviewer recommendation 2 (docs/reviews/2026-07-09-mvp-final-review.md): the
parallel-safety guarantee in skills/implement.md is conditional on
`spiralspec validate` printing OK, so `next` and `status` should surface a
failing validation where it matters.

Implementation, in `src/cli/program.ts`:

- In the `status` command (lines 119-138) and `next` command (lines 140-165),
  after loading the spec, run `validateSpec(spec)`
  (`src/core/validate.ts`, already imported in program.ts).
- When it returns issues, append ONE warning line at the end of the **human**
  output branch only:
  `warning: validate reports N issue(s) — parallel dispatch is not safe until fixed`
  (N = issue count; keep this exact shape).
- Constraints (acceptance criteria): normal output lines are unchanged and
  come first; exit code is unchanged (the warning does NOT set exitCode 1);
  `--json` output stays byte-identical (assumption logged below: no JSON
  field is added); on a valid spec, output is completely unchanged.

# Tasks

- [ ] status: append the warning line to human output when validateSpec
      returns issues
- [ ] next: same
- [ ] Golden tests (test/cli.test.ts): warning present in status and next
      human output on an invalid spec fixture (e.g. a task with a bad ground
      reference); warning absent on a valid spec; --json output on the
      invalid spec contains no warning; exit codes unchanged
- [ ] Full suite green, build clean

# Iterations

- 2026-07-09: Implemented warning in `status` and `next` commands. Ran `validateSpec(spec)` after loading spec in both commands and appended warning line to human output only (not to --json). Added 5 new golden tests to verify warning appears in human output on invalid spec, absent in JSON output, absent on valid spec, and exit codes unchanged. All 98 tests pass, build clean.

# Testing

Ran `npm test` which executed all 98 tests (17 in cli.test.ts):
- Test for status human output includes warning when spec has validation issues ✓
- Test for status --json output does not include warning (byte-identical) ✓
- Test for next human output includes warning when spec has validation issues ✓
- Test for next --json output does not include warning ✓
- Test for status and next have no warning on a valid spec ✓

Manual verification (from test/fixtures/project):
- `node dist/cli/index.js status demo` outputs warning line at end: "warning: validate reports 1 issue(s) — parallel dispatch is not safe until fixed"
- `node dist/cli/index.js status demo --json` produces valid JSON with no warning field
- `node dist/cli/index.js next demo` outputs warning line at end
- `node dist/cli/index.js next demo --json` produces valid JSON with no warning field
- Exit codes remain 0 (no changes from validation warnings)

To verify: run `npm test` and check that all 98 tests pass, including the new 5 warning-related tests in cli.test.ts.
