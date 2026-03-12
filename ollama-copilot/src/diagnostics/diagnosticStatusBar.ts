import * as vscode from 'vscode';

// Shows error/warning counts in the status bar, updates on every
// onDidChangeDiagnostics event. Clicking opens the Problems panel.

export class DiagnosticStatusBar {
  private _item: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this._item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      90
    );
    this._item.command = 'workbench.actions.view.problems';
    context.subscriptions.push(this._item);

    this._update();

    context.subscriptions.push(
      vscode.languages.onDidChangeDiagnostics(() => this._update())
    );

    this._item.show();
  }

  private _update(): void {
    let errors = 0;
    let warnings = 0;

    for (const [, diags] of vscode.languages.getDiagnostics()) {
      for (const d of diags) {
        if (d.severity === vscode.DiagnosticSeverity.Error)   errors++;
        if (d.severity === vscode.DiagnosticSeverity.Warning) warnings++;
      }
    }

    this._item.text = `$(error) ${errors}  $(warning) ${warnings}`;
    this._item.tooltip = `${errors} error(s), ${warnings} warning(s) — click to open Problems`;
    this._item.color = errors > 0
      ? new vscode.ThemeColor('statusBarItem.errorForeground')
      : warnings > 0
        ? new vscode.ThemeColor('statusBarItem.warningForeground')
        : undefined;
  }
}
