import { describe, it, expect } from 'vitest';
import { nextTasks } from '../src/core/next.js';
import type { SpecData, TaskData } from '../src/core/types.js';

function task(slug: string, over: Partial<TaskData['fm']> = {}): TaskData {
  return {
    slug,
    file: `tasks/${slug}.md`,
    fm: { name: slug, goal: slug, ground: null, status: 'todo', scope: [`${slug}/**`], blocked: null, ...over },
    body: '',
  };
}

function spec(tasks: TaskData[]): SpecData {
  return { slug: 'demo', dir: '/tmp/demo', fm: { name: 'Demo', autonomy: 'medium' }, backlog: null, tasks, invalid: [] };
}

describe('nextTasks', () => {
  it('returns todo and inprogress tasks with met deps and free scopes', () => {
    const r = nextTasks(spec([task('a', { status: 'inprogress' }), task('b'), task('c', { status: 'backlog' })]));
    expect(r.runnable.map((t) => t.slug)).toEqual(['a', 'b']);
    expect(r.excluded).toEqual([]);
  });

  it('excludes blocked tasks with the reason', () => {
    const r = nextTasks(spec([task('a', { blocked: 'waiting for API keys' })]));
    expect(r.runnable).toEqual([]);
    expect(r.excluded).toEqual([{ slug: 'a', reason: 'blocked: waiting for API keys' }]);
  });

  it('excludes tasks with unmet ground', () => {
    const r = nextTasks(spec([task('dep', { status: 'todo' }), task('a', { ground: ['dep'] })]));
    expect(r.excluded).toContainEqual({ slug: 'a', reason: 'waiting on ground: dep' });
  });

  it('counts verification/release/done as met ground', () => {
    const r = nextTasks(spec([task('dep', { status: 'verification' }), task('a', { ground: ['dep'] })]));
    expect(r.runnable.map((t) => t.slug)).toContain('a');
  });

  it('checks ground before scope: an inprogress ground dep excludes as unmet ground', () => {
    const r = nextTasks(
      spec([
        task('a', { status: 'inprogress', scope: ['src/a/**'] }),
        task('b', { scope: ['src/a/sub/**'], ground: ['a'] }),
      ]),
    );
    expect(r.excluded).toContainEqual({ slug: 'b', reason: 'waiting on ground: a' });
  });

  it('excludes tasks whose scope clashes with an unrelated inprogress task', () => {
    const r = nextTasks(
      spec([
        task('a', { status: 'inprogress', scope: ['shared/**'] }),
        task('b', { scope: ['shared/sub/**'], ground: null }),
      ]),
    );
    expect(r.excluded).toContainEqual({ slug: 'b', reason: 'scope conflict with inprogress: a' });
  });
});
