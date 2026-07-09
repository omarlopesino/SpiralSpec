import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

export interface SpiralConfig {
  specsRoot: string;
  agents: string[];
}

const FILE = '.spiralspec.yml';

export function loadConfig(cwd: string): SpiralConfig {
  const path = join(cwd, FILE);
  if (!existsSync(path)) return { specsRoot: 'specs', agents: [] };
  const data = (yaml.load(readFileSync(path, 'utf8')) ?? {}) as Partial<SpiralConfig>;
  return {
    specsRoot: typeof data.specsRoot === 'string' ? data.specsRoot : 'specs',
    agents: Array.isArray(data.agents) ? data.agents.map(String) : [],
  };
}

export function saveConfig(cwd: string, cfg: SpiralConfig): void {
  writeFileSync(join(cwd, FILE), yaml.dump(cfg), 'utf8');
}
