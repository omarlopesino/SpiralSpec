# Acceptance Criteria

## Functional

- After the commit subagent runs, all files modified during the implementation
  are committed (via one or several commits) — no uncommitted changes remain
  from that implementation pass.
- When several unrelated changes are present, they are split into separate
  commits rather than squashed into one.
- When the project defines a commit message convention, generated messages
  follow it.

## Technical

- Use the haiku model for this subtask.