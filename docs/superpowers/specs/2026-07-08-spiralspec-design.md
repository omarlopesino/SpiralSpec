# SpiralSpec — Design

**Date:** 2026-07-08
**Status:** Approved by user (brainstorming session)
**Audience:** Professional developers and software engineers (primary); vibe coders (secondary)

## 1. Problem

Existing Spec-Driven Development tools (spec-kit, OpenSpec) are cascade-shaped:

- They require exhaustive up-front analysis before any implementation. Spec-kit's planning chain reads ~50 KB of instructions before a line of code; tokens are often exhausted before implementation starts.
- Planning artifacts are generated once and never updated. Decisions that must be made mid-implementation (because the design turned out wrong) have no home.
- They generate exhaustive requirement lists that exist only for the tool's own consumption.
- Sub-agents are misused or absent (spec-kit disabled them after context-explosion problems), wasting the most valuable part of an agent's context: the beginning.

Cascade fails in real software for a known reason: it is impossible to anticipate every case of a task up front. Cascade-shaped SDD inherits that failure.

## 2. Goals

- Agile SDD: specs are composed, implemented, verified, and deployed individually or in chunks. Obstacles never halt a sprint — blocked work is recorded and the agent continues elsewhere.
- Complete-but-not-exhaustive planning: a spec has all the information needed to *start* (guardrails), not every detail. Undecided points are decided along the way, interactively or autonomously.
- Specs are living artifacts, updated at every phase — including acceptance criteria and context when verification proves them wrong.
- Token-frugal: agents query deterministic state instead of re-reading artifacts; instruction surface stays small.
- Artifacts are AI-scaffolded but human-edited, agent-agnostic, human-readable, and versioned with the code.
- Works on greenfield and brownfield projects.
- Tasks execute in fresh sub-agent contexts, in parallel when safe.
- Developers can compose their own workflows from the provided primitives.

## 3. Decisions

Recorded decisions from the brainstorming session:

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | Delivery mechanism | npm package: minimal deterministic CLI + agent-agnostic skill pack | Parallel file-claims need deterministic validation (LLMs cannot guarantee glob disjointness); JSON state queries fix token burn; adapters make new agents cheap. |
| D2 | Sub-agent concurrency | Parallel from day one | Core value proposition; `ground` gives a dependency graph, `scope` gives safety. |
| D3 | Isolation mechanism | File claims (`scope` frontmatter, disjoint globs) in a shared worktree | Agent-agnostic, no merge machinery. Tasks with overlapping scopes serialize. Worktree escape hatch deferred. |
| D4 | Artifact location | Configurable root via `.spiralspec.yml`, default `specs/` | Never inside `.claude/` or `.opencode/` — artifacts must be readable by any agent and any human. |
| D5 | Task lifecycle | `backlog → todo → inprogress → verification → release → done` | `release` = human-verified, pending deployment steps; `done` = deployed and closed. Blocked is a frontmatter field, not a seventh status. |
| D6 | Question dial | `autonomy: low\|medium\|high` in spec frontmatter, overridable live in-session | Per-spec trust levels; a risky migration and routine CRUD deserve different treatment. |
| D7 | Checklist | The checklist **is** the user-authored `acceptance-criteria.md`. No generated checklist artifact. | The developer knows the project constraints and the client's needs better than any generated re-derivation. |
| D8 | Whole-plan re-evaluation | Not in MVP. Coherence checking is distributed (plan challenges solution; verify checks work against criteria). | Standing audit commands invite ritual token burn. May be added later (e.g. `plan --audit`) if drift proves painful in practice. |
| D9 | Skill updates | Idempotent installer with checksum manifest | Re-running install/update refreshes managed files; hand-edited managed files are warn-and-skip; user-authored workflows are never touched. |
| D10 | Sub-agent reports | Sub-agents never write status reports; the orchestrator does | A fresh-context reporter plus the "write for a reader who wasn't here" rule counters context contamination. |

## 4. Architecture

Two layers with a hard boundary: a deterministic state machine below, LLM workflow above.

