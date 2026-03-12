import * as vscode from 'vscode';
import type { LLMProvider } from '../providers/llmProvider';

const DEBOUNCE_MS = 300;
const PREFIX_LINES = 40;   // lines before cursor to send as context
const SUFFIX_LINES = 10;   // lines after cursor to send as context
const MAX_TOKENS = 80;     // stop collecting once we have this many non-whitespace tokens

export class OllamaCompletionProvider implements vscode.InlineCompletionItemProvider {
  private _client: LLMProvider;
  private _model: string;
  private _debounceTimer: NodeJS.Timeout | undefined;
  private _pendingCancel: vscode.CancellationTokenSource | undefined;
  private _pendingResolve: ((v: vscode.InlineCompletionList | null) => void) | undefined;

  constructor(client: LLMProvider, model: string) {
    this._client = client;
    this._model = model;
  }

  updateModel(model: string): void {
    this._model = model;
  }

  setClient(client: LLMProvider): void {
    this._client = client;
  }

  provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionList | null> {
    // Cancel any in-flight request
    this._pendingCancel?.cancel();
    this._pendingCancel = new vscode.CancellationTokenSource();
    const cts = this._pendingCancel;

    // Cancel if VS Code cancels
    token.onCancellationRequested(() => cts.cancel());

    return new Promise((resolve) => {
      // Resolve the previous pending promise with null before replacing it
      this._pendingResolve?.(null);
      this._pendingResolve = resolve;

      if (this._debounceTimer) clearTimeout(this._debounceTimer);

      this._debounceTimer = setTimeout(async () => {
        this._pendingResolve = undefined;
        if (cts.token.isCancellationRequested) { resolve(null); return; }

        // Check config each time (user may toggle)
        const cfg = vscode.workspace.getConfiguration('clawpilot');
        if (!cfg.get<boolean>('inlineCompletionsEnabled', true)) {
          resolve(null); return;
        }

        const prefix = this._getPrefix(document, position);
        const suffix = this._getSuffix(document, position);

        // Skip trivial positions: blank line with only whitespace in prefix line
        const currentLine = document.lineAt(position.line).text.slice(0, position.character).trim();
        if (!currentLine && prefix.split('\n').slice(-3).every(l => !l.trim())) {
          resolve(null); return;
        }

        try {
          const completion = await this._fetchCompletion(prefix, suffix, document.languageId, cts.token);
          if (!completion || cts.token.isCancellationRequested) { resolve(null); return; }

          const item = new vscode.InlineCompletionItem(
            completion,
            new vscode.Range(position, position)
          );
          resolve(new vscode.InlineCompletionList([item]));
        } catch {
          resolve(null);
        }
      }, DEBOUNCE_MS);
    });
  }

  private _getPrefix(doc: vscode.TextDocument, pos: vscode.Position): string {
    const startLine = Math.max(0, pos.line - PREFIX_LINES);
    const range = new vscode.Range(startLine, 0, pos.line, pos.character);
    return doc.getText(range);
  }

  private _getSuffix(doc: vscode.TextDocument, pos: vscode.Position): string {
    const endLine = Math.min(doc.lineCount - 1, pos.line + SUFFIX_LINES);
    const range = new vscode.Range(pos.line, pos.character, endLine, doc.lineAt(endLine).text.length);
    return doc.getText(range);
  }

  private async _fetchCompletion(
    prefix: string,
    suffix: string,
    language: string,
    cancelToken: vscode.CancellationToken
  ): Promise<string | null> {
    const systemPrompt =
      `You are a code completion engine. Complete the code at the cursor position.\n` +
      `Output ONLY the completion text — no explanation, no markdown fence, no repetition of the prefix.\n` +
      `Stop after completing the current logical statement or block.\n` +
      `Language: ${language}`;

    const userPrompt = `<PREFIX>\n${prefix}\n<SUFFIX>\n${suffix}\n<COMPLETION>`;

    let result = '';
    let lineCount = 0;
    let tokenCount = 0;
    const stopSeqs = ['<|endoftext|>', '</s>', '<EOT>'];

    try {
      for await (const chunk of this._client.streamChat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        this._model
      )) {
        if (cancelToken.isCancellationRequested) return null;

        result += chunk;
        tokenCount += chunk.split(/\s+/).filter(Boolean).length;
        lineCount += (chunk.match(/\n/g) || []).length;

        // Check stop sequences
        if (stopSeqs.some(s => result.includes(s))) {
          for (const s of stopSeqs) {
            const idx = result.indexOf(s);
            if (idx !== -1) result = result.slice(0, idx);
          }
          break;
        }

        // Triple newline = too much blank space
        if (result.includes('\n\n\n')) {
          result = result.slice(0, result.indexOf('\n\n\n'));
          break;
        }

        if (lineCount >= 5 || tokenCount >= MAX_TOKENS) break;
      }
    } catch {
      return null;
    }

    const trimmed = result.trimEnd();
    return trimmed.length > 0 ? trimmed : null;
  }
}
