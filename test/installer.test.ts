import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSkillSources, installSkillPack } from '../src/adapters/installer.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'spiral-install-'));
});

describe('loadSkillSources', () => {
  it('loads the six packaged skills', () => {
    const ids = loadSkillSources().map((s) => s.id).sort();
    expect(ids).toEqual(['define', 'implement', 'plan', 'refine', 'release', 'verify']);
    for (const s of loadSkillSources()) {
      expect(s.description.length).toBeGreaterThan(10);
      expect(s.body).toContain('# SpiralSpec');
    }
  });
});

describe('installSkillPack', () => {
  it('writes rendered files and a manifest', () => {
    const report = installSkillPack(dir, ['claude', 'opencode']);
    expect(report.skipped).toEqual([]);
    expect(report.written).toContain('.claude/skills/spiralspec-plan/SKILL.md');
    expect(report.written).toContain('.opencode/commands/spiral-plan.md');
    expect(existsSync(join(dir, '.claude/commands/spiral/implement.md'))).toBe(true);
    const manifest = JSON.parse(readFileSync(join(dir, '.spiralspec/manifest.json'), 'utf8'));
    expect(Object.keys(manifest.files).length).toBe(report.written.length);
  });

  it('is idempotent on unmodified files', () => {
    installSkillPack(dir, ['claude']);
    const report = installSkillPack(dir, ['claude']);
    expect(report.skipped).toEqual([]);
    expect(report.written.length).toBeGreaterThan(0);
  });

  it('skips hand-edited files unless forced', () => {
    installSkillPack(dir, ['claude']);
    const edited = join(dir, '.claude/skills/spiralspec-plan/SKILL.md');
    writeFileSync(edited, 'my custom version', 'utf8');
    const report = installSkillPack(dir, ['claude']);
    expect(report.skipped).toEqual(['.claude/skills/spiralspec-plan/SKILL.md']);
    expect(readFileSync(edited, 'utf8')).toBe('my custom version');
    const forced = installSkillPack(dir, ['claude'], { force: true });
    expect(forced.skipped).toEqual([]);
    expect(readFileSync(edited, 'utf8')).not.toBe('my custom version');
  });

  it('keeps protecting an unmanaged pre-existing file across repeated runs', () => {
    const preexisting = join(dir, '.claude/skills/spiralspec-plan/SKILL.md');
    mkdirSync(join(dir, '.claude/skills/spiralspec-plan'), { recursive: true });
    writeFileSync(preexisting, 'user authored file', 'utf8');
    const first = installSkillPack(dir, ['claude']);
    expect(first.skipped).toEqual(['.claude/skills/spiralspec-plan/SKILL.md']);
    const second = installSkillPack(dir, ['claude']);
    expect(second.skipped).toEqual(['.claude/skills/spiralspec-plan/SKILL.md']);
    expect(readFileSync(preexisting, 'utf8')).toBe('user authored file');
    const forced = installSkillPack(dir, ['claude'], { force: true });
    expect(forced.skipped).toEqual([]);
    expect(readFileSync(preexisting, 'utf8')).not.toBe('user authored file');
  });
});
