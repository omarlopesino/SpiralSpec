import type { SpecData } from './types.js';
import { dependents } from './graph.js';
import { fileInScope } from './scope.js';

export interface ImpactResult {
  task: string;
  dependents: string[];
  scopeHits: string[];
  affected: string[];
}

export function impactOf(spec: SpecData, slug: string, changedFiles: string[]): ImpactResult {
  const deps = dependents(spec.tasks, slug);
  const scopeHits = spec.tasks
    .filter((t) => t.slug !== slug && changedFiles.some((f) => fileInScope(f, t.fm.scope)))
    .map((t) => t.slug);
  const affected = [...new Set([...deps, ...scopeHits])];
  return { task: slug, dependents: deps, scopeHits, affected };
}
