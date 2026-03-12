import type { TextEditor } from 'vscode';
import * as path from 'path';

export type ActionKind = 'explain' | 'refactor' | 'fix' | 'add_tests' | 'add_docs';

export interface SelectionContext {
  code: string;
  language: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
}

export function buildActionPrompt(kind: ActionKind, ctx: SelectionContext): string {
  const block = `\n\n\`\`\`${ctx.language}\n${ctx.code}\n\`\`\``;
  const loc = `from ${ctx.filePath} (lines ${ctx.lineStart}-${ctx.lineEnd})`;
  switch (kind) {
    case 'explain':
      return `Explain the following ${ctx.language} code ${loc}:${block}\n\nProvide a clear, concise explanation of what it does, key design choices, and any potential issues.`;
    case 'refactor':
      return `Refactor the following ${ctx.language} code ${loc} for readability, performance, and best practices:${block}\n\nShow the refactored version and explain the key changes.`;
    case 'fix':
      return `Find and fix bugs in the following ${ctx.language} code ${loc}:${block}\n\nIdentify each bug, explain why it's a bug, and provide the corrected code.`;
    case 'add_tests':
      return `Write comprehensive unit tests for the following ${ctx.language} code ${loc}:${block}\n\nCover happy paths, edge cases, and error cases.`;
    case 'add_docs':
      return `Add documentation comments to the following ${ctx.language} code ${loc}:${block}\n\nUse the appropriate doc format for the language (JSDoc, docstrings, etc).`;
    default:
      return `Review the following ${ctx.language} code ${loc}:${block}`;
  }
}

export function getSelectionContext(
  editor: TextEditor,
  workspaceRoot: string
): SelectionContext | null {
  if (editor.selection.isEmpty) return null;
  const doc = editor.document;
  const selection = editor.selection;
  const code = doc.getText(selection);
  const filePath = path.relative(workspaceRoot, doc.uri.fsPath);
  const lineStart = selection.start.line + 1;
  const lineEnd = selection.end.line + 1;
  return {
    code,
    language: doc.languageId,
    filePath,
    lineStart,
    lineEnd,
  };
}
