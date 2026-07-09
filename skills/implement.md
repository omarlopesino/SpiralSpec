---
id: implement
title: Implement SpiralSpec tasks
description: The continue verb — dispatch runnable tasks to fresh sub-agents, in parallel when scopes allow.
args: <spec-slug> [task-slug]
---

# SpiralSpec — Implement

Implement tasks through sub-agents with fresh contexts. You are the
orchestrator: you dispatch, you report, you never implement in your own
context.

## Steps

1. Run `spiralspec status <spec> --json`, then `spiralspec next <spec> --json`.
2. If a task-slug argument was given: if it is in `runnable`, work it. If not,
   explain exactly why using the `excluded` reason (blocked / waiting on
   ground / scope conflict with an inprogress task) or its status (`backlog`
   needs user approval; `verification`/`release`/`done` need user action) —
   then stop.
3. Otherwise choose from `runnable`: prefer resuming `inprogress` tasks, then
   base tasks (`ground: null`), then incremental ones.
4. Dispatch each chosen task to a sub-agent with the prompt template below —
   in parallel when the platform supports it and the tasks appear together in
   `runnable` (their scopes are guaranteed disjoint); otherwise one at a time.
5. After each sub-agent finishes: confirm the task file reached
   `status: verification`; then update `status/README.md` (`# Current state`,
   `# Next steps`, a `# Completed tasks` entry: how it was done, how to verify
   it, caveats) and append any deploy/build/manual steps to
   `status/release.md`. YOU write the reports, never the sub-agent — and write
   for a reader who has not seen this conversation.
6. Re-run `spiralspec next`. At autonomy **high**: continue until `runnable`
   is empty. At **low/medium**: report and ask before the next batch.
7. When everything is excluded, report why per task and what the user must do.

## Sub-agent prompt template

Dispatch with exactly this structure (fill the placeholders):

    You are implementing one task of a spec. Your entire context is the task
    file below; do not read other spec artifacts.
    Project root: <absolute path>. Task file: <absolute path to tasks/<slug>.md>.

    Contract — follow in order:
    1. Edit the task file frontmatter: status → inprogress.
    2. Implement the # Tasks checklist. You may ONLY create or modify files
       matching the scope globs in the frontmatter.
    3. Self-verify: run the project's tests/build for your changes. Write the
       # Testing section: the commands you ran, their actual output, and how a
       human can verify.
    4. Append a # Iterations entry: date, what you did, any assumptions made.
    5. Edit the frontmatter: status → verification.

    Gap rule (autonomy: <level>): if the task file lacks information you need —
    low/medium: stop and return the question.
    high: if the decision is clearly logical or simple, decide it and log it
    in # Iterations. If it is architectural, has many caveats, or is likely to
    be discarded: set frontmatter `blocked: <one-line reason>`, set status back
    to todo, append an # Iterations entry with proposed solutions, and return.

    Return a 5-line summary: what changed, test evidence, files touched.

## Rules

- Re-read artifact files before acting on them; they are the database and the
  user may have edited them mid-flight. Never trust conversation memory over
  the file.
- A task sitting in `inprogress` whose `# Iterations` has no entry for the
  current work is a dead sub-agent: re-dispatch it.
- Never halt the sprint for one blocked task; record it in
  `status/README.md` `# Blocked` (reason + proposed solutions) and continue
  with other runnable tasks.
- If the user's instruction contradicts artifact state, ask — don't guess.
