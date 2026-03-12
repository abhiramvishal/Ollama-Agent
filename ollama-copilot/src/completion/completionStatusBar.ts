import * as vscode from 'vscode';

// Status bar item showing whether inline completions are on/off.
// Clicking it toggles ollamaCopilot.inlineCompletionsEnabled.

export class CompletionStatusBar {
  private _item: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this._item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this._item.command = 'ollamaCopilot.toggleCompletions';
    context.subscriptions.push(this._item);
    this._update();

    // Re-render when config changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('ollamaCopilot.inlineCompletionsEnabled')) {
          this._update();
        }
      })
    );

    this._item.show();
  }

  private _update(): void {
    const enabled = vscode.workspace.getConfiguration('ollamaCopilot')
      .get<boolean>('inlineCompletionsEnabled', true);
    this._item.text = enabled ? '$(sparkle) Ollama' : '$(circle-slash) Ollama';
    this._item.tooltip = enabled
      ? 'Ollama inline completions: ON (click to disable)'
      : 'Ollama inline completions: OFF (click to enable)';
    this._item.color = enabled ? undefined : new vscode.ThemeColor('statusBarItem.warningForeground');
  }
}
