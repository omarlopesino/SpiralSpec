import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { loadSpec, listSpecs } from '../src/adapters/fs.js';
import { loadConfig } from '../src/adapters/config.js';

const PROJECT = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'project');
const SPECS = join(PROJECT, 'specs');

describe('loadConfig', () => {
  it('reads .spiralspec.yml including the models mapping', () => {
    expect(loadConfig(PROJECT)).toEqual({
      specsRoot: 'specs',
      agents: ['claude'],
      models: { low: 'haiku', high: 'opus' },
    });
  });
  it('defaults when the file is absent', () => {
    expect(loadConfig('/nonexistent')).toEqual({ specsRoot: 'specs', agents: [], models: {} });
  });
});

describe('loadSpec', () => {
  it('loads tasks, backlog, and reports invalid files', () => {
    const spec = loadSpec(SPECS, 'demo');
    expect(spec.fm).toEqual({ name: 'Demo migration', autonomy: 'high', created: '2026-07-08' });
    expect(spec.tasks.map((t) => t.slug).sort()).toEqual(['field-map', 'migrate-users', 'setup-db']);
    expect(spec.invalid).toEqual([{ slug: 'broken', file: 'tasks/broken.md', error: 'invalid status: doing' }]);
    expect(spec.backlog).toHaveLength(5);
    expect(spec.backlog![4]).toEqual({
      slug: 'cleanup',
      goal: 'Remove the legacy tables once migration is verified',
      expanded: false,
    });
  });
  it('throws for a missing spec', () => {
    expect(() => loadSpec(SPECS, 'ghost')).toThrow('spec not found: ghost');
  });
});

describe('listSpecs', () => {
  it('lists spec slugs', () => {
    expect(listSpecs(SPECS)).toEqual(['demo']);
  });
});
