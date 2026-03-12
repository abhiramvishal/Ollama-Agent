import * as vscode from 'vscode';

const CODE_LANGS = new Set([
  'typescript', 'javascript', 'typescriptreact', 'javascriptreact',
  'python', 'go', 'rust', 'java', 'c', 'cpp', 'csharp', 'php', 'ruby',
  'swift', 'kotlin', 'scala', 'lua', 'r', 'dart'
]);

function getDeclRegex(languageId: string): RegExp | null {
  const lang = languageId.toLowerCase();
  if (lang === 'typescript' || lang === 'javascript' || lang === 'ts' || lang === 'js') {
    return /^\s*(export\s+)?(async\s+)?function\s+\w+|^\s*(export\s+)?class\s+\w+/;
  }
  if (lang === 'python' || lang === 'py') {
    return /^\s*def\s+\w+|^\s*class\s+\w+/;
  }
  if (lang === 'go') {
    return /^\s*func\s+\w+/;
  }
  if (lang === 'rust' || lang === 'rs') {
    return /^\s*(pub\s+)?fn\s+\w+|^\s*(pub\s+)?struct\s+\w+/;
  }
  if (CODE_LANGS.has(lang)) {
    return /^\s*(function|class|def|func|fn)\s+\w+/;
  }
  return null;
}

export class OllamaCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const enabled = vscode.workspace.getConfiguration('clawpilot').get<boolean>('codeLensEnabled', true);
    if (!enabled) return [];

    const regex = getDeclRegex(document.languageId);
    if (!regex) return [];

    const lenses: vscode.CodeLens[] = [];
    const lines = document.getText().split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i] ?? '')) {
        const range = new vscode.Range(i, 0, i, (lines[i] ?? '').length);
        lenses.push(
          new vscode.CodeLens(range, {
            title: '$(claw) ClawPilot',
            command: 'clawpilot.codeLensAction',
            arguments: [document.uri, i],
          })
        );
      }
    }
    return lenses;
  }

  resolveCodeLens(
    lens: vscode.CodeLens,
    _token: vscode.CancellationToken
  ): vscode.CodeLens | Thenable<vscode.CodeLens> {
    return lens;
  }
}
