import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../adapters/config.js';
import { loadSpec } from '../adapters/fs.js';
import { createSpec } from '../adapters/scaffold.js';
import { validateSpec } from '../core/validate.js';
import { buildStatusReport } from '../core/status.js';
import { nextTasks } from '../core/next.js';
import { impactOf } from '../core/impact.js';
import type { SpecData } from '../core/types.js';

export interface CliIO {
  cwd: string;
  out: (line: string) => void;
}

function getSpec(io: CliIO, slug: string): SpecData | null {
  try {
    const cfg = loadConfig(io.cwd);
    return loadSpec(resolve(io.cwd, cfg.specsRoot), slug);
  } catch (e) {
    io.out(`error: ${(e as Error).message}`);
    process.exitCode = 1;
    return null;
  }
}

function emit(io: CliIO, json: boolean, data: unknown, human: () => void): void {
  if (json) io.out(JSON.stringify(data, null, 2));
  else human();
}

export function buildProgram(io: CliIO): Command {
  const program = new Command('spiralspec').description('Agile Spec-Driven Development toolkit');

  program
    .command('new')
    .argument('<slug>', 'spec slug (folder name)')
    .option('--name <name>', 'human-readable spec name')
    .description('Scaffold a new spec folder with empty artifacts')
    .action((slug: string, opts: { name?: string }) => {
      try {
        const cfg = loadConfig(io.cwd);
        const specsDir = resolve(io.cwd, cfg.specsRoot);
        mkdirSync(specsDir, { recursive: true });
        const created = createSpec(specsDir, slug, opts.name ?? slug);
        for (const f of created) io.out(`created ${cfg.specsRoot}/${f}`);
      } catch (e) {
        io.out(`error: ${(e as Error).message}`);
        process.exitCode = 1;
      }
    });

  program
    .command('validate')
    .argument('<spec>', 'spec slug')
    .description('Validate spec artifacts: schema, ground graph, scope claims')
    .action((slug: string) => {
      const spec = getSpec(io, slug);
      if (!spec) return;
      const issues = validateSpec(spec);
      if (issues.length === 0) {
        io.out('OK');
        return;
      }
      for (const i of issues) io.out(`${i.file}: ${i.message}`);
      process.exitCode = 1;
    });

  program
    .command('status')
    .argument('<spec>', 'spec slug')
    .option('--json', 'machine-readable output')
    .description('Report spec phase, task statuses, and invalid files')
    .action((slug: string, opts: { json?: boolean }) => {
      const spec = getSpec(io, slug);
      if (!spec) return;
      const report = buildStatusReport(spec);
      emit(io, opts.json === true, report, () => {
        io.out(`${report.spec} — ${report.name} [phase: ${report.phase}, autonomy: ${report.autonomy}]`);
        for (const t of report.tasks) {
          io.out(`  ${t.status.padEnd(12)} ${t.slug}${t.blocked ? `  (blocked: ${t.blocked})` : ''}`);
        }
        for (const b of report.backlog ?? []) {
          if (!b.expanded) io.out(`  unexpanded   ${b.slug} — ${b.goal}`);
        }
        for (const i of report.invalid) io.out(`  invalid      ${i.file}: ${i.error}`);
      });
    });

  program
    .command('next')
    .argument('<spec>', 'spec slug')
    .option('--json', 'machine-readable output')
    .description('List tasks runnable now (deps met, unblocked, scopes free)')
    .action((slug: string, opts: { json?: boolean }) => {
      const spec = getSpec(io, slug);
      if (!spec) return;
      const result = nextTasks(spec);
      const data = {
        runnable: result.runnable.map((t) => ({
          slug: t.slug,
          name: t.fm.name,
          status: t.fm.status,
          ground: t.fm.ground,
          scope: t.fm.scope,
        })),
        excluded: result.excluded,
      };
      emit(io, opts.json === true, data, () => {
        for (const t of data.runnable) io.out(`runnable: ${t.slug} (${t.status})`);
        for (const e of data.excluded) io.out(`excluded: ${e.slug} — ${e.reason}`);
        if (data.runnable.length === 0 && data.excluded.length === 0) io.out('nothing to run');
      });
    });

  program
    .command('impact')
    .argument('<spec>', 'spec slug')
    .argument('<task>', 'task slug')
    .option('--files <files>', 'comma-separated changed files (default: git diff --name-only HEAD)')
    .option('--json', 'machine-readable output')
    .description('Blast radius: ground-dependents plus scope hits of changed files')
    .action((slug: string, taskSlug: string, opts: { files?: string; json?: boolean }) => {
      const spec = getSpec(io, slug);
      if (!spec) return;
      let files: string[];
      if (opts.files !== undefined) {
        files = opts.files.split(',').map((f) => f.trim()).filter(Boolean);
      } else {
        try {
          files = execSync('git diff --name-only HEAD', { cwd: io.cwd, encoding: 'utf8' })
            .split('\n')
            .filter(Boolean);
        } catch {
          io.out('error: could not run git diff; pass --files explicitly');
          process.exitCode = 1;
          return;
        }
      }
      const result = impactOf(spec, taskSlug, files);
      emit(io, opts.json === true, result, () => {
        io.out(`impact of ${result.task}: ${result.affected.length === 0 ? 'none' : result.affected.join(', ')}`);
      });
    });

  return program;
}
