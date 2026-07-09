import { describe, it, expect } from 'vitest';
import { impactOf } from '../src/core/impact.js';
import type { SpecData, TaskData } from '../src/core/types.js';

function task(slug: string, over: Partial<TaskData['fm']> = {}): TaskData {
  return {
    slug,
    file: `tasks/${slug}.md`,
    fm: { name: slug, goal: slug, ground: null, status: 'todo', scope: [`${slug}/**`], blocked: null, complexity: 'medium', ...over },
    body: '',
  };
}

const SPEC: SpecData = {
  slug: 'demo',
  dir: '/tmp/demo',
  fm: { name: 'Demo', autonomy: 'medium' },
  backlog: null,
  tasks: [
    task('setup-db', { scope: ['db/**'] }),
    task('field-map', { scope: ['src/mapping/**'] }),
    task('migrate', { ground: ['setup-db', 'field-map'], scope: ['src/migrate/**'] }),
  ],
  invalid: [],
};

describe('impactOf', () => {
  it('unions transitive dependents and scope hits', () => {
    const r = impactOf(SPEC, 'setup-db', ['db/schema.sql', 'src/mapping/index.ts']);
    expect(r.dependents).toEqual(['migrate']);
    expect(r.scopeHits).toEqual(['field-map']);
    expect(r.affected.sort()).toEqual(['field-map', 'migrate']);
  });

  it('excludes the task itself from scope hits', () => {
    const r = impactOf(SPEC, 'setup-db', ['db/schema.sql']);
    expect(r.scopeHits).toEqual([]);
    expect(r.affected).toEqual(['migrate']);
  });

  it('handles empty changed files', () => {
    const r = impactOf(SPEC, 'field-map', []);
    expect(r).toEqual({ task: 'field-map', dependents: ['migrate'], scopeHits: [], affected: ['migrate'] });
  });
});
