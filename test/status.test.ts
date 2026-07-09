import { describe, it, expect } from 'vitest';
import { derivePhase, buildStatusReport } from '../src/core/status.js';
import type { SpecData, TaskData, TaskStatus } from '../src/core/types.js';

function task(slug: string, status: TaskStatus): TaskData {
  return {
    slug,
    file: `tasks/${slug}.md`,
    fm: { name: slug, goal: slug, ground: null, status, scope: [`${slug}/**`], blocked: null },
    body: '',
  };
}

describe('derivePhase', () => {
  it.each([
    [[], 'definition'],
    [['backlog', 'backlog'], 'planning'],
    [['backlog', 'todo'], 'ready'],
    [['todo', 'inprogress'], 'implementation'],
    [['done', 'verification'], 'verification'],
    [['done', 'release'], 'release'],
    [['done', 'done'], 'complete'],
    [['backlog', 'done'], 'planning'],
  ] as Array<[TaskStatus[], string]>)('%j → %s', (statuses, phase) => {
    expect(derivePhase(statuses.map((s, i) => task(`t${i}`, s)))).toBe(phase);
  });
});

describe('buildStatusReport', () => {
  it('aggregates counts, tasks, and invalid files', () => {
    const spec: SpecData = {
      slug: 'demo',
      dir: '/tmp/demo',
      fm: { name: 'Demo', autonomy: 'high' },
      backlog: [{ slug: 'later', goal: 'Do later', expanded: false }],
      tasks: [task('a', 'todo'), task('b', 'done')],
      invalid: [{ slug: 'bad', file: 'tasks/bad.md', error: 'boom' }],
    };
    const r = buildStatusReport(spec);
    expect(r.spec).toBe('demo');
    expect(r.phase).toBe('ready');
    expect(r.backlog).toEqual([{ slug: 'later', goal: 'Do later', expanded: false }]);
    expect(r.counts.todo).toBe(1);
    expect(r.counts.done).toBe(1);
    expect(r.counts.backlog).toBe(0);
    expect(r.tasks[0]).toEqual({ slug: 'a', name: 'a', status: 'todo', blocked: null, ground: null });
    expect(r.invalid).toEqual([{ file: 'tasks/bad.md', error: 'boom' }]);
  });
});
