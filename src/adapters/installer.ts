import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join } from 'node:path';
import matter from 'gray-matter';
import type { SkillSource } from './agents/types.js';
import { getAdapter } from './agents/index.js';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILLS_DIR = join(PKG_ROOT, 'skills');

function pkgVersion(): string {
  return (JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8')) as { version: string }).version;
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export function loadSkillSources(): SkillSource[] {
  return readdirSync(SKILLS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      const { data, content } = matter(readFileSync(join(SKILLS_DIR, f), 'utf8'));
      return {
        id: typeof data.id === 'string' ? data.id : basename(f, '.md'),
        title: String(data.title ?? ''),
        description: String(data.description ?? ''),
        args: String(data.args ?? ''),
        body: content.trim(),
      };
    });
}

export interface InstallReport {
  written: string[];
  skipped: string[];
}

interface Manifest {
  version: string;
  files: Record<string, string>;
}

export function installSkillPack(
  projectDir: string,
  agentIds: string[],
  opts: { force?: boolean } = {},
): InstallReport {
  const version = pkgVersion();
  const skills = loadSkillSources();
  const manifestPath = join(projectDir, '.spiralspec', 'manifest.json');
  const previous: Manifest = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest)
    : { version, files: {} };

  const report: InstallReport = { written: [], skipped: [] };
  const nextManifest: Manifest = { version, files: {} };

  for (const agentId of agentIds) {
    for (const file of getAdapter(agentId).render(skills, version)) {
      const absPath = join(projectDir, file.relPath);
      const recorded = previous.files[file.relPath];
      const onDisk = existsSync(absPath) ? readFileSync(absPath, 'utf8') : null;
      const handEdited = onDisk !== null && recorded !== undefined && sha256(onDisk) !== recorded;
      const unknownExisting = onDisk !== null && recorded === undefined && onDisk !== file.content;

      if ((handEdited || unknownExisting) && opts.force !== true) {
        report.skipped.push(file.relPath);
        if (recorded !== undefined) nextManifest.files[file.relPath] = recorded;
        continue;
      }
      mkdirSync(dirname(absPath), { recursive: true });
      writeFileSync(absPath, file.content, 'utf8');
      report.written.push(file.relPath);
      nextManifest.files[file.relPath] = sha256(file.content);
    }
  }

  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(nextManifest, null, 2), 'utf8');
  return report;
}
