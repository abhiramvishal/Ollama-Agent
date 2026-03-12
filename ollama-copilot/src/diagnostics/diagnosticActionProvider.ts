import * as vscode from 'vscode';

export class OllamaDiagnosticActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    // Filter to errors and warnings only (ignore hints/info)
    const relevant = context.diagnostics.filter(
      d => d.severity === vscode.DiagnosticSeverity.Error ||
           d.severity === vscode.DiagnosticSeverity.Warning
    );
    if (!relevant.length) return [];

    return relevant.map(diag => {
      const severity = diag.severity === vscode.DiagnosticSeverity.Error ? 'error' : 'warning';
      const action = new vscode.CodeAction(
        `Fix ${severity} with Ollama: ${diag.message.slice(0, 60)}${diag.message.length > 60 ? '…' : ''}`,
        vscode.CodeActionKind.QuickFix
      );
      action.diagnostics = [diag];
      action.isPreferred = false;
      action.command = {
        command: 'ollamaCopilot.fixDiagnostic',
        title: 'Fix with Ollama',
        arguments: [document, diag]
      };
      return action;
    });
  }
}
