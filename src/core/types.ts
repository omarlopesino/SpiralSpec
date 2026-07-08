export type TaskStatus = 'backlog' | 'todo' | 'inprogress' | 'verification' | 'release' | 'done';
export const TASK_STATUSES: readonly TaskStatus[] = ['backlog', 'todo', 'inprogress', 'verification', 'release', 'done'];

export interface TaskFrontmatter {
  name: string;
  goal: string;
  ground: string[] | null;   // null = base task
  status: TaskStatus;
  scope: string[];           // file-claim globs
  blocked: string | null;
}

export interface TaskData {
  slug: string;              // filename without .md; referenced by other tasks' ground
  file: string;              // spec-relative path, e.g. "tasks/create-field-map.md"
  fm: TaskFrontmatter;
  body: string;              // markdown after frontmatter
}

export interface InvalidTask { slug: string; file: string; error: string; }

export interface BacklogEntry {
  slug: string;
  goal: string;
  expanded: boolean;         // [x] = tasks/<slug>.md exists
}

export interface SpecFrontmatter {
  name: string;
  autonomy: 'low' | 'medium' | 'high';
  created?: string;
}

export interface SpecData {
  slug: string;
  dir: string;               // absolute path to the spec folder
  fm: SpecFrontmatter;
  backlog: BacklogEntry[] | null;   // null = no backlog.md (or no parseable entries)
  tasks: TaskData[];
  invalid: InvalidTask[];
}

export interface ValidationIssue { file: string; message: string; }
