import * as vscode from 'vscode';
import type { ContextProvider } from '../contextRegistry';

const MAX_CHARS = 3000;
const LINES_AROUND = 150;

export function createActiveFileProvider(): ContextProvider {
  return {
    name: 'activeFile',
    priority: 90,
    maxChars: MAX_CHARS,
    async getContext(): Promise<string> {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return '';
      const doc = editor.document;
      const pos = editor.selection.active;
      const startLine = Math.max(0, pos.line - LINES_AROUND);
      const endLine = Math.min(doc.lineCount - 1, pos.line + LINES_AROUND);
      const range = new vscode.Range(startLine, 0, endLine, doc.lineAt(endLine).text.length);
      let content = doc.getText(range);
      if (content.length > MAX_CHARS) {
        content = content.slice(0, MAX_CHARS) + '\n... (truncated)';
      }
      const relPath = vscode.workspace.asRelativePath(doc.uri);
      return `File: ${relPath}\nLanguage: ${doc.languageId}\n\n${content}`;
    },
  };
}
