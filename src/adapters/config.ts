import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

export interface SpiralConfig {
  specsRoot: string;
  agents: string[];
  models: Record<string, string>; // complexity tier → platform model name; empty = inherit session model
}

const FILE = '.spiralspec.yml';

export function loadConfig(cwd: string): SpiralConfig {
  const path = join(cwd, FILE);
  if (!existsSync(path)) return { specsRoot: 'specs', agents: [], models: {} };
  const data = (yaml.load(readFileSync(path, 'utf8')) ?? {}) as Partial<SpiralConfig>;
  const models =
    data.models !== null && typeof data.models === 'object' && !Array.isArray(data.models)
      ? Object.fromEntries(Object.entries(data.models).map(([k, v]) => [k, String(v)]))
      : {};
  return {
    specsRoot: typeof data.specsRoot === 'string' ? data.specsRoot : 'specs',
    agents: Array.isArray(data.agents) ? data.agents.map(String) : [],
    models,
  };
}

export function saveConfig(cwd: string, cfg: SpiralConfig): void {
  writeFileSync(join(cwd, FILE), yaml.dump(cfg), 'utf8');
}
