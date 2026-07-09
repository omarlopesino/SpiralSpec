import { describe, it, expect } from 'vitest';
import { validateSpec } from '../src/core/validate.js';
import type { SpecData, TaskData } from '../src/core/types.js';

const BODY = '# Context\nx\n# Tasks\nx\n# Iterations\n\n# Testing\n';

function task(slug: string, over: Partial<TaskData['fm']> = {}, body = BODY): TaskData {
  return {
    slug,
    file: `tasks/${slug}.md`,
    fm: { name: slug, goal: slug, ground: null, status: 'backlog', scope: [`${slug}/**`], blocked: null, complexity: 'medium', ...over },
    body,
  };
}

function spec(
  tasks: TaskData[],
  invalid: SpecData['invalid'] = [],
  backlog: SpecData['backlog'] = null,
): SpecData {
  return { slug: 'demo', dir: '/tmp/demo', fm: { name: 'Demo', autonomy: 'medium' }, backlog, tasks, invalid };
}

describe('validateSpec', () => {
  it('accepts a clean spec', () => {
    expect(validateSpec(spec([task('a'), task('b', { ground: ['a'] })]))).toEqual([]);
  });

  it('reports missing ground references', () => {
    const issues = validateSpec(spec([task('a', { ground: ['ghost'] })]));
    expect(issues).toEqual([{ file: 'tasks/a.md', message: "ground references 'ghost' which does not exist" }]);
  });

  it('reports empty scope', () => {
    const issues = validateSpec(spec([task('a', { scope: [] })]));
    expect(issues[0].message).toBe('scope must declare at least one glob');
  });

  it('reports missing required sections', () => {
    const issues = validateSpec(spec([task('a', {}, '# Context\n# Tasks\n# Iterations\n')]));
    expect(issues).toEqual([{ file: 'tasks/a.md', message: 'missing required section: # Testing' }]);
  });

  it('reports ground cycles', () => {
    const issues = validateSpec(spec([task('a', { ground: ['b'] }), task('b', { ground: ['a'] })]));
    expect(issues.some((i) => i.message.startsWith('ground cycle:'))).toBe(true);
  });

  it('reports scope overlap between ground-unrelated tasks', () => {
    const issues = validateSpec(spec([task('a', { scope: ['src/**'] }), task('b', { scope: ['src/x/**'] })]));
    expect(issues).toEqual([
      { file: 'tasks/a.md', message: 'scope overlap between ground-unrelated tasks: a ∩ b' },
    ]);
  });

  it('allows scope overlap between ground-related tasks', () => {
    const issues = validateSpec(
      spec([task('a', { scope: ['src/**'] }), task('b', { ground: ['a'], scope: ['src/x/**'] })]),
    );
    expect(issues).toEqual([]);
  });

  it('surfaces invalid-parse files', () => {
    const issues = validateSpec(spec([], [{ slug: 'bad', file: 'tasks/bad.md', error: 'invalid status: doing' }]));
    expect(issues).toEqual([{ file: 'tasks/bad.md', message: 'invalid status: doing' }]);
  });

  it('enforces ledger consistency when the backlog has entries', () => {
    const backlog = [
      { slug: 'a', goal: 'A', expanded: true },
      { slug: 'ghost', goal: 'G', expanded: true },
      { slug: 'later', goal: 'L', expanded: false },
    ];
    const issues = validateSpec(spec([task('a'), task('rogue', { scope: ['rogue/**'] })], [], backlog));
    expect(issues).toContainEqual({ file: 'tasks/rogue.md', message: 'task not listed in backlog.md' });
    expect(issues).toContainEqual({
      file: 'backlog.md',
      message: "entry 'ghost' is marked expanded but tasks/ghost.md is missing",
    });
  });

  it('flags an unchecked ledger entry whose task file already exists', () => {
    const issues = validateSpec(spec([task('a')], [], [{ slug: 'a', goal: 'A', expanded: false }]));
    expect(issues).toEqual([{ file: 'backlog.md', message: "entry 'a' has a task file; mark it [x]" }]);
  });

  it('an absent or empty ledger imposes no constraints', () => {
    expect(validateSpec(spec([task('a')], [], null))).toEqual([]);
    expect(validateSpec(spec([task('a')], [], []))).toEqual([]);
  });
});
