import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSpec } from '../src/adapters/scaffold.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'spiral-'));
});

describe('createSpec', () => {
  it('creates the full artifact skeleton', () => {
    const created = createSpec(dir, 'user-migration', 'User migration');
    expect(created.sort()).toEqual([
      'user-migration/acceptance-criteria.md',
      'user-migration/backlog.md',
      'user-migration/context.md',
      'user-migration/solution.md',
      'user-migration/status/README.md',
      'user-migration/status/release.md',
      'user-migration/tasks/.gitkeep',
    ]);
    const context = readFileSync(join(dir, 'user-migration', 'context.md'), 'utf8');
    expect(context).toContain('name: User migration');
    expect(context).toContain('autonomy: medium');
    expect(existsSync(join(dir, 'user-migration', 'tasks'))).toBe(true);
  });

  it('refuses to overwrite an existing spec', () => {
    createSpec(dir, 'x', 'X');
    expect(() => createSpec(dir, 'x', 'X')).toThrow('spec already exists: x');
  });
});
