import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { InvalidTask, SpecData, TaskData } from '../core/types.js';
import { parseSpecFrontmatter, parseTaskFile } from '../core/frontmatter.js';
import { parseBacklog } from '../core/backlog.js';

export function loadSpec(specsDir: string, slug: string): SpecData {
  const dir = join(specsDir, slug);
  const contextPath = join(dir, 'context.md');
  if (!existsSync(contextPath)) throw new Error(`spec not found: ${slug}`);
  const fm = parseSpecFrontmatter(readFileSync(contextPath, 'utf8'));
  const backlogPath = join(dir, 'backlog.md');
  const backlog = existsSync(backlogPath) ? parseBacklog(readFileSync(backlogPath, 'utf8')) : null;

  const tasks: TaskData[] = [];
  const invalid: InvalidTask[] = [];
  const tasksDir = join(dir, 'tasks');
  if (existsSync(tasksDir)) {
    for (const entry of readdirSync(tasksDir).filter((f) => f.endsWith('.md')).sort()) {
      const taskSlug = basename(entry, '.md');
      const file = `tasks/${entry}`;
      const result = parseTaskFile(taskSlug, file, readFileSync(join(tasksDir, entry), 'utf8'));
      if (result.ok) tasks.push(result.task);
      else invalid.push({ slug: taskSlug, file, error: result.error });
    }
  }
  return { slug, dir, fm, backlog, tasks, invalid };
}

export function listSpecs(specsDir: string): string[] {
  if (!existsSync(specsDir)) return [];
  return readdirSync(specsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(specsDir, e.name, 'context.md')))
    .map((e) => e.name)
    .sort();
}
