import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import matter from 'gray-matter';
import { createSpec } from '../src/adapters/scaffold.js';
import { parseSpecFrontmatter } from '../src/core/frontmatter.js';

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

  it('escapes a hostile name ("A: B") into frontmatter that parses correctly', () => {
    createSpec(dir, 'hostile', 'A: B');
    const context = readFileSync(join(dir, 'hostile', 'context.md'), 'utf8');
    const fm = matter(context).data;
    expect(fm.name).toBe('A: B');
    expect(parseSpecFrontmatter(context).name).toBe('A: B');
  });

  it('escapes a newline-containing name into frontmatter that still parses', () => {
    const name = 'Multi\nline\nname';
    createSpec(dir, 'multiline', name);
    const context = readFileSync(join(dir, 'multiline', 'context.md'), 'utf8');
    const fm = matter(context).data;
    expect(fm.name).toBe(name);
    expect(parseSpecFrontmatter(context).name).toBe(name);
  });

  it('returns correct relative paths when specsDir has a trailing slash', () => {
    const created = createSpec(`${dir}/`, 'trailing-slash', 'Trailing slash');
    expect(created.sort()).toEqual([
      'trailing-slash/acceptance-criteria.md',
      'trailing-slash/backlog.md',
      'trailing-slash/context.md',
      'trailing-slash/solution.md',
      'trailing-slash/status/README.md',
      'trailing-slash/status/release.md',
      'trailing-slash/tasks/.gitkeep',
    ]);
    expect(existsSync(join(dir, 'trailing-slash', 'context.md'))).toBe(true);
  });
});
