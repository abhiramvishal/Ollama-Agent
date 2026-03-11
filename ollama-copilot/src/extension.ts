import * as vscode from 'vscode';
import { OllamaClient, KNOWN_MODELS } from './ollamaClient';
import { OllamaCompletionProvider } from './completionProvider';
import { ChatViewProvider } from './chatViewProvider';

let statusBarItem: vscode.StatusBarItem;
let chatProvider: ChatViewProvider;

export function activate(context: vscode.ExtensionContext): void {
  const client = new OllamaClient();
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(sparkle) Ollama';
  statusBarItem.command = 'ollamaCopilot.openChat';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  chatProvider = new ChatViewProvider(client);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChatViewProvider.viewId,
      chatProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  const completionProvider = new OllamaCompletionProvider(client, statusBarItem);
  context.subscriptions.push(
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: '**' },
      completionProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ollamaCopilot.openChat', () => {
      vscode.commands.executeCommand('ollamaCopilot.chatView.focus');
      chatProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ollamaCopilot.explainCode', () => runCodeAction('explain'))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('ollamaCopilot.refactorCode', () => runCodeAction('refactor'))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('ollamaCopilot.fixCode', () => runCodeAction('fix'))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('ollamaCopilot.generateDocs', () => runCodeAction('docs'))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ollamaCopilot.selectModel', async () => {
      client.refreshConfig();
      let installed: { name: string }[] = [];
      try {
        const models = await client.listModels();
        installed = models.map((m) => ({ name: m.name }));
      } catch {
        // offline
      }
      const installedSet = new Set(installed.map((m) => m.name));
      const items: vscode.QuickPickItem[] = [
        ...installed.map((m) => ({ label: `$(check) ${m.name}`, description: 'Installed', detail: m.name })),
        { label: '$(package) Known models (pull to use)', kind: vscode.QuickPickItemKind.Separator },
        ...KNOWN_MODELS.filter((m) => !installedSet.has(m.name)).map((m) => ({
          label: m.label,
          description: m.category,
          detail: m.name,
        })),
      ];
      const picked = await vscode.window.showQuickPick(items, {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Select Ollama model',
      });
      if (picked && 'detail' in picked && picked.detail) {
        const name = picked.detail;
        await vscode.workspace.getConfiguration('ollamaCopilot').update('model', name, vscode.ConfigurationTarget.Global);
        statusBarItem.text = `$(sparkle) Ollama (${name})`;
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ollamaCopilot.pullModel', async () => {
      const items = KNOWN_MODELS.map((m) => ({ label: m.label, description: m.category, detail: m.name }));
      const picked = await vscode.window.showQuickPick(items, {
        matchOnDescription: true,
        placeHolder: 'Select model to pull',
      });
      if (!picked || !('detail' in picked) || !picked.detail) return;
      const name = picked.detail as string;
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Pulling ${name}`,
            cancellable: false,
          },
          async (progress) => {
            await client.pullModel(name, (status) => progress.report({ message: status }));
          }
        );
        await vscode.workspace.getConfiguration('ollamaCopilot').update('model', name, vscode.ConfigurationTarget.Global);
        statusBarItem.text = `$(sparkle) Ollama (${name})`;
        vscode.window.showInformationMessage(`Ollama: ${name} ready.`);
        chatProvider.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Ollama pull failed: ${message}`);
      }
    })
  );

  // Startup: warn if Ollama not available
  client.isAvailable().then((available) => {
    if (!available) {
      const openDocs = 'Open Docs';
      vscode.window.showWarningMessage(
        'Ollama Copilot: Ollama is not running or not reachable. Install and start Ollama to use this extension.',
        openDocs
      ).then((choice) => {
        if (choice === openDocs) {
          vscode.env.openExternal(vscode.Uri.parse('https://ollama.com'));
        }
      });
    }
  });
}

function runCodeAction(action: 'explain' | 'refactor' | 'fix' | 'docs'): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showWarningMessage('Select some code first.');
    return;
  }
  const code = editor.document.getText(editor.selection);
  const language = editor.document.languageId;
  chatProvider.sendCodeAction(action, code, language);
  vscode.commands.executeCommand('ollamaCopilot.chatView.focus');
}

export function deactivate(): void {}
