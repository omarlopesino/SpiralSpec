import { describe, it, expect, beforeEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { buildProgram } from '../src/cli/program.js';

const PROJECT = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'project');

async function run(args: string[], cwd = PROJECT): Promise<string[]> {
  const lines: string[] = [];
  const program = buildProgram({ cwd, out: (l) => lines.push(l) });
  program.exitOverride();
  await program.parseAsync(['node', 'spiralspec', ...args]);
  return lines;
}

describe('cli', () => {
  beforeEach(() => {
    process.exitCode = undefined;
  });

  it('status --json reports phase and counts', async () => {
    const out = JSON.parse((await run(['status', 'demo', '--json'])).join('\n'));
    expect(out.spec).toBe('demo');
    expect(out.phase).toBe('verification'); // setup-db is in verification, which outranks the todo tasks
    expect(out.counts.todo).toBe(2);
    expect(out.invalid).toHaveLength(1);
    expect(out.backlog).toHaveLength(5); // ledger passthrough, incl. the pending 'cleanup' entry
  });

  it('validate reports issues and sets exit code', async () => {
    const out = await run(['validate', 'demo']);
    expect(out.join('\n')).toContain('tasks/broken.md: invalid status: doing');
    expect(process.exitCode).toBe(1);
  });

  it('next --json returns runnable and excluded', async () => {
    const out = JSON.parse((await run(['next', 'demo', '--json'])).join('\n'));
    expect(out.runnable.map((t: { slug: string }) => t.slug)).toEqual(['field-map']);
    expect(out.excluded).toEqual([{ slug: 'migrate-users', reason: 'waiting on ground: field-map' }]);
  });

  it('impact --json with --files', async () => {
    const out = JSON.parse(
      (await run(['impact', 'demo', 'setup-db', '--files', 'db/schema.sql,src/mapping/x.ts', '--json'])).join('\n'),
    );
    expect(out.affected.sort()).toEqual(['field-map', 'migrate-users']);
  });

  it('impact fails loud on a nonexistent task slug', async () => {
    const out = await run(['impact', 'demo', 'ghost', '--files', 'db/schema.sql', '--json']);
    expect(out.join('\n')).toContain('error: task not found: ghost');
    expect(process.exitCode).toBe(1);
  });

  it('fails cleanly on a missing spec', async () => {
    const out = await run(['status', 'ghost']);
    expect(out.join('\n')).toContain('spec not found: ghost');
    expect(process.exitCode).toBe(1);
  });
});
