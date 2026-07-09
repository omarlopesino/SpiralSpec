import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { loadConfig, saveConfig } from '../adapters/config.js';
import { loadSpec } from '../adapters/fs.js';
import { createSpec } from '../adapters/scaffold.js';
import { installSkillPack } from '../adapters/installer.js';
import { ADAPTER_IDS } from '../adapters/agents/index.js';
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

  // Read version from package.json
  const packagePath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as { version: string };
  program.version(packageJson.version);

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

  const runInstall = (agents: string[], force: boolean): void => {
    const report = installSkillPack(io.cwd, agents, { force });
    for (const f of report.written) io.out(`installed ${f}`);
    for (const f of report.skipped) io.out(`skipped ${f} (hand-edited or pre-existing; use --force to overwrite)`);
  };

  program
    .command('init')
    .option('--agent <list>', 'comma-separated agents')
    .option('--force', 'overwrite hand-edited managed files')
    .description('Initialize SpiralSpec: config, specs root, and skill pack')
    .action((opts: { agent?: string; force?: boolean }) => {
      try {
        let cfg = loadConfig(io.cwd);
        let agents: string[];
        if (opts.agent !== undefined) {
          // Flag explicitly provided: parse it
          agents = opts.agent.split(',').map((a) => a.trim()).filter(Boolean);
        } else if (cfg.agents.length > 0) {
          // Flag omitted and existing agents: preserve them
          agents = cfg.agents;
        } else {
          // Flag omitted and no existing agents (first init): use defaults
          agents = ADAPTER_IDS;
        }
        cfg = { ...cfg, agents };
        if (!existsSync(resolve(io.cwd, '.spiralspec.yml'))) io.out('created .spiralspec.yml');
        saveConfig(io.cwd, cfg);
        mkdirSync(resolve(io.cwd, cfg.specsRoot), { recursive: true });
        runInstall(agents, opts.force === true);
      } catch (e) {
        io.out(`error: ${(e as Error).message}`);
        process.exitCode = 1;
      }
    });

  program
    .command('update')
    .option('--force', 'overwrite hand-edited managed files')
    .description('Re-render the skill pack for the configured agents')
    .action((opts: { force?: boolean }) => {
      try {
        const cfg = loadConfig(io.cwd);
        if (cfg.agents.length === 0) {
          io.out('error: no agents configured; run spiralspec init first');
          process.exitCode = 1;
          return;
        }
        runInstall(cfg.agents, opts.force === true);
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
      const issues = validateSpec(spec);
      emit(io, opts.json === true, report, () => {
        io.out(`${report.spec} — ${report.name} [phase: ${report.phase}, autonomy: ${report.autonomy}]`);
        for (const t of report.tasks) {
          io.out(`  ${t.status.padEnd(12)} ${t.slug}${t.blocked ? `  (blocked: ${t.blocked})` : ''}`);
        }
        for (const b of report.backlog ?? []) {
          if (!b.expanded) io.out(`  unexpanded   ${b.slug} — ${b.goal}`);
        }
        for (const i of report.invalid) io.out(`  invalid      ${i.file}: ${i.error}`);
        if (issues.length > 0) {
          io.out(`warning: validate reports ${issues.length} issue(s) — parallel dispatch is not safe until fixed`);
        }
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
      const issues = validateSpec(spec);
      const data = {
        runnable: result.runnable.map((t) => ({
          slug: t.slug,
          name: t.fm.name,
          status: t.fm.status,
          ground: t.fm.ground,
          scope: t.fm.scope,
          complexity: t.fm.complexity,
        })),
        excluded: result.excluded,
      };
      emit(io, opts.json === true, data, () => {
        for (const t of data.runnable) io.out(`runnable: ${t.slug} (${t.status})`);
        for (const e of data.excluded) io.out(`excluded: ${e.slug} — ${e.reason}`);
        if (data.runnable.length === 0 && data.excluded.length === 0) io.out('nothing to run');
        if (issues.length > 0) {
          io.out(`warning: validate reports ${issues.length} issue(s) — parallel dispatch is not safe until fixed`);
        }
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
      if (!spec.tasks.some((t) => t.slug === taskSlug) && !spec.invalid.some((i) => i.slug === taskSlug)) {
        io.out(`error: task not found: ${taskSlug}`);
        process.exitCode = 1;
        return;
      }
      let files: string[];
      if (opts.files !== undefined) {
        files = opts.files.split(',').map((f) => f.trim()).filter(Boolean);
      } else {
        try {
          files = execSync('git diff --name-only HEAD', {
            cwd: io.cwd,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
          })
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
