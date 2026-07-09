import { describe, it, expect } from 'vitest';
import { parseTaskFile, parseSpecFrontmatter } from '../src/core/frontmatter.js';

const GOOD = `---
name: Create field mapping
goal: Build the mapping module
ground: null
status: backlog
scope:
  - src/mapping/**
blocked: null
---

# Context
x
# Tasks
x
# Iterations
# Testing
`;

describe('parseTaskFile', () => {
  it('parses a valid task file', () => {
    const r = parseTaskFile('create-field-map', 'tasks/create-field-map.md', GOOD);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.task.slug).toBe('create-field-map');
    expect(r.task.fm).toEqual({
      name: 'Create field mapping',
      goal: 'Build the mapping module',
      ground: null,
      status: 'backlog',
      scope: ['src/mapping/**'],
      blocked: null,
      complexity: 'medium',
    });
    expect(r.task.body).toContain('# Context');
  });

  it('parses an explicit complexity', () => {
    const r = parseTaskFile('t', 'tasks/t.md', GOOD.replace('blocked: null', 'blocked: null\ncomplexity: low'));
    expect(r.ok && r.task.fm.complexity).toBe('low');
  });

  it('rejects an invalid complexity', () => {
    const r = parseTaskFile('t', 'tasks/t.md', GOOD.replace('blocked: null', 'blocked: null\ncomplexity: huge'));
    expect(r).toEqual({ ok: false, error: 'invalid complexity: huge' });
  });

  it('coerces a scalar ground into a one-element list', () => {
    const r = parseTaskFile('t', 'tasks/t.md', GOOD.replace('ground: null', 'ground: setup-db'));
    expect(r.ok && r.task.fm.ground).toEqual(['setup-db']);
  });

  it('rejects an invalid status', () => {
    const r = parseTaskFile('t', 'tasks/t.md', GOOD.replace('status: backlog', 'status: doing'));
    expect(r).toEqual({ ok: false, error: 'invalid status: doing' });
  });

  it('rejects missing name', () => {
    const r = parseTaskFile('t', 'tasks/t.md', GOOD.replace('name: Create field mapping\n', ''));
    expect(r).toEqual({ ok: false, error: 'missing required field: name' });
  });

  it('reports broken YAML instead of throwing', () => {
    const r = parseTaskFile('t', 'tasks/t.md', '---\nname: [unclosed\n---\nbody');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/invalid frontmatter/);
  });
});

describe('parseSpecFrontmatter', () => {
  it('parses name and autonomy', () => {
    const fm = parseSpecFrontmatter('---\nname: My spec\nautonomy: high\n---\n# Context');
    expect(fm).toEqual({ name: 'My spec', autonomy: 'high', created: undefined });
  });

  it('defaults autonomy to medium', () => {
    expect(parseSpecFrontmatter('---\nname: X\n---\n').autonomy).toBe('medium');
  });
});
