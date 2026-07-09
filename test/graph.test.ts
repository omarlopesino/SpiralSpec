import { describe, it, expect } from 'vitest';
import { findCycle, dependents, groundRelated } from '../src/core/graph.js';
import type { TaskData } from '../src/core/types.js';

function task(slug: string, ground: string[] | null): TaskData {
  return {
    slug,
    file: `tasks/${slug}.md`,
    fm: { name: slug, goal: slug, ground, status: 'backlog', scope: [`${slug}/**`], blocked: null },
    body: '',
  };
}

describe('findCycle', () => {
  it('returns null for a DAG', () => {
    expect(findCycle([task('a', null), task('b', ['a']), task('c', ['a', 'b'])])).toBeNull();
  });
  it('finds a direct cycle', () => {
    const c = findCycle([task('a', ['b']), task('b', ['a'])]);
    expect(c).not.toBeNull();
    expect(c![0]).toBe(c![c!.length - 1]);
  });
  it('ignores unknown ground refs', () => {
    expect(findCycle([task('a', ['ghost'])])).toBeNull();
  });
});

describe('dependents', () => {
  it('collects transitive dependents', () => {
    const tasks = [task('a', null), task('b', ['a']), task('c', ['b']), task('d', null)];
    expect(dependents(tasks, 'a').sort()).toEqual(['b', 'c']);
    expect(dependents(tasks, 'd')).toEqual([]);
  });
  it('never includes the queried slug in its own dependents (cyclic input)', () => {
    const tasks = [task('a', ['b']), task('b', ['a'])];
    expect(dependents(tasks, 'a')).toEqual(['b']);
    expect(groundRelated(tasks, 'a', 'a')).toBe(false);
  });
});

describe('groundRelated', () => {
  const tasks = [task('a', null), task('b', ['a']), task('c', null)];
  it('true for ancestor/descendant either direction', () => {
    expect(groundRelated(tasks, 'a', 'b')).toBe(true);
    expect(groundRelated(tasks, 'b', 'a')).toBe(true);
  });
  it('false for unrelated tasks', () => {
    expect(groundRelated(tasks, 'a', 'c')).toBe(false);
  });
});
