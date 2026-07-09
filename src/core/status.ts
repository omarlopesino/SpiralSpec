import type { BacklogEntry, SpecData, TaskData, TaskStatus } from './types.js';
import { TASK_STATUSES } from './types.js';

export type SpecPhase = 'definition' | 'planning' | 'ready' | 'implementation' | 'verification' | 'release' | 'complete';

export function derivePhase(tasks: TaskData[]): SpecPhase {
  if (tasks.length === 0) return 'definition';
  const has = (s: TaskStatus) => tasks.some((t) => t.fm.status === s);
  if (tasks.every((t) => t.fm.status === 'done')) return 'complete';
  if (has('inprogress')) return 'implementation';
  if (has('verification')) return 'verification';
  if (has('release')) return 'release';
  if (has('todo')) return 'ready';
  return 'planning';
}

export interface SpecStatusReport {
  spec: string;
  name: string;
  autonomy: string;
  phase: SpecPhase;
  counts: Record<TaskStatus, number>;
  backlog: BacklogEntry[] | null;
  tasks: Array<{ slug: string; name: string; status: TaskStatus; blocked: string | null; ground: string[] | null }>;
  invalid: Array<{ file: string; error: string }>;
}

export function buildStatusReport(spec: SpecData): SpecStatusReport {
  const counts = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0])) as Record<TaskStatus, number>;
  for (const t of spec.tasks) counts[t.fm.status]++;
  return {
    spec: spec.slug,
    name: spec.fm.name,
    autonomy: spec.fm.autonomy,
    phase: derivePhase(spec.tasks),
    counts,
    backlog: spec.backlog,
    tasks: spec.tasks.map((t) => ({
      slug: t.slug,
      name: t.fm.name,
      status: t.fm.status,
      blocked: t.fm.blocked,
      ground: t.fm.ground,
    })),
    invalid: spec.invalid.map((i) => ({ file: i.file, error: i.error })),
  };
}
