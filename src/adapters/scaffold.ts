import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { yamlScalar } from './agents/claude.js';

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates');

function render(template: string, vars: Record<string, string>): string {
  return readFileSync(join(TEMPLATES, template), 'utf8').replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '');
}

export function createSpec(specsDir: string, slug: string, name: string): string[] {
  const dir = join(specsDir, slug);
  if (existsSync(dir)) throw new Error(`spec already exists: ${slug}`);
  const date = new Date().toISOString().slice(0, 10);
  mkdirSync(join(dir, 'tasks'), { recursive: true });
  mkdirSync(join(dir, 'status'), { recursive: true });

  const files: Array<[string, string]> = [
    // `date` is machine-generated (ISO date, always safe) and the template
    // already wraps it in explicit double quotes; escaping it too would
    // double-quote date-like strings (js-yaml quotes them to avoid the YAML
    // timestamp type), corrupting the value. Only `name` carries user input.
    [join(dir, 'context.md'), render('context.md', { name: yamlScalar(name), date })],
    [join(dir, 'acceptance-criteria.md'), render('acceptance-criteria.md', {})],
    [join(dir, 'solution.md'), render('solution.md', {})],
    [join(dir, 'backlog.md'), render('backlog.md', {})],
    [join(dir, 'status', 'README.md'), render('status-readme.md', {})],
    [join(dir, 'status', 'release.md'), render('status-release.md', {})],
    [join(dir, 'tasks', '.gitkeep'), ''],
  ];
  for (const [path, content] of files) writeFileSync(path, content, 'utf8');
  return files.map(([path]) => relative(specsDir, path).split('\\').join('/'));
}
