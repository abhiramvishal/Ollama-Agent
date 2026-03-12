import type { SkillStore } from '../../memory/skillStore';
import type { ContextProvider } from '../contextRegistry';

export function createSkillProvider(skillStore: SkillStore): ContextProvider {
  return {
    name: 'skill',
    priority: 85,
    maxChars: 2000,
    async getContext(query: string): Promise<string> {
      const skills = skillStore.findRelevant(query, 2);
      if (skills.length === 0) return '';
      const lines: string[] = ['<skills>'];
      for (const s of skills) {
        lines.push(`## Skill: ${s.name}`);
        lines.push(s.content);
      }
      lines.push('</skills>');
      return lines.join('\n');
    },
  };
}
