---
name: Record npm metadata as a manual pre-publish step
goal: >
  status/release.md documents adding npm metadata (repository, keywords,
  author, homepage) to package.json as a manual pre-publish step for the
  user; the agent does not edit package.json metadata.
ground: null
status: release
scope:
  - specs/mvp-hardening/status/release.md
blocked: null
complexity: low
---

# Context

Review finding 10 (docs/reviews/2026-07-09-mvp-final-review.md):
`package.json` lacks `repository`, `keywords`, `author`, `homepage` — needed
before the first npm publish. Per the acceptance criteria this is explicitly
NOT implemented by the agent (the values are the user's to choose): it is
recorded as a manual step instead.

Edit `specs/mvp-hardening/status/release.md` (currently the empty template):
add a "Manual pre-publish steps" item stating the user must add `repository`,
`keywords`, `author`, and `homepage` to `package.json` before `npm publish`,
with a one-line note that these values are deliberately left to the user.

Note for the release phase (not this task's edit, but context for the final
report): the spec's final report must also list this manual step, alongside
the finding-1 statement that skill prose was human-verified.

# Tasks

- [ ] Add the manual pre-publish npm-metadata step to
      specs/mvp-hardening/status/release.md

# Iterations

**2026-07-09**: Added manual pre-publish npm metadata step to `specs/mvp-hardening/status/release.md`. Documented that `repository`, `keywords`, `author`, and `homepage` must be added to `package.json` before npm publish, with note that these values are intentionally left to the user. No code changes required; documentation-only task.

# Testing

None (documentation-only). Verified by reading release.md.
