import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import matter from 'gray-matter';
import type { InvalidTask, SpecData, TaskData } from '../core/types.js';
import { parseSpecFrontmatter, parseTaskFile } from '../core/frontmatter.js';
import { parseBacklog } from '../core/backlog.js';

export function loadSpec(specsDir: string, slug: string): SpecData {
  const dir = join(specsDir, slug);
  const contextPath = join(dir, 'context.md');
  if (!existsSync(contextPath)) throw new Error(`spec not found: ${slug}`);

  const invalid: InvalidTask[] = [];
  let fm: SpecData['fm'];
  try {
    // gray-matter caches parse results keyed by raw content; when the YAML engine
    // throws mid-parse it still leaves a (corrupt, data-less) entry in that cache, so a
    // later parse of byte-identical broken content would silently "succeed" with empty
    // data instead of throwing again. Clear it so degrade-to-fallback stays deterministic
    // across repeated in-process loadSpec calls (e.g. multiple CLI commands run in one
    // process, or two specs that happen to share broken content).
    (matter as unknown as { clearCache(): void }).clearCache();
    fm = parseSpecFrontmatter(readFileSync(contextPath, 'utf8'));
  } catch (e) {
    fm = { name: slug, autonomy: 'medium', created: undefined };
    invalid.push({ slug: 'context', file: 'context.md', error: `invalid frontmatter: ${(e as Error).message}` });
  }

  const backlogPath = join(dir, 'backlog.md');
  const backlog = existsSync(backlogPath) ? parseBacklog(readFileSync(backlogPath, 'utf8')) : null;

  const tasks: TaskData[] = [];
  const tasksDir = join(dir, 'tasks');
  if (existsSync(tasksDir)) {
    const entries = readdirSync(tasksDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name)
      .sort();
    for (const entry of entries) {
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
