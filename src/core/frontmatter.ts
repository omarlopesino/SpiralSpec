import matter from 'gray-matter';
import type { SpecFrontmatter, TaskData, TaskFrontmatter, TaskStatus } from './types.js';
import { TASK_STATUSES } from './types.js';

export type ParseResult = { ok: true; task: TaskData } | { ok: false; error: string };

export function parseTaskFile(slug: string, file: string, raw: string): ParseResult {
  let data: Record<string, unknown>;
  let content: string;
  try {
    ({ data, content } = matter(raw));
  } catch (e) {
    return { ok: false, error: `invalid frontmatter: ${(e as Error).message}` };
  }
  if (typeof data.name !== 'string' || data.name.trim() === '') {
    return { ok: false, error: 'missing required field: name' };
  }
  if (typeof data.goal !== 'string' || data.goal.trim() === '') {
    return { ok: false, error: 'missing required field: goal' };
  }
  if (typeof data.status !== 'string' || !TASK_STATUSES.includes(data.status as TaskStatus)) {
    return { ok: false, error: `invalid status: ${String(data.status)}` };
  }
  const ground =
    data.ground == null ? null : Array.isArray(data.ground) ? data.ground.map(String) : [String(data.ground)];
  const scope = data.scope == null ? [] : Array.isArray(data.scope) ? data.scope.map(String) : [String(data.scope)];
  const blocked = data.blocked == null ? null : String(data.blocked);
  const fm: TaskFrontmatter = {
    name: data.name,
    goal: data.goal.trim(),
    ground,
    status: data.status as TaskStatus,
    scope,
    blocked,
  };
  return { ok: true, task: { slug, file, fm, body: content } };
}

export function parseSpecFrontmatter(raw: string): SpecFrontmatter {
  const { data } = matter(raw);
  const autonomy = data.autonomy === 'low' || data.autonomy === 'high' ? data.autonomy : 'medium';
  return {
    name: typeof data.name === 'string' ? data.name : '',
    autonomy,
    created: data.created == null ? undefined : String(data.created),
  };
}
