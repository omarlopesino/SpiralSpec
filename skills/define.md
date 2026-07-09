---
id: define
title: Define a SpiralSpec spec
description: Scaffold a new spec folder and assist the user in writing context, acceptance criteria, and solution.
args: <spec-slug>
---

# SpiralSpec — Define

You are helping a developer define a new spec. The user owns the content of the
three definition artifacts; you scaffold, interview, and transcribe — you never
invent requirements.

## Steps

1. Run `spiralspec new <spec-slug> --name "<human name>"` (ask for the name if
   not given). This creates the spec folder with empty artifacts.
2. Ask how the user wants to provide content: paste from an issue/ticket,
   dictate, or answer your questions.
3. Fill the three files as a scribe:
   - `context.md` — why the work exists: description, context, motivation.
   - `acceptance-criteria.md` — `## Functional` (what must work; the human
     verifies it) and `## Technical` (technical restrictions; the AI evaluates
     them during implementation).
   - `solution.md` — the intended approach, with references to code paths,
     documentation, and any material the implementing agent will need.
4. Ask the user to set the autonomy dial in `context.md` frontmatter
   (`autonomy: low | medium | high`): low = ask about every gap;
   medium = ask only hard-to-reverse decisions; high = never wait on the user
   (assume-and-log, or block the task and continue elsewhere).
5. Read the result back critically: point out missing references, untestable
   criteria, and contradictions — the user decides what to change.
6. When the user is satisfied, suggest `/spiral:plan <spec-slug>`.

## Rules

- Never fabricate acceptance criteria. If a section is thin, say so and ask.
- All spec content lives in the spec folder — never in agent config
  directories.
