import * as vscode from 'vscode';
import { gitStatusParsed } from './gitClient';

export class GitStatusBar {
  private _item: vscode.StatusBarItem;
  private _timer: NodeJS.Timeout | undefined;

  constructor(context: vscode.ExtensionContext) {
    this._item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      85
    );
    this._item.command = 'ollamaCopilot.askGitStatus';
    context.subscriptions.push(this._item);

    this._update();
    this._timer = setInterval(() => this._update(), 30_000);

    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(() => this._update())
    );

    context.subscriptions.push({ dispose: () => { if (this._timer) clearInterval(this._timer); } });
    this._item.show();
  }

  private _update(): void {
    const status = gitStatusParsed();
    const dirty = status.dirtyCount > 0 ? ` $(pencil)${status.dirtyCount}` : '';
    this._item.text = `$(git-branch) ${status.branch}${dirty}`;
    this._item.tooltip = status.dirtyCount > 0
      ? `${status.dirtyCount} uncommitted change(s) — click to ask Ollama`
      : `Branch: ${status.branch} — click to ask Ollama`;
  }
}
