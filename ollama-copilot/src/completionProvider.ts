import * as vscode from 'vscode';
import { OllamaClient } from './ollamaClient';
import { cleanCompletionText } from './utils';

const LINES_BEFORE = 40;
const LINES_AFTER = 10;

function getFimPrompt(
  model: string,
  prefix: string,
  suffix: string,
  languageId: string
): string {
  const lower = model.toLowerCase();
  // DeepSeek Coder / Qwen Coder
  if (lower.includes('deepseek') || lower.includes('qwen2.5-coder') || lower.includes('qwen') && lower.includes('coder')) {
    return `<|fim_prefix|>${prefix}<|fim_suffix|>${suffix}<|fim_middle|>`;
  }
  // StarCoder2 / CodeLlama
  if (lower.includes('starcoder') || lower.includes('codellama')) {
    return `<fim_prefix>${prefix}<fim_suffix>${suffix}<fim_middle>`;
  }
  // Fallback: prefix with language comment
  const comment = getLanguageComment(languageId);
  return comment ? `${comment}\n${prefix}` : prefix;
}

function getLanguageComment(lang: string): string {
  const map: Record<string, string> = {
    javascript: '//',
    typescript: '//',
    javascriptreact: '//',
    typescriptreact: '//',
    java: '//',
    c: '//',
    cpp: '//',
    csharp: '//',
    go: '//',
    rust: '//',
    python: '#',
    ruby: '#',
    shell: '#',
    perl: '#',
    php: '//',
    sql: '--',
    html: '<!--',
    css: '/*',
    scss: '//',
    json: '//',
    yaml: '#',
    markdown: '<!--',
  };
  const c = map[lang];
  return c ? `${c} Code completion context` : '';
}

export class OllamaCompletionProvider implements vscode.InlineCompletionItemProvider {
  private client: OllamaClient;
  private statusBarItem: vscode.StatusBarItem;
  private debounceMs: number;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private lastRequestAbort: AbortController | undefined;

  constructor(client: OllamaClient, statusBarItem: vscode.StatusBarItem) {
    this.client = client;
    this.statusBarItem = statusBarItem;
    const config = vscode.workspace.getConfiguration('ollamaCopilot');
    this.debounceMs = config.get<number>('completionDebounceMs', 600);
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | null> {
    const config = vscode.workspace.getConfiguration('ollamaCopilot');
    if (!config.get<boolean>('enableInlineCompletion', true)) {
      return null;
    }
    this.debounceMs = config.get<number>('completionDebounceMs', 600);

    // Debounce: wait before issuing request
    await this.debounce(token);
    if (token.isCancellationRequested) return null;

    const model = config.get<string>('model', 'llama3');
    const maxTokens = config.get<number>('maxTokens', 512);
    const languageId = document.languageId;

    const lineCount = document.lineCount;
    const startLine = Math.max(0, position.line - LINES_BEFORE);
    const endLine = Math.min(lineCount, position.line + LINES_AFTER);
    const prefix = document.getText(
      new vscode.Range(new vscode.Position(startLine, 0), position)
    );
    const suffix = document.getText(
      new vscode.Range(position, new vscode.Position(endLine, document.lineAt(endLine - 1).text.length))
    );

    const prompt = getFimPrompt(model, prefix, suffix, languageId);

    this.statusBarItem.text = '$(loading~spin) Ollama';
    this.statusBarItem.tooltip = 'Ollama is generating completion...';
    this.lastRequestAbort = new AbortController();

    try {
      const chunks: string[] = [];
      for await (const chunk of this.client.streamGenerate(
        prompt,
        model,
        maxTokens,
        ['\n\n', '```']
      )) {
        if (token.isCancellationRequested) {
          this.statusBarItem.text = '$(sparkle) Ollama';
          this.statusBarItem.tooltip = undefined;
          return null;
        }
        chunks.push(chunk);
      }

      let raw = chunks.join('');
      const cleaned = cleanCompletionText(raw, prefix);
      this.statusBarItem.text = '$(sparkle) Ollama';
      this.statusBarItem.tooltip = undefined;

      if (!cleaned) return null;
      return [new vscode.InlineCompletionItem(cleaned)];
    } catch (err) {
      this.statusBarItem.text = '$(sparkle) Ollama';
      this.statusBarItem.tooltip = undefined;
      return null;
    }
  }

  private debounce(token: vscode.CancellationToken): Promise<void> {
    return new Promise((resolve) => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = undefined;
        resolve();
      }, this.debounceMs);
      token.onCancellationRequested(() => {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = undefined;
        }
        resolve();
      });
    });
  }
}