```
spiralspec (npm, TypeScript, MIT, open source)
│
├─ CLI — the state layer (no AI, no network; pure file parsing)
│   ├─ spiralspec init [--agent claude,opencode]   scaffold specs root, write .spiralspec.yml,
│   │                                              install/update skill pack
│   ├─ spiralspec new <spec-name>                  scaffold one spec folder with empty artifacts
│   ├─ spiralspec validate <spec>                  frontmatter schema, ground-cycle detection,
│   │                                              scope-claim overlap detection
│   ├─ spiralspec status <spec> [--json]           whole-spec state: tasks × statuses × blockers
│   ├─ spiralspec next <spec> [--json]             runnable set: status todo/inprogress, deps met,
│   │                                              scope disjoint from all inprogress tasks
│   └─ spiralspec impact <spec> <task>             blast radius: transitive ground-descendants ∪
│         [--files a,b | git diff] [--json]        tasks whose scope intersects the changed files
│
└─ Skill pack — the workflow layer (agent-neutral markdown source)
    ├─ skills: define, plan, implement, verify, release  (one per verb)
    └─ adapters render per agent: .claude/skills + commands, .opencode/commands
```

### Clean-architecture layout

- `src/core/` — domain: `Spec`, `Task`, `Status`, `Scope` entities; frontmatter parsing, validation, dependency graph, glob-intersection. Pure functions, zero I/O.
- `src/adapters/` — filesystem read/write, and one agent adapter per target (claude, opencode). A new agent = one new adapter file.
- `src/cli/` — thin command shell mapping CLI verbs to core use-cases.

### Two structural principles

