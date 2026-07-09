---
id: plan
title: Plan a SpiralSpec spec
description: Read the definition artifacts, challenge the solution, surface gaps, and generate the task breakdown.
args: <spec-slug>
---

# SpiralSpec — Plan

Turn a defined spec into tasks — ledger first, expansion second, always
lazily. Plan what is necessary to start, not everything: undecided details are
decided during implementation or postponed explicitly. When planning resumes
in a later session, `backlog.md` is your starting point — never re-infer the
breakdown from scratch.

## Steps

1. Run `spiralspec status <spec> --json`. Read `context.md`,
   `acceptance-criteria.md`, `solution.md`, and `backlog.md` (unexpanded
   entries = remaining analysis). Note the `autonomy` level.
2. Challenge `solution.md`: contradictions with the acceptance criteria,
   missing references, simpler alternatives. Report findings to the user — the
   user owns the file.
3. Surface gaps using the question protocol below.
4. Draft or extend `backlog.md`: one line per proposed task,
   `- [ ] task-slug — one-line goal`. Present the drafted ledger in your
   message. Verification is offered, never required — scale the stop to the
   autonomy dial:
   - **low**: stop and wait for the user to verify (edit, reorder, delete
     lines) before expanding anything.
   - **medium**: ask one question — proceed with this backlog, or review it
     first? — and follow the answer.
   - **high**: continue immediately; record in `status/README.md`
     `# Next steps` that the ledger is unverified so the user can review or
     refine it later. Never block.
5. Expand entries into `tasks/<slug>.md` using the template below —
   lazily: the user chooses to expand everything, or only what will be
   implemented now, leaving the rest as one-liners for later sessions. Flip
   each expanded entry to `[x]`. Every task starts as `status: backlog`.
6. Run `spiralspec validate <spec>` and fix every issue until it prints OK
   (it also enforces ledger ↔ task-file consistency).
7. Update `status/README.md`: rewrite `# Current state` and `# Next steps`
   (tell the user to review the tasks and flip approved ones
   `backlog → todo`; list unexpanded ledger entries as pending analysis).
8. Present the plan: each task's goal, ground order, and scope. Ask for
   feedback — deeper reshaping (criteria, context, deleting tasks) belongs to
   /spiral:refine.

## Question protocol

Every gap question offers exactly three options:

1. **Decide now** — the answer lands in the relevant artifact.
2. **Assume** — you propose the assumption; if accepted, log it in
   `solution.md` or the affected task's `# Iterations`.
3. **Postpone** — write it into the affected task's frontmatter as
   `blocked: <the open question>`.

Threshold by autonomy: **low** — ask every gap. **medium** — ask only
decisions that are hard to reverse (data models, external interfaces,
security); assume the rest and log. **high** — never wait: assume-and-log when
the choice is clearly logical or simple; otherwise create the task with
`blocked` set and move on.

## Task rules

- The filename is the slug other tasks reference in `ground`.
- `# Context` must be self-sufficient: the implementing sub-agent sees ONLY
  the task file. Include exact file paths, interfaces, and every technical
  criterion it must respect.
- `scope` globs: two tasks may share scope only if one transitively grounds
  the other; `spiralspec validate` enforces this.
- Base tasks (`ground: null`) first; incremental tasks layer on them.
- Right-size the goal: bigger than one phrase, smaller than the whole spec.

## Task template

    ---
    name: <Title of the task>
    goal: >
      <The specific objective this task completes.>
    ground: null            # or [other-task-slug, ...]
    status: backlog
    scope:
      - <glob this task may create/modify>
    blocked: null
    ---

    # Context
    <Minimal self-sufficient context: paths, interfaces, constraints.>

    # Tasks
    - [ ] <technical step>

    # Iterations

    # Testing
