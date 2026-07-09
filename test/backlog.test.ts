import { describe, it, expect } from 'vitest';
import { parseBacklog } from '../src/core/backlog.js';

describe('parseBacklog', () => {
  it('parses checked and unchecked entries, ignoring other lines', () => {
    const raw = [
      '# Backlog',
      '',
      '<!-- ledger comment -->',
      '- [x] create-field-map — Infer old→new field mappings',
      '- [ ] migrate-users — Run the user migration end to end',
      'random prose line',
    ].join('\n');
    expect(parseBacklog(raw)).toEqual([
      { slug: 'create-field-map', goal: 'Infer old→new field mappings', expanded: true },
      { slug: 'migrate-users', goal: 'Run the user migration end to end', expanded: false },
    ]);
  });

  it('returns an empty array when no entries match', () => {
    expect(parseBacklog('# Backlog\n\n<!-- nothing yet -->\n')).toEqual([]);
  });
});
