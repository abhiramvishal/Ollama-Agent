import * as vscode from 'vscode';
import * as path from 'path';
import { gitDiff, gitLog } from '../git/gitClient';
import type { WorkspaceIndex } from '../rag/workspaceIndex';
import type { MemoryStore } from '../memory/memoryStore';

export interface MentionResult {
  type: string;
  label: string;
  content: string;
}

const MENTION_REGEX = /^@(\w+)(?::(.*))?$/;

/**
 * Parse "@type" or "@type:value" and resolve to content for prompt injection.
 * Returns null if the mention cannot be resolved (file not found, etc.).
 */
export async function resolveMention(
  mention: string,
  workspaceIndex: WorkspaceIndex,
  memoryStore: MemoryStore
): Promise<MentionResult | null> {
  const m = mention.trim().match(MENTION_REGEX);
  if (!m) return null;
  const type = m[1].toLowerCase();
  const value = (m[2] ?? '').trim();

  try {
    switch (type) {
      case 'file': {
        if (!value) return null;
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length) return null;
        const fullPath = path.join(folders[0].uri.fsPath, value);
        const doc = await vscode.workspace.openTextDocument(fullPath);
        const content = doc.getText().slice(0, 15000);
        const label = value;
        return {
          type: 'file',
          label,
          content: `<mention_file path="${escapeXml(value)}">\n${content}\n</mention_file>`,
        };
      }
      case 'git': {
        const sub = value.toLowerCase() || 'diff';
        if (sub === 'diff') {
          const out = gitDiff({ staged: false });
          return { type: 'git', label: 'git diff', content: `<mention_git type="diff">\n${out}\n</mention_git>` };
        }
        if (sub === 'log') {
          const out = gitLog({ count: 10 });
          return { type: 'git', label: 'git log', content: `<mention_git type="log">\n${out}\n</mention_git>` };
        }
        return null;
      }
      case 'symbol': {
        if (!value) return null;
        const chunks = await workspaceIndex.query(value, 3);
        const matching = chunks.filter(c => c.name && c.name.toLowerCase().includes(value.toLowerCase()));
        const toUse = matching.length > 0 ? matching : chunks.slice(0, 3);
        const parts = toUse.map(c => `--- ${c.filePath} | ${c.type}: ${c.name} | lines ${c.startLine}-${c.endLine} ---\n${c.content}`).join('\n\n');
        return {
          type: 'symbol',
          label: `symbol: ${value}`,
          content: `<mention_symbol name="${escapeXml(value)}">\n${parts}\n</mention_symbol>`,
        };
      }
      case 'memory': {
        const query = value || 'recent';
        const entries = memoryStore.searchRecall(query, 3);
        const parts = entries.map(e => e.content).join('\n\n---\n\n');
        return {
          type: 'memory',
          label: `memory: ${query}`,
          content: `<mention_memory query="${escapeXml(query)}">\n${parts}\n</mention_memory>`,
        };
      }
      case 'workspace': {
        const ctx = await workspaceIndex.getContext('overview');
        if (!ctx) return null;
        return {
          type: 'workspace',
          label: 'workspace overview',
          content: `<mention_workspace>\n${ctx}\n</mention_workspace>`,
        };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
