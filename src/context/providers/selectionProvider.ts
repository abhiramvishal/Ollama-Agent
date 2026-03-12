import * as vscode from 'vscode';
import type { ContextProvider } from '../contextRegistry';

export function createSelectionProvider(): ContextProvider {
  return {
    name: 'selection',
    priority: 95,
    maxChars: 10000,
    async getContext(): Promise<string> {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.selection.isEmpty) return '';
      const text = editor.document.getText(editor.selection);
      const lang = editor.document.languageId;
      return `Selected code (${lang}):\n\`\`\`${lang}\n${text}\n\`\`\``;
    },
  };
}
