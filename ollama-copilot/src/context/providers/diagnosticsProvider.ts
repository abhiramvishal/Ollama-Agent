import * as vscode from 'vscode';
import type { ContextProvider } from '../contextRegistry';

export function createDiagnosticsProvider(): ContextProvider {
  return {
    name: 'diagnostics',
    priority: 80,
    maxChars: 2000,
    async getContext(): Promise<string> {
      const lines: string[] = [];
      for (const [uri, diags] of vscode.languages.getDiagnostics()) {
        const rel = vscode.workspace.asRelativePath(uri);
        for (const d of diags) {
          if (d.severity === vscode.DiagnosticSeverity.Error || d.severity === vscode.DiagnosticSeverity.Warning) {
            const severity = d.severity === vscode.DiagnosticSeverity.Error ? 'Error' : 'Warning';
            const line = (d.range.start.line + 1);
            lines.push(`${severity} at ${rel}:${line} - ${d.message}`);
          }
        }
      }
      return lines.length ? lines.join('\n') : '';
    },
  };
}