1. **The markdown files ARE the database.** No hidden state, lockfiles, or sidecars for spec state (the installer's `.spiralspec/manifest.json` tracks only skill-pack checksums, never spec state). Task frontmatter is the single source of truth. The CLI only reads and reports; agents and humans write. This enforces "AI-scaffolded, human-edited" and keeps everything git-diffable.
2. **Agents never enumerate state in-context.** Every skill begins by querying the CLI (`status --json`, ~200 tokens) instead of reading N task files. State questions cost JSON, not prose.

### Installer / update contract (D9)

- Generated files carry a header marker: `<!-- generated by spiralspec vX.Y.Z — do not edit; see docs to customize -->`.
- `.spiralspec/manifest.json` stores a checksum per managed file.
- On `init`/`update`: unchanged files are silently replaced by the new version; hand-edited managed files trigger warn-and-skip (override with `--force`); files without a marker (user-authored workflows) are never touched.
- Upgrade flow: `npm i -D spiralspec@latest && spiralspec update`.

## 5. Artifact Schema

```
specs/                          ← root, configurable in .spiralspec.yml (D4)
└─ user-migration/              ← one spec = one deliverable chunk; folder name = slug
   ├─ context.md                why the work exists (human-written; carries spec frontmatter)
   ├─ acceptance-criteria.md    functional + technical criteria (human-written; D7)
   ├─ solution.md               approach + references to code/docs (human-written, AI-challenged)
   ├─ tasks/
   │  └─ <task-slug>.md         one file per task (AI-scaffolded at plan time)
   ├─ status/
   │  ├─ README.md              living status report, written for outsiders
   │  └─ release.md             accumulated deploy/build/manual steps
   └─ design.md                 optional; mermaid; only when something implemented needs explaining
```

### Spec frontmatter (in `context.md`)

```yaml
---
name: User migration to new auth service
autonomy: medium        # low | medium | high (D6)
created: 2026-07-08
---
```

Spec-level status is **derived, never stored**: the CLI computes the phase from task states (all backlog → planning; any inprogress → implementation; all done → complete; …). Stored aggregates go stale; derived ones cannot.

### The three human artifacts

- `context.md` — description, context, motivation. Explains why the work is needed.
- `acceptance-criteria.md` — two sections. **Functional criteria**: what must work for the spec to be complete (verified by the human). **Technical criteria**: technical restrictions (evaluated by the AI).
- `solution.md` — the intended solution, with references to code, documentation, and any material the AI needs. The plan skill challenges it for contradictions, better alternatives, and refinement — but the human owns it.

### Task frontmatter

```yaml
---
name: Create field mapping module
goal: >
  A module that infers old→new field mappings from the two schemas,
  with explicit overrides for ambiguous fields.
ground: null                    # or [task-slug, ...] — tasks that must be done first.
                                # null = base task; non-empty = incremental task.
status: backlog                 # backlog | todo | inprogress | verification | release | done (D5)
scope:                          # file claim: globs this task may create/modify (D3).
  - src/migration/mapping/**    # overlap rule: two tasks may share scope only if one
  - test/migration/mapping/**   #   transitively grounds the other (they can never run
                                #   concurrently). Overlap between ground-unrelated tasks
                                #   is a `validate` error — they could be dispatched in
                                #   parallel. `next` additionally serializes at runtime by
                                #   excluding tasks overlapping any inprogress scope.
blocked: null                   # or a one-line reason. Set when the agent stops autonomously
                                # or a gap is postponed. Excluded from `next` until cleared.
---
```

Status semantics:

- `backlog` — defined by the AI, not yet approved by the developer.
- `todo` — approved by the user, ready to start.
- `inprogress` — being implemented by the AI.
- `verification` — self-verified by the AI; awaiting human verification.
- `release` — human-verified; deployment steps from `release.md` pending.
- `done` — deployed and closed; no further action.

The AI may only implement tasks in `todo`/`inprogress`. All other transitions require user action (directly editing frontmatter or telling the agent — both are equivalent, because files are the database).

### Task body sections

- `# Context` — minimal, self-contained context. Written at plan time to be sufficient on its own: it is the entire world of the implementing sub-agent.
- `# Tasks` — technical checklist. Updatable with future feedback.
- `# Iterations` — append-only log of how the task evolved and why (including assumptions made autonomously).
- `# Testing` — how the AI verified the work, with real evidence (commands run, output), and how the human can verify it.

### status/README.md skeleton

Written by the orchestrator (never by task sub-agents, D10), under the rule: *write for a reader who has not seen this conversation.*

- `# Current state` — overall report of where the spec stands.
- `# Next steps` — implement tasks, backlog refinement, release steps, or "user must unblock X".
- `# Completed tasks` — one subsection per completed task: how it was done, how to verify it, caveats. Caveats are only written for completed tasks.
- `# Blocked` — tasks stopped autonomously: why, plus proposed solutions.

### Deliberate absences

- No generated requirements/checklist artifact (D7).
- No archive/delta ceremony: a finished spec sits in `specs/` as documentation or is deleted; the folder is self-contained either way.
- No constitution file: project conventions belong to CLAUDE.md / AGENTS.md in the target platforms. Spec-workflow-specific conventions may become a small config addition later.

## 6. Skills and Phase Mapping

Five verbs are the entire surface. Phases are states of the artifacts, not separate tools.

| Skill | Phases covered | Behavior |
|---|---|---|
| `/spiral:define <name>` | Definition | Runs `spiralspec new`; assists the user (interview, paste from issue, draft prose) in filling context.md, acceptance-criteria.md, solution.md. The user owns the content. |
| `/spiral:plan <spec>` | Plan, Plan review | Reads the three human artifacts; challenges solution.md; asks gap questions per the dial; generates `tasks/*.md` (all `backlog`) with self-sufficient `# Context`, disjoint `scope`s, and correct `ground`; updates status/README next steps. Re-run with feedback to refine. |
| `/spiral:implement <spec> [task]` | Implementation | The "continue" verb. With a task argument: run that task, or explain precisely why it is not runnable (blocked by X / scope conflict with inprogress Y / still in backlog). Without: pick from `spiralspec next`, preferring inprogress resumes, then base, then incremental; at `autonomy: high`, continue until nothing is runnable. |
| `/spiral:verify <spec> [task]` | Verification | Processes user verdicts. Pass → `release`. Feedback → `spiralspec impact` (changed files from `--files` or, by default, `git diff --name-only` since the task left `todo`) to bound the blast radius, then update only the affected set: the task, dependent tasks, ground tasks, and — if the user agrees the spec itself was wrong — acceptance-criteria.md or context.md. |
| `/spiral:release <spec> [task]` | Deployment, Completion | Answers deployment questions from release.md; on user confirmation flips `release → done`; updates status/README and release.md with completion details as the user decides. |

### The question protocol (all skills)

Gap questions go through the platform's interactive question tool. Every question offers the same three answer shapes:

1. **Decide now** — user answers; the answer lands in the relevant artifact.
2. **Assume this** — the agent proposes an assumption; if accepted, it is logged (in `# Iterations` or solution.md).
3. **Postpone** — the open question is written into the affected task as `blocked: <question>`, visible in the artifact rather than lost in chat scroll.

The autonomy dial sets the asking threshold:

- `low` — ask about every gap (assisted development).
- `medium` — ask only about decisions that are hard to reverse.
- `high` — never block on the user: assume-and-log when the solution is clearly logical or simple; set `blocked` and move on when the gap is architectural, has too many caveats, or the work would likely be discarded. The block reason and proposed solutions go to status/README `# Blocked`.

The user can override the dial live in-session ("be more autonomous") without editing frontmatter.

### Implementation loop detail

```
orchestrator: spiralspec next --json
  → dispatch each runnable task to a sub-agent (parallel where the platform
    supports it; sequential fallback — safety comes from disjoint scopes,
    not from the dispatch mechanism)

sub-agent contract (context = the task file, nothing else):
  1. flip status → inprogress
  2. implement within the declared scope
  3. self-verify; write # Testing with real evidence (commands, output)
  4. append # Iterations entry (including any logged assumptions)
  5. flip status → verification

orchestrator afterwards:
  - updates status/README.md and status/release.md (D10)
  - re-queries next; continues or reports
```

## 7. Error Handling

Principle: **the CLI fails loud; the workflow degrades soft.**

CLI (loud):

- `validate` errors are hard failures with exact locations: `tasks/migrate-users.md: ground references 'setup-db' which does not exist`; `scope overlap between ground-unrelated tasks: create-field-map ∩ migrate-users on src/migration/**`. Exit codes make it CI-able.
- Malformed frontmatter never crashes `status`: the task is reported as `invalid` with its parse error — a half-broken spec must remain inspectable.

Workflow (soft):

- Files re-read before every action; conversation memory is never trusted over the artifact (files are the database; humans edit them mid-flight).
- A dead sub-agent leaves its task `inprogress` with no matching `# Iterations` entry; the implement skill detects and re-dispatches on resume.
- A `blocked` task is skipped, reported, and the sprint continues. Nothing halts.
- Contradictory state (user says "done", file says `backlog`) → ask, don't guess.

## 8. Testing Strategy

- **Core**: vitest unit tests on the pure domain — frontmatter parsing, ground-cycle detection, glob-intersection/scope-overlap (the subtlest code in the MVP; densest tests), `next` computation, `impact` computation.
- **CLI**: golden-file integration tests — commands run against fixture spec folders; JSON output snapshotted.
- **Skills**: dogfooding — SpiralSpec's own remaining development becomes the first SpiralSpec-managed spec as soon as `init`/`new`/`validate` exist. Real use in Claude Code and OpenCode is the acceptance test; the idempotent installer (D9) exists precisely to iterate on prompt quality.

## 9. MVP Cut-Line

**In:**

- npm package (TypeScript, open source).
- Six CLI commands: `init`, `new`, `validate`, `status`, `next`, `impact`.
- Five skills: define, plan, implement, verify, release.
- Two agent adapters: Claude Code, OpenCode.
- Artifact schema as specified; parallel dispatch with scope claims; idempotent installer.

**Out (deferred; the architecture accommodates all of these):**

- Additional agent adapters (Cursor, Codex, Gemini, …) — one adapter file each.
- Whole-plan audit (`plan --audit`) — pending real-world evidence of drift (D8).
- Worktree isolation escape hatch for tasks whose scopes cannot be separated.
- Conventions/config extensions (constitution-like).
- Any TUI or web dashboard.
