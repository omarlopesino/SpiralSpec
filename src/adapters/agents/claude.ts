import yaml from 'js-yaml';
import type { AgentAdapter, RenderedFile } from './types.js';
import { marker } from './types.js';

/**
 * Escape a single scalar value for safe splicing into a `key: <value>` YAML
 * frontmatter position. Uses js-yaml's own dumper so the result always
 * round-trips through `yaml.load`/`gray-matter`, regardless of colons,
 * hashes, quotes, or embedded newlines in the source string.
 */
export function yamlScalar(value: string): string {
  // lineWidth: -1 disables js-yaml's default ~80-col line wrapping, so long
  // but otherwise plain-safe strings (the shipped skill descriptions) render
  // as a single unquoted line instead of being folded into a multi-line
  // block scalar. Hostile values (colons, hashes, newlines) are still
  // quoted/escaped as needed and round-trip through yaml.load unchanged.
  return yaml.dump(value, { lineWidth: -1 }).trimEnd();
}

export const claudeAdapter: AgentAdapter = {
  id: 'claude',
  render(skills, version) {
    const files: RenderedFile[] = [];
    for (const s of skills) {
      files.push({
        relPath: `.claude/skills/spiralspec-${s.id}/SKILL.md`,
        content: `---\nname: ${yamlScalar(`spiralspec-${s.id}`)}\ndescription: ${yamlScalar(s.description)}\n---\n\n${marker(version)}\n\n${s.body}\n`,
      });
      files.push({
        relPath: `.claude/commands/spiral/${s.id}.md`,
        content: `---\ndescription: ${yamlScalar(s.description)}\n---\n\n${marker(version)}\n\nUse the spiralspec-${s.id} skill. Arguments: $ARGUMENTS\n`,
      });
    }
    return files;
  },
};
