---
name: MVP Hardening
autonomy: medium
created: "2026-07-09"
---

# Context

The SpiralSpec MVP merged after a final whole-branch review
(`docs/reviews/2026-07-09-mvp-final-review.md`, range `9a052f4..24bfe45`).
Verdict: ready to merge, no critical defects — but the review left a list of
open findings that were deliberately deferred rather than blocking the merge.

This spec exists to burn down those open findings before the first npm
publish and before heavier dogfooding of the skill pack. It is also the first
dogfooding exercise itself (reviewer recommendation 3: manage the findings
list as a SpiralSpec spec).

The findings fall into four groups:

1. **Skill content** — a heuristic conflict between `skills/implement.md`
   (dead-sub-agent re-dispatch) and `skills/refine.md` (pending-instruction
   iteration entries) that could make an orchestrator mistake a pending
   instruction for live progress.
2. **Code hardening** — latent robustness bugs: unescaped YAML splicing in
   renderers and scaffold, `status` crashing on a directory named `*.md` or a
   broken `context.md` (violating the "half-broken spec must remain
   inspectable" principle), a trailing-slash assumption in `createSpec`, and
   bare re-`init` silently resetting a customized agent list.
3. **Test coverage** — untested CLI human-output branches, the impact
   git-diff fallback, `next`'s blocked+inprogress scope semantics, and
   `impact`'s Set-dedup union.
4. **Packaging polish** — no `--version` flag (to implement); missing npm
   metadata (finding 10) is handled as a *manual* pre-publish step for the
   user, documented in the final report, not implemented by the agent.

In addition to the review findings, reviewer recommendation 2 is in scope:
`next` and `status` warn when `validate` would fail, so the conditional
parallel-safety guarantee is visible where it matters.

Items marked "already resolved" or "accepted as-is" in the review document
are explicitly **out of scope** — they must not be re-done.

Source of truth for finding details: the review document above. Finding
numbers referenced in this spec (1, 3–11) are the review's numbering; items
2 and the "already resolved" block are closed.
