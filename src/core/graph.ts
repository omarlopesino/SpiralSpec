import type { TaskData } from './types.js';

export function findCycle(tasks: TaskData[]): string[] | null {
  const deps = new Map(tasks.map((t) => [t.slug, t.fm.ground ?? []]));
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];

  const visit = (slug: string): string[] | null => {
    if (state.get(slug) === 'done') return null;
    if (state.get(slug) === 'visiting') return [...stack.slice(stack.indexOf(slug)), slug];
    state.set(slug, 'visiting');
    stack.push(slug);
    for (const dep of deps.get(slug) ?? []) {
      if (!deps.has(dep)) continue;
      const cycle = visit(dep);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(slug, 'done');
    return null;
  };

  for (const t of tasks) {
    const cycle = visit(t.slug);
    if (cycle) return cycle;
  }
  return null;
}

export function dependents(tasks: TaskData[], slug: string): string[] {
  const out = new Set<string>();
  const queue = [slug];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const t of tasks) {
      if ((t.fm.ground ?? []).includes(current) && !out.has(t.slug)) {
        out.add(t.slug);
        queue.push(t.slug);
      }
    }
  }
  out.delete(slug);
  return [...out];
}

export function groundRelated(tasks: TaskData[], a: string, b: string): boolean {
  return dependents(tasks, a).includes(b) || dependents(tasks, b).includes(a);
}
