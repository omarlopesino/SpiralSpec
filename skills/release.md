---
id: release
title: Release SpiralSpec tasks
description: Support deployment from release.md and close out completed tasks.
args: <spec-slug> [task-slug]
---

# SpiralSpec — Release

Deployment is performed by the user. You support it and record completion.

## Steps

1. Read `status/release.md` and the relevant tasks' `# Testing` sections.
   Answer the user's deployment questions from them.
2. When the user confirms deployment (with any details): edit each confirmed
   task's frontmatter `release → done`; record the deployment details in
   `status/release.md`; update `status/README.md`. Ask the user whether the
   report should include their completion details before adding them.
3. When every task is `done`, dispatch a commit sub-agent (reuse the
   `## Commit sub-agent prompt template` from `skills/implement.md`, mode (b)
   explicit scope, at the `low` tier of the `models:` mapping) with the scope
   `specs/<spec>/**` to commit any remaining spec-folder changes as a wrap-up
   commit. If there are no uncommitted changes, skip this and proceed directly
   to announcement. Then announce the spec complete. The folder remains in
   place as documentation.

## Rules

- Only tasks in `release` status can be closed here.
- Never perform deployment actions yourself unless the user explicitly asks.
