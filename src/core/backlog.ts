import type { BacklogEntry } from './types.js';

const ENTRY = /^- \[([ xX])\]\s+(\S+)\s+—\s+(.+)$/;

export function parseBacklog(raw: string): BacklogEntry[] {
  const entries: BacklogEntry[] = [];
  for (const line of raw.split('\n')) {
    const m = ENTRY.exec(line.trim());
    if (m) entries.push({ slug: m[2], goal: m[3].trim(), expanded: m[1] !== ' ' });
  }
  return entries;
}
