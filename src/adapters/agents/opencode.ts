import type { AgentAdapter, RenderedFile } from './types.js';
import { marker } from './types.js';

export const opencodeAdapter: AgentAdapter = {
  id: 'opencode',
  render(skills, version) {
    const files: RenderedFile[] = [];
    for (const s of skills) {
      files.push({
        relPath: `.opencode/commands/spiral-${s.id}.md`,
        content: `---\ndescription: ${s.description}\n---\n\n${marker(version)}\n\nTarget: $ARGUMENTS\n\n${s.body}\n`,
      });
    }
    return files;
  },
};
