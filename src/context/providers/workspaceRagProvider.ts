import type { WorkspaceIndex } from '../../rag/workspaceIndex';
import type { ContextProvider } from '../contextRegistry';

export function createWorkspaceRagProvider(workspaceIndex: WorkspaceIndex): ContextProvider {
  return {
    name: 'workspaceRag',
    priority: 60,
    maxChars: 4000,
    async getContext(query: string): Promise<string> {
      const chunks = await workspaceIndex.query(query, 5);
      if (chunks.length === 0) return '';
      const lines: string[] = ['Relevant code from workspace:', ''];
      for (const c of chunks) {
        lines.push(`--- ${c.filePath} | ${c.type}: ${c.name} | lines ${c.startLine}-${c.endLine} ---`);
        lines.push(c.content);
        lines.push('');
      }
      return lines.join('\n').trim();
    },
  };
}
