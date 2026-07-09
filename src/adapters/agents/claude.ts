import type { AgentAdapter, RenderedFile } from './types.js';
import { marker } from './types.js';

export const claudeAdapter: AgentAdapter = {
  id: 'claude',
  render(skills, version) {
    const files: RenderedFile[] = [];
    for (const s of skills) {
      files.push({
        relPath: `.claude/skills/spiralspec-${s.id}/SKILL.md`,
        content: `---\nname: spiralspec-${s.id}\ndescription: ${s.description}\n---\n\n${marker(version)}\n\n${s.body}\n`,
      });
      files.push({
        relPath: `.claude/commands/spiral/${s.id}.md`,
        content: `---\ndescription: ${s.description}\n---\n\n${marker(version)}\n\nUse the spiralspec-${s.id} skill. Arguments: $ARGUMENTS\n`,
      });
    }
    return files;
  },
};
