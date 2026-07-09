import type { SpecData, TaskData, TaskStatus } from './types.js';
import { scopesOverlap } from './scope.js';

export interface Exclusion { slug: string; reason: string; }
export interface NextResult { runnable: TaskData[]; excluded: Exclusion[]; }

const DEP_MET: readonly TaskStatus[] = ['verification', 'release', 'done'];

export function nextTasks(spec: SpecData): NextResult {
  const bySlug = new Map(spec.tasks.map((t) => [t.slug, t]));
  const inprogress = spec.tasks.filter((t) => t.fm.status === 'inprogress');
  const runnable: TaskData[] = [];
  const excluded: Exclusion[] = [];

  for (const t of spec.tasks) {
    if (t.fm.status !== 'todo' && t.fm.status !== 'inprogress') continue;
    if (t.fm.blocked) {
      excluded.push({ slug: t.slug, reason: `blocked: ${t.fm.blocked}` });
      continue;
    }
    const unmet = (t.fm.ground ?? []).filter((g) => {
      const dep = bySlug.get(g);
      return dep === undefined || !DEP_MET.includes(dep.fm.status);
    });
    if (unmet.length > 0) {
      excluded.push({ slug: t.slug, reason: `waiting on ground: ${unmet.join(', ')}` });
      continue;
    }
    const clash = inprogress.find((p) => p.slug !== t.slug && scopesOverlap(p.fm.scope, t.fm.scope));
    if (clash) {
      excluded.push({ slug: t.slug, reason: `scope conflict with inprogress: ${clash.slug}` });
      continue;
    }
    runnable.push(t);
  }
  return { runnable, excluded };
}
