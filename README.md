# SpiralSpec

Agile Spec-Driven Development for coding agents. Iterative and incremental —
plan what is necessary to start, decide the rest along the way, and keep the
spec alive while you build.

Why another SDD tool? Existing ones are cascade-shaped: exhaustive up-front
analysis, artifacts generated once and never updated, tokens burned before a
line of code. SpiralSpec is built on the opposite bet: **you cannot
anticipate every case of a task up front**, so the tooling must welcome
mid-flight decisions instead of fighting them.

## How it works

- **Markdown is the database.** A spec is a folder (`specs/<slug>/`) of plain
  markdown: `context.md`, `acceptance-criteria.md`, `solution.md` (written by
  you), `backlog.md` (the planning ledger: proposed tasks as one-liners,
  reviewed by you as much as you choose), `tasks/*.md` (expanded by the agent,
  approved by you), `status/README.md` + `status/release.md` (living
  reports). AI-scaffolded, human-edited, agent-agnostic.
- **Plan lazily, resume cheaply.** The agent drafts the ledger first and
  shows it to you; whether planning stops for your verification follows the
  autonomy dial — required at `low`, one question at `medium`, never blocking
  at `high` (checks are offered, not required). Expand and implement one
  task today, keep the rest as one-liners — a later session resumes from the
  ledger instead of re-inferring the breakdown.
- **Feedback goes full circle.** `/spiral:refine` applies post-plan feedback
  anywhere upstream: the ledger, not-started tasks (edit or delete),
  `inprogress` tasks (recorded as a new iteration), and — with your consent —
  the acceptance criteria and context themselves.
- **A deterministic CLI answers state questions** so agents don't waste
  tokens re-deriving them: `validate` (schema, dependency cycles, scope
  claims), `status` (derived phase, per-task states), `next` (what can run
  right now), `impact` (blast radius of a change).
- **Tasks run in parallel sub-agents, safely.** Each task declares a `scope`
  (file-claim globs). Ground-unrelated tasks must have disjoint scopes —
  validated, not hoped for. Each sub-agent's context is exactly one task file.
- **Complexity-aware model dispatch (opt-in).** Tasks carry a
  `complexity: low | medium | high` hint assigned at plan time. Add a
  `models:` mapping to `.spiralspec.yml` (e.g. `low: haiku`, `high: opus`)
  and the implement skill dispatches each sub-agent on the matching model;
  no mapping means everything inherits your session model. Blocked work
  escalates one tier before giving up.
- **An autonomy dial per spec** (`low | medium | high`) controls how much the
  agent asks vs. decides. Gaps are decided now, assumed-and-logged, or
  postponed as `blocked` — visible in the artifact, never lost in chat.
- **Nothing halts the sprint.** A blocked task is recorded with proposed
  solutions and the agent continues with other runnable work.

## Install

```bash
npm install -D spiralspec
npx spiralspec init --agent claude,opencode
```

This scaffolds `.spiralspec.yml`, a `specs/` root, and installs six
commands/skills into your agent(s): `/spiral:define`, `/spiral:plan`,
`/spiral:refine`, `/spiral:implement`, `/spiral:verify`, `/spiral:release`
(OpenCode: `/spiral-define`, …).

Only `define → plan` is strictly ordered. After plan, `refine` and
`implement` interleave freely; `verify` and `release` follow `implement`
**per task** — one task can be in verification while its siblings are still
being implemented or the backlog is being refined. Calling a verb "too early"
degrades to an explanation, never a broken state.

Upgrading: `npm i -D spiralspec@latest && npx spiralspec update`. Managed
files you have hand-edited are skipped with a warning (`--force` overwrites);
your own workflow files are never touched.

## Task lifecycle

`backlog` (AI-proposed) → `todo` (you approved) → `inprogress` →
`verification` (AI self-verified; you verify) → `release` (verified; deploy
steps pending) → `done`.

The AI only implements `todo`/`inprogress` tasks. Every other transition is
yours — flip the frontmatter yourself or tell the agent; both work.

## CLI

```bash
spiralspec new <slug> --name "Human name"   # scaffold a spec folder
spiralspec validate <spec>                  # schema, cycles, scope claims
spiralspec status <spec> --json             # derived phase + task states
spiralspec next <spec> --json               # runnable set
spiralspec impact <spec> <task> --files a,b # blast radius
spiralspec init | update [--force]          # install/refresh the skill pack
```

## License

LGPL-3.0-only
