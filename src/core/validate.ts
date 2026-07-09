import type { SpecData, ValidationIssue } from './types.js';
import { findCycle, groundRelated } from './graph.js';
import { scopesOverlap } from './scope.js';

const REQUIRED_HEADINGS = ['# Context', '# Tasks', '# Iterations', '# Testing'];

export function validateSpec(spec: SpecData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const inv of spec.invalid) issues.push({ file: inv.file, message: inv.error });

  const slugs = new Set(spec.tasks.map((t) => t.slug));
  for (const t of spec.tasks) {
    for (const g of t.fm.ground ?? []) {
      if (!slugs.has(g)) issues.push({ file: t.file, message: `ground references '${g}' which does not exist` });
    }
    if (t.fm.scope.length === 0) issues.push({ file: t.file, message: 'scope must declare at least one glob' });
    const lines = t.body.split('\n').map((l) => l.trim());
    for (const h of REQUIRED_HEADINGS) {
      if (!lines.includes(h)) issues.push({ file: t.file, message: `missing required section: ${h}` });
    }
  }

  if (spec.backlog !== null && spec.backlog.length > 0) {
    const entries = new Map(spec.backlog.map((e) => [e.slug, e]));
    const fileSlugs = new Set([...spec.tasks.map((t) => t.slug), ...spec.invalid.map((i) => i.slug)]);
    for (const t of spec.tasks) {
      const entry = entries.get(t.slug);
      if (entry === undefined) issues.push({ file: t.file, message: 'task not listed in backlog.md' });
      else if (!entry.expanded) {
        issues.push({ file: 'backlog.md', message: `entry '${t.slug}' has a task file; mark it [x]` });
      }
    }
    for (const e of spec.backlog) {
      if (e.expanded && !fileSlugs.has(e.slug)) {
        issues.push({
          file: 'backlog.md',
          message: `entry '${e.slug}' is marked expanded but tasks/${e.slug}.md is missing`,
        });
      }
    }
  }

  const cycle = findCycle(spec.tasks);
  if (cycle) issues.push({ file: 'tasks/', message: `ground cycle: ${cycle.join(' → ')}` });

  for (let i = 0; i < spec.tasks.length; i++) {
    for (let j = i + 1; j < spec.tasks.length; j++) {
      const a = spec.tasks[i];
      const b = spec.tasks[j];
      if (scopesOverlap(a.fm.scope, b.fm.scope) && !groundRelated(spec.tasks, a.slug, b.slug)) {
        issues.push({
          file: a.file,
          message: `scope overlap between ground-unrelated tasks: ${a.slug} ∩ ${b.slug}`,
        });
      }
    }
  }
  return issues;
}
