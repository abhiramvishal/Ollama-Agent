import * as vscode from 'vscode';
import * as path from 'path';

const CONTEXT_LINES = 10;  // lines before/after the error to include

export function buildDiagnosticPrompt(
  document: vscode.TextDocument,
  diag: vscode.Diagnostic,
  workspaceRoot: string
): string {
  const filePath = path.relative(workspaceRoot, document.uri.fsPath);
  const severity = diag.severity === vscode.DiagnosticSeverity.Error ? 'Error' : 'Warning';
  const errorLine = diag.range.start.line;

  // Grab surrounding context
  const startLine = Math.max(0, errorLine - CONTEXT_LINES);
  const endLine   = Math.min(document.lineCount - 1, errorLine + CONTEXT_LINES);
  const contextRange = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
  const code = document.getText(contextRange);

  const source = diag.source ? ` [${diag.source}]` : '';
  const diagCode = diag.code
    ? ` (${typeof diag.code === 'object' ? diag.code.value : diag.code})`
    : '';

  return (
    `Fix the following ${severity.toLowerCase()} in ${filePath} at line ${errorLine + 1}:\n\n` +
    `**${severity}${source}${diagCode}:** ${diag.message}\n\n` +
    `Here is the surrounding code (lines ${startLine + 1}-${endLine + 1}):\n\n` +
    `\`\`\`${document.languageId}\n${code}\n\`\`\`\n\n` +
    `Provide the corrected code and a brief explanation of the fix.`
  );
}
