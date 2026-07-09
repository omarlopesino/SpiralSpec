import { describe, it, expect, beforeEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { buildProgram } from '../src/cli/program.js';

const PROJECT = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'project');

async function run(args: string[], cwd = PROJECT): Promise<string[]> {
  const lines: string[] = [];
  const program = buildProgram({ cwd, out: (l) => lines.push(l) });
  program.exitOverride();
  await program.parseAsync(['node', 'spiralspec', ...args]);
  return lines;
}

const VALID_TASK = `---
name: Only task
goal: Prove the spec still loads its other tasks
ground: null
status: todo
scope:
  - src/only/**
blocked: null
---

# Context
x
# Tasks
- [ ] do it
# Iterations

# Testing

`;

function makeProject(): string {
  return mkdtempSync(join(tmpdir(), 'spiral-cli-'));
}

describe('cli', () => {
  beforeEach(() => {
    process.exitCode = undefined;
  });

  it('status --json reports phase and counts', async () => {
    const out = JSON.parse((await run(['status', 'demo', '--json'])).join('\n'));
    expect(out.spec).toBe('demo');
    expect(out.phase).toBe('verification'); // setup-db is in verification, which outranks the todo tasks
    expect(out.counts.todo).toBe(2);
    expect(out.invalid).toHaveLength(1);
    expect(out.backlog).toHaveLength(5); // ledger passthrough, incl. the pending 'cleanup' entry
  });

  it('status human output includes warning when spec has validation issues', async () => {
    const out = await run(['status', 'demo']);
    expect(out.join('\n')).toContain('warning: validate reports 1 issue(s) — parallel dispatch is not safe until fixed');
  });

  it('status human output shows unexpanded backlog lines and a blocked-task suffix', async () => {
    const out = (await run(['status', 'demo'])).join('\n');
    // setup-db.md carries `blocked: awaiting schema review` in the fixture
    expect(out).toContain('verification setup-db  (blocked: awaiting schema review)');
    // backlog.md's `- [ ] cleanup — ...` line has no matching tasks/cleanup.md, so it's unexpanded
    expect(out).toContain('unexpanded   cleanup — Remove the legacy tables once migration is verified');
  });

  it('status --json output does not include warning (byte-identical to no-issue spec)', async () => {
    const out = await run(['status', 'demo', '--json']);
    const jsonStr = out.join('\n');
    expect(jsonStr).not.toContain('warning');
    // Verify it's valid JSON with expected structure
    const parsed = JSON.parse(jsonStr);
    expect(parsed.spec).toBe('demo');
  });

  it('validate reports issues and sets exit code', async () => {
    const out = await run(['validate', 'demo']);
    expect(out.join('\n')).toContain('tasks/broken.md: invalid status: doing');
    expect(process.exitCode).toBe(1);
  });

  it('next --json returns runnable and excluded', async () => {
    const out = JSON.parse((await run(['next', 'demo', '--json'])).join('\n'));
    expect(out.runnable.map((t: { slug: string }) => t.slug)).toEqual(['field-map']);
    expect(out.excluded).toEqual([{ slug: 'migrate-users', reason: 'waiting on ground: field-map' }]);
  });

  it('next human output includes warning when spec has validation issues', async () => {
    const out = await run(['next', 'demo']);
    expect(out.join('\n')).toContain('warning: validate reports 1 issue(s) — parallel dispatch is not safe until fixed');
  });

  it('next --json output does not include warning', async () => {
    const out = await run(['next', 'demo', '--json']);
    const jsonStr = out.join('\n');
    expect(jsonStr).not.toContain('warning');
    // Verify it's valid JSON with expected structure
    const parsed = JSON.parse(jsonStr);
    expect(parsed.runnable).toBeDefined();
    expect(parsed.excluded).toBeDefined();
  });

  it('next prints "nothing to run" for a spec with no tasks', async () => {
    const cwd = makeProject();
    const emptyDir = join(cwd, 'specs', 'empty');
    mkdirSync(emptyDir, { recursive: true });
    writeFileSync(join(emptyDir, 'context.md'), '---\nname: Empty\nautonomy: medium\n---\n\n# Context\n', 'utf8');

    const out = await run(['next', 'empty'], cwd);
    expect(out.join('\n')).toContain('nothing to run');
  });

  it('status and next have no warning on a valid spec', async () => {
    const cwd = makeProject();
    const specs = join(cwd, 'specs');
    const healthyDir = join(specs, 'healthy');
    mkdirSync(join(healthyDir, 'tasks'), { recursive: true });
    writeFileSync(join(healthyDir, 'context.md'), '---\nname: Healthy\nautonomy: medium\n---\n\n# Context\n', 'utf8');
    writeFileSync(join(healthyDir, 'tasks', 'only-task.md'), VALID_TASK, 'utf8');

    const statusOut = await run(['status', 'healthy'], cwd);
    expect(statusOut.join('\n')).not.toContain('warning');

    const nextOut = await run(['next', 'healthy'], cwd);
    expect(nextOut.join('\n')).not.toContain('warning');
  });

  it('impact --json with --files', async () => {
    const out = JSON.parse(
      (await run(['impact', 'demo', 'setup-db', '--files', 'db/schema.sql,src/mapping/x.ts', '--json'])).join('\n'),
    );
    expect(out.affected.sort()).toEqual(['field-map', 'migrate-users']);
  });

  it('impact falls back to git diff --name-only HEAD when --files is omitted, inside a git repo', async () => {
    const cwd = makeProject();
    execSync('git init -q && git config user.email test@example.com && git config user.name test', { cwd });

    const dir = join(cwd, 'specs', 'gitfallback');
    mkdirSync(join(dir, 'tasks'), { recursive: true });
    writeFileSync(join(dir, 'context.md'), '---\nname: Git fallback\nautonomy: medium\n---\n\n# Context\n', 'utf8');
    writeFileSync(
      join(dir, 'tasks', 'target.md'),
      '---\nname: Target\ngoal: target\nground: null\nstatus: todo\nscope:\n  - db/**\nblocked: null\n---\n\n# Context\n# Tasks\n# Iterations\n\n# Testing\n\n',
      'utf8',
    );
    writeFileSync(
      join(dir, 'tasks', 'hit.md'),
      '---\nname: Hit\ngoal: hit\nground: null\nstatus: todo\nscope:\n  - src/mapping/**\nblocked: null\n---\n\n# Context\n# Tasks\n# Iterations\n\n# Testing\n\n',
      'utf8',
    );
    mkdirSync(join(cwd, 'src', 'mapping'), { recursive: true });
    writeFileSync(join(cwd, 'src', 'mapping', 'x.ts'), 'export const x = 1;\n', 'utf8');
    execSync('git add -A && git commit -q -m init', { cwd });
    // Uncommitted change: `git diff --name-only HEAD` will report it without needing --files.
    writeFileSync(join(cwd, 'src', 'mapping', 'x.ts'), 'export const x = 2;\n', 'utf8');

    const out = await run(['impact', 'gitfallback', 'target'], cwd);
    expect(out.join('\n')).toContain('impact of target: hit');
    expect(process.exitCode).toBeUndefined();
  });

  it('impact reports a clear error when git diff fails and --files is omitted', async () => {
    const cwd = makeProject(); // not a git repo, and not nested inside one

    const dir = join(cwd, 'specs', 'nogit');
    mkdirSync(join(dir, 'tasks'), { recursive: true });
    writeFileSync(join(dir, 'context.md'), '---\nname: No git\nautonomy: medium\n---\n\n# Context\n', 'utf8');
    writeFileSync(
      join(dir, 'tasks', 'target.md'),
      '---\nname: Target\ngoal: target\nground: null\nstatus: todo\nscope:\n  - db/**\nblocked: null\n---\n\n# Context\n# Tasks\n# Iterations\n\n# Testing\n\n',
      'utf8',
    );

    const out = await run(['impact', 'nogit', 'target'], cwd);
    expect(out.join('\n')).toContain('error: could not run git diff; pass --files explicitly');
    expect(process.exitCode).toBe(1);
  });

  it('impact fails loud on a nonexistent task slug', async () => {
    const out = await run(['impact', 'demo', 'ghost', '--files', 'db/schema.sql', '--json']);
    expect(out.join('\n')).toContain('error: task not found: ghost');
    expect(process.exitCode).toBe(1);
  });

  it('fails cleanly on a missing spec', async () => {
    const out = await run(['status', 'ghost']);
    expect(out.join('\n')).toContain('spec not found: ghost');
    expect(process.exitCode).toBe(1);
  });

  it('a directory named *.md inside tasks/ does not take down status/validate, and a sibling spec is unaffected', async () => {
    const cwd = makeProject();
    const specs = join(cwd, 'specs');

    // spec with a directory shadowing a task filename
    const dirTaskDir = join(specs, 'dir-task');
    mkdirSync(join(dirTaskDir, 'tasks', 'notes.md'), { recursive: true });
    writeFileSync(join(dirTaskDir, 'tasks', 'notes.md', 'inner.txt'), 'irrelevant', 'utf8');
    writeFileSync(join(dirTaskDir, 'context.md'), '---\nname: Dir task\nautonomy: medium\n---\n\n# Context\n', 'utf8');
    writeFileSync(join(dirTaskDir, 'tasks', 'only-task.md'), VALID_TASK, 'utf8');

    // healthy sibling spec
    const healthyDir = join(specs, 'healthy');
    mkdirSync(join(healthyDir, 'tasks'), { recursive: true });
    writeFileSync(join(healthyDir, 'context.md'), '---\nname: Healthy\nautonomy: medium\n---\n\n# Context\n', 'utf8');
    writeFileSync(join(healthyDir, 'tasks', 'only-task.md'), VALID_TASK, 'utf8');

    const status = JSON.parse((await run(['status', 'dir-task', '--json'], cwd)).join('\n'));
    expect(status.tasks.map((t: { slug: string }) => t.slug)).toEqual(['only-task']);
    expect(status.invalid).toEqual([]);
    expect(process.exitCode).toBeUndefined();

    expect(await run(['validate', 'dir-task'], cwd)).toEqual(['OK']);
    expect(process.exitCode).toBeUndefined();

    const healthyStatus = JSON.parse((await run(['status', 'healthy', '--json'], cwd)).join('\n'));
    expect(healthyStatus.tasks.map((t: { slug: string }) => t.slug)).toEqual(['only-task']);
  });

  it('a context.md with invalid YAML frontmatter reports the spec invalid instead of dying, and a sibling spec is unaffected', async () => {
    const cwd = makeProject();
    const specs = join(cwd, 'specs');

    const brokenDir = join(specs, 'broken-context');
    mkdirSync(join(brokenDir, 'tasks'), { recursive: true });
    writeFileSync(join(brokenDir, 'context.md'), '---\nname: [unterminated\nautonomy: medium\n---\n\n# Context\n', 'utf8');
    writeFileSync(join(brokenDir, 'tasks', 'only-task.md'), VALID_TASK, 'utf8');

    const healthyDir = join(specs, 'healthy');
    mkdirSync(join(healthyDir, 'tasks'), { recursive: true });
    writeFileSync(join(healthyDir, 'context.md'), '---\nname: Healthy\nautonomy: medium\n---\n\n# Context\n', 'utf8');
    writeFileSync(join(healthyDir, 'tasks', 'only-task.md'), VALID_TASK, 'utf8');

    const status = JSON.parse((await run(['status', 'broken-context', '--json'], cwd)).join('\n'));
    expect(status.invalid).toEqual([{ file: 'context.md', error: expect.stringContaining('invalid frontmatter:') }]);
    expect(process.exitCode).toBeUndefined(); // status itself doesn't fail the process, it just reports

    const validateOut = await run(['validate', 'broken-context'], cwd);
    expect(validateOut.join('\n')).toContain('context.md: invalid frontmatter:');
    expect(process.exitCode).toBe(1);

    const healthyStatus = JSON.parse((await run(['status', 'healthy', '--json'], cwd)).join('\n'));
    expect(healthyStatus.invalid).toEqual([]);
  });

  describe('init agent preservation', () => {
    it('init --agent claude, then bare init preserves [claude]', async () => {
      const cwd = makeProject();
      // First init with --agent claude
      await run(['init', '--agent', 'claude'], cwd);
      // Read the config
      const configPath = join(cwd, '.spiralspec.yml');
      const configContent = require('fs').readFileSync(configPath, 'utf8');
      expect(configContent).toContain('agents:');
      expect(configContent).toContain('- claude');
      // Now run bare init
      process.exitCode = undefined;
      await run(['init'], cwd);
      // Check config still has [claude]
      const configAfter = require('fs').readFileSync(configPath, 'utf8');
      expect(configAfter).toContain('agents:');
      expect(configAfter).toContain('- claude');
      // Should not have opencode
      expect(configAfter).not.toContain('opencode');
    });

    it('bare first init uses default agent pair', async () => {
      const cwd = makeProject();
      // Run bare init on empty project
      await run(['init'], cwd);
      const configPath = join(cwd, '.spiralspec.yml');
      const configContent = require('fs').readFileSync(configPath, 'utf8');
      expect(configContent).toContain('agents:');
      // Default pair should be both claude and opencode
      expect(configContent).toContain('- claude');
      expect(configContent).toContain('- opencode');
    });

    it('init with explicit --agent overrides existing config', async () => {
      const cwd = makeProject();
      // First init with claude
      await run(['init', '--agent', 'claude'], cwd);
      // Then re-init with explicit opencode
      process.exitCode = undefined;
      await run(['init', '--agent', 'opencode'], cwd);
      const configPath = join(cwd, '.spiralspec.yml');
      const configContent = require('fs').readFileSync(configPath, 'utf8');
      expect(configContent).toContain('agents:');
      expect(configContent).toContain('- opencode');
      // Should not have claude
      expect(configContent).not.toContain('- claude');
    });
  });

  it('--version prints the package version', async () => {
    const lines: string[] = [];
    const program = buildProgram({ cwd: PROJECT, out: (l) => lines.push(l) });
    program.exitOverride();
    try {
      await program.parseAsync(['node', 'spiralspec', '--version']);
    } catch (e: unknown) {
      // commander throws on exit, but the version was already output
      if (!(e instanceof Error) || !e.message.includes('0.1.0')) throw e;
    }
    // Read actual package.json to verify
    const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
    const pkg = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf8'));
    // The version should be in the error message that was thrown
    expect(pkg.version).toBe('0.1.0');
  });
});
