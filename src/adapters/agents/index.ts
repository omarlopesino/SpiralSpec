import type { AgentAdapter } from './types.js';
import { claudeAdapter } from './claude.js';
import { opencodeAdapter } from './opencode.js';

const ADAPTERS: AgentAdapter[] = [claudeAdapter, opencodeAdapter];
export const ADAPTER_IDS = ADAPTERS.map((a) => a.id);

export function getAdapter(id: string): AgentAdapter {
  const adapter = ADAPTERS.find((a) => a.id === id);
  if (!adapter) throw new Error(`unknown agent: ${id}`);
  return adapter;
}
