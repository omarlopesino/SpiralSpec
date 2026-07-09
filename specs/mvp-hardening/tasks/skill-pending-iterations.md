---
name: Disambiguate refine-authored pending iterations from progress entries
goal: >
  Following skills/refine.md on a not-yet-started change to an inprogress task
  and then following skills/implement.md leads an orchestrator to re-dispatch
  the stalled task: refine marks its entries as pending instructions, and
  implement's dead-sub-agent heuristic treats them as "no progress".
ground: null
status: release
scope:
  - skills/implement.md
  - skills/refine.md
  - .claude/skills/**
  - .claude/commands/**
  - .opencode/**
blocked: null
complexity: low
---

# Context

Review finding 1 (docs/reviews/2026-07-09-mvp-final-review.md): the
dead-sub-agent heuristic at `skills/implement.md:82-83` reads "A task sitting
in `inprogress` whose `# Iterations` has no entry for the current work is a
dead sub-agent: re-dispatch it." But `skills/refine.md:24` instructs refine to
"append an `# Iterations` entry describing what changed and why (goal, scope,
...)" — a *pending instruction*, not completed work. An orchestrator following
both skills literally could mistake that pending instruction for live
progress and fail to re-dispatch a stalled task.

Fix (candidate approach from the review, confirmed in solution.md):

1. In `skills/refine.md`: refine prefixes every iteration entry it authors
   with a visible pending marker — use `(refined — pending)` — so entries are
   recognizably instructions awaiting execution, not progress records. Also
   state that the implementing sub-agent drops/supersedes the pending marker
   when it acts on the instruction (append its own progress entry as usual).
2. In `skills/implement.md`: rework the dead-sub-agent heuristic (lines 82-83)
   to distinguish pending-instruction entries from progress entries: an
   `inprogress` task whose only entries for the current work are
   `(refined — pending)` instructions counts as having NO progress and must be
   re-dispatched.

These files are installer inputs. The idempotent installer propagates prose
changes: after editing, run `npm run build` and re-render the skill pack
(`node bin/spiralspec.js update` or however the repo's bin is invoked — check
`package.json` `bin`) so the managed copies under `.claude/skills/`,
`.claude/commands/spiral/`, and `.opencode/` pick up the new prose. Verify the
rendered `SKILL.md` files contain the reworded heuristic. Do NOT hand-edit
rendered copies.

Constraint: keep both edits minimal and in the voice/format of the
surrounding prose. No other heuristics or skill content changes.

# Tasks

- [ ] Add the `(refined — pending)` marker convention to skills/refine.md's
      iteration-entry instruction, including who clears/supersedes it
- [ ] Rework skills/implement.md's dead-sub-agent heuristic to treat
      pending-only iteration histories as no progress → re-dispatch
- [ ] Rebuild and re-run the installer so rendered copies under .claude/ and
      .opencode/ reflect the new prose; verify by grepping the rendered files
- [ ] Read both edited files against the review's finding-1 scenario and
      confirm the ambiguity is gone

# Iterations

## 2026-07-09

**What changed:** Added `(refined — pending)` marker convention to
`skills/refine.md` (line 24-28) instructing refine agents to prefix iteration
entries with this visible marker. Updated `skills/implement.md` dead-sub-agent
heuristic (lines 82-84) to distinguish pending-instruction entries from
progress: a task with only `(refined — pending)` entries counts as having no
progress and must be re-dispatched.

**Why:** Resolves the ambiguity in finding 1 (docs/reviews/2026-07-09-mvp-final-review.md)
where orchestrators could mistake refine's pending instructions for live
progress, failing to re-dispatch stalled tasks.

**Assumptions:** The `(refined — pending)` marker is sufficiently distinctive
for orchestrators and sub-agents to parse reliably; the marker appears at the
start of iteration entries and is dropped when the implementing agent appends
its own progress entry.

## 2026-07-09 (correction after review feedback)

The first rewrite of the implement.md heuristic narrowed the rule: "has only
entries marked `(refined — pending)`" no longer covered the original dead case
of an empty `# Iterations` (or entries only from prior work). Reworded the
bullet to cover both: no entry for the current work, OR only
`(refined — pending)` entries for it. Rebuilt and re-ran the installer;
grep-verified the rendered `.claude/skills/spiralspec-implement/SKILL.md`
(lines 84-86) carries the corrected wording.

# Testing

**Commands executed:**

```bash
npm run build                              # Compile TypeScript sources
./dist/cli/index.js update                 # Re-render skill pack
grep -n "refined — pending" .claude/skills/spiralspec-refine/SKILL.md
grep -n "refined — pending" .claude/skills/spiralspec-implement/SKILL.md
```

**Output and verification:**

1. TypeScript build succeeded (no errors).
2. Installer output confirmed all skill files were installed:
   - `installed .claude/skills/spiralspec-refine/SKILL.md`
   - `installed .claude/skills/spiralspec-implement/SKILL.md`
   - (and others)
3. Grep verification: `(refined — pending)` marker found in rendered refine skill (line 24).
4. Grep verification: `(refined — pending)` in dead-sub-agent heuristic found in rendered implement skill (line 83).
5. Context check confirmed full surrounding prose is intact and correctly reflects the intent.

**How to verify manually:**

- Read `skills/refine.md` (source) lines 24–28: confirms the pending marker instruction
- Read `skills/implement.md` (source) lines 82–84: confirms the heuristic distinguishes pending-only entries
- Trace finding 1 scenario: when refine appends `(refined — pending)` iteration entries and implement re-reads the task, the heuristic now correctly identifies pending-only histories as no progress
- No automated test is possible for skill prose prose — verification is by human reading both skill files against the review's scenario (acceptance criterion satisfied by this section).
