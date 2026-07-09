import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildProgram } from '../src/cli/program.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'spiral-e2e-'));
  process.exitCode = undefined;
});

async function run(args: string[]): Promise<string> {
  const lines: string[] = [];
  const program = buildProgram({ cwd: dir, out: (l) => lines.push(l) });
  program.exitOverride();
  await program.parseAsync(['node', 'spiralspec', ...args]);
  return lines.join('\n');
}

const TASK = `---
name: First task
goal: Do the first thing
ground: null
status: todo
scope:
  - src/first/**
blocked: null
---

# Context
Everything needed.
# Tasks
- [ ] do it
# Iterations

# Testing

`;

describe('end to end', () => {
  it('init → new → task → validate/status/next', async () => {
    await run(['init', '--agent', 'claude,opencode']);
    expect(existsSync(join(dir, '.spiralspec.yml'))).toBe(true);
    expect(existsSync(join(dir, '.claude/skills/spiralspec-implement/SKILL.md'))).toBe(true);
    expect(existsSync(join(dir, '.opencode/commands/spiral-define.md'))).toBe(true);

    await run(['new', 'demo', '--name', 'Demo spec']);
    expect(existsSync(join(dir, 'specs/demo/context.md'))).toBe(true);
    expect(existsSync(join(dir, 'specs/demo/backlog.md'))).toBe(true);

    writeFileSync(join(dir, 'specs/demo/tasks/first-task.md'), TASK, 'utf8');
    writeFileSync(
      join(dir, 'specs/demo/backlog.md'),
      '# Backlog\n\n- [x] first-task — Do the first thing\n- [ ] second-task — Do the second thing later\n',
      'utf8',
    );

    expect(await run(['validate', 'demo'])).toBe('OK');

    const status = JSON.parse(await run(['status', 'demo', '--json']));
    expect(status.phase).toBe('ready');
    expect(status.backlog).toEqual([
      { slug: 'first-task', goal: 'Do the first thing', expanded: true },
      { slug: 'second-task', goal: 'Do the second thing later', expanded: false },
    ]);

    const next = JSON.parse(await run(['next', 'demo', '--json']));
    expect(next.runnable.map((t: { slug: string }) => t.slug)).toEqual(['first-task']);
  });
});
