import * as vscode from 'vscode';
import { OllamaClient, OllamaModel, KNOWN_MODELS, KnownModel } from './ollamaClient';
import { renderMarkdownToHtml } from './utils';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type CodeActionType = 'explain' | 'refactor' | 'fix' | 'docs';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'ollamaCopilot.chatView';
  private _view?: vscode.WebviewView;
  private _client: OllamaClient;
  private _chatHistory: ChatMessage[] = [];
  private _isStreaming = false;

  constructor(client: OllamaClient) {
    this._client = client;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((msg) => this._handleMessage(msg));
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ollama Copilot</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-sideBar-background);
      flex-shrink: 0;
    }
    .header-title { font-weight: 600; flex: 1; }
    .status-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--vscode-inputValidation-errorBorder);
    }
    .status-dot.online { background: var(--vscode-inputValidation-infoBorder); }
    .btn-icon {
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }
    .btn-icon:hover { background: var(--vscode-toolbar-hoverBackground); }
    .model-bar {
      padding: 6px 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-sideBar-background);
    }
    .model-bar select {
      width: 100%;
      padding: 6px 8px;
      font-size: 12px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
    }
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .msg { max-width: 95%; }
    .msg.user { align-self: flex-end; }
    .msg.assistant { align-self: flex-start; }
    .msg-bubble {
      padding: 10px 12px;
      border-radius: 8px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .msg.user .msg-bubble {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .msg.assistant .msg-bubble {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-panel-border);
    }
    .msg-bubble h1, .msg-bubble h2, .msg-bubble h3 { margin: 0.5em 0; }
    .msg-bubble ul { margin: 0.5em 0; padding-left: 1.5em; }
    .inline-code { background: var(--vscode-textBlockQuote-background); padding: 0 4px; border-radius: 4px; }
    .code-block {
      margin: 8px 0;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      overflow: hidden;
    }
    .code-block-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      background: var(--vscode-sideBar-background);
      font-size: 11px;
    }
    .code-actions { display: flex; gap: 4px; }
    .code-btn {
      padding: 2px 8px;
      font-size: 11px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .code-btn:hover { opacity: 0.9; }
    .code-block pre { margin: 0; padding: 10px; overflow-x: auto; }
    .code-block code { font-family: var(--vscode-editor-font-family); font-size: 12px; }
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .empty-state.hidden { display: none; }
    .empty-icon { font-size: 48px; margin-bottom: 12px; }
    .empty-tagline { color: var(--vscode-descriptionForeground); margin-bottom: 20px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
    .chip {
      padding: 8px 14px;
      border-radius: 16px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      cursor: pointer;
      font-size: 12px;
    }
    .chip:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .input-area {
      padding: 10px 12px;
      border-top: 1px solid var(--vscode-panel-border);
      background: var(--vscode-sideBar-background);
      flex-shrink: 0;
    }
    .input-wrap { position: relative; }
    .input-area textarea {
      width: 100%;
      min-height: 44px;
      max-height: 120px;
      padding: 8px 36px 8px 8px;
      resize: none;
      font-family: inherit;
      font-size: inherit;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px;
    }
    .input-area textarea:focus { outline: 1px solid var(--vscode-focusBorder); }
    .send-btn {
      position: absolute;
      right: 6px;
      bottom: 6px;
      padding: 4px 10px;
      font-size: 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .send-btn:hover { opacity: 0.9; }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .selection-badge {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
    .typing {
      display: flex; gap: 4px; padding: 10px 12px; align-items: center;
    }
    .typing-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--vscode-foreground);
      opacity: 0.6;
      animation: bounce 0.6s ease-in-out infinite;
    }
    .typing-dot:nth-child(2) { animation-delay: 0.1s; }
    .typing-dot:nth-child(3) { animation-delay: 0.2s; }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  </style>
</head>
<body>
  <div class="header">
    <span class="header-emoji">🦙</span>
    <span class="header-title">Ollama Copilot</span>
    <span class="status-dot" id="statusDot"></span>
    <button class="btn-icon" id="clearBtn" title="Clear chat">Clear</button>
  </div>
  <div class="model-bar">
    <select id="modelSelect">
      <option value="">Loading models...</option>
    </select>
  </div>
  <div class="messages" id="messages"></div>
  <div class="empty-state" id="emptyState">
    <div class="empty-icon">💬</div>
    <div class="empty-tagline">Ask anything. Code, explain, refactor — 100% local.</div>
    <div class="chips">
      <button class="chip" data-prompt="explain">Explain selection</button>
      <button class="chip" data-prompt="tests">Write unit tests</button>
      <button class="chip" data-prompt="refactor">Refactor this</button>
      <button class="chip" data-prompt="debug">Debug this</button>
    </div>
  </div>
  <div class="input-area">
    <div class="input-wrap">
      <textarea id="input" placeholder="Message Ollama..." rows="2"></textarea>
      <button class="send-btn" id="sendBtn">Send</button>
    </div>
    <div class="selection-badge" id="selectionBadge" style="display:none;">Selection will be included</div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const emptyState = document.getElementById('emptyState');
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('sendBtn');
    const modelSelect = document.getElementById('modelSelect');
    const statusDot = document.getElementById('statusDot');
    const clearBtn = document.getElementById('clearBtn');
    const selectionBadge = document.getElementById('selectionBadge');

    function addMessage(role, content, isHtml) {
      const div = document.createElement('div');
      div.className = 'msg ' + role;
      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      if (isHtml) bubble.innerHTML = content;
      else bubble.textContent = content;
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      emptyState.classList.add('hidden');
    }

    function showTyping() {
      const div = document.createElement('div');
      div.className = 'msg assistant';
      div.id = 'typingIndicator';
      div.innerHTML = '<div class="msg-bubble typing"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>';
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function hideTyping() {
      const el = document.getElementById('typingIndicator');
      if (el) el.remove();
    }

    function setStreamingBubble(content) {
      let el = document.getElementById('streamBubble');
      if (!el) {
        const div = document.createElement('div');
        div.className = 'msg assistant';
        div.id = 'streamContainer';
        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        bubble.id = 'streamBubble';
        div.appendChild(bubble);
        messagesEl.appendChild(div);
        el = bubble;
      }
      el.innerHTML = content;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function finalizeStream(content) {
      const container = document.getElementById('streamContainer');
      if (container) {
        container.id = '';
        const bubble = container.querySelector('.msg-bubble');
        if (bubble) bubble.innerHTML = content;
        attachCodeButtons(container);
      }
    }

    function attachCodeButtons(container) {
      if (!container) container = messagesEl;
      container.querySelectorAll('.insert-btn').forEach(btn => {
        btn.onclick = () => {
          const code = btn.getAttribute('data-code');
          if (code != null) vscode.postMessage({ type: 'insertCode', code: code });
        };
      });
      container.querySelectorAll('.copy-btn').forEach(btn => {
        btn.onclick = () => {
          const code = btn.getAttribute('data-code');
          if (code != null) navigator.clipboard.writeText(code);
        };
      });
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    sendBtn.addEventListener('click', () => {
      const text = input.value.trim();
      if (!text) return;
      vscode.postMessage({ type: 'sendMessage', text });
      addMessage('user', text, false);
      showTyping();
      input.value = '';
      input.style.height = 'auto';
    });

    clearBtn.addEventListener('click', () => vscode.postMessage({ type: 'clearChat' }));

    modelSelect.addEventListener('change', () => {
      vscode.postMessage({ type: 'changeModel', value: modelSelect.value });
    });

    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        const text = { explain: 'Explain the selected code.', tests: 'Write unit tests for the selected code.', refactor: 'Refactor the selected code.', debug: 'Help me debug the selected code.' }[prompt] || '';
        if (text) {
          input.value = text;
          input.focus();
        }
      });
    });

    window.addEventListener('message', (e) => {
      const msg = e.data;
      switch (msg.type) {
        case 'streamStart':
          hideTyping();
          break;
        case 'streamChunk':
          setStreamingBubble(msg.content);
          break;
        case 'streamEnd':
          finalizeStream(msg.content);
          break;
        case 'streamError':
          hideTyping();
          addMessage('assistant', 'Error: ' + (msg.error || 'Unknown error'), false);
          break;
        case 'cleared':
          messagesEl.innerHTML = '';
          emptyState.classList.remove('hidden');
          break;
        case 'modelList':
          modelSelect.innerHTML = '';
          (msg.installed || []).forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.name;
            opt.textContent = '✅ ' + m.name;
            if (msg.current === m.name) opt.selected = true;
            modelSelect.appendChild(opt);
          });
          (msg.groups || []).forEach(g => {
            const group = document.createElement('optgroup');
            group.label = g.label;
            (g.models || []).forEach(m => {
              const opt = document.createElement('option');
              opt.value = m.name;
              opt.textContent = m.label || m.name;
              group.appendChild(opt);
            });
            if (group.childNodes.length) modelSelect.appendChild(group);
          });
          if (msg.current && !modelSelect.value) modelSelect.value = msg.current;
          break;
        case 'connectionStatus':
          statusDot.classList.toggle('online', msg.available);
          break;
        case 'selectionContext':
          selectionBadge.style.display = msg.hasSelection ? 'block' : 'none';
          break;
      }
    });

    vscode.postMessage({ type: 'getModels' });
    vscode.postMessage({ type: 'getSelectionContext' });
    vscode.postMessage({ type: 'getConnectionStatus' });
  </script>
</body>
</html>`;
  }

  private async _handleMessage(msg: { type: string; text?: string; value?: string; code?: string }) {
    if (!this._view) return;
    const webview = this._view.webview;
    switch (msg.type) {
      case 'getModels':
        await this._sendModelList(webview);
        break;
      case 'sendMessage':
        if (msg.text) await this._handleChat(msg.text);
        break;
      case 'changeModel':
        if (msg.value !== undefined) {
          await vscode.workspace.getConfiguration('ollamaCopilot').update('model', msg.value, vscode.ConfigurationTarget.Global);
          await this._sendModelList(webview);
        }
        break;
      case 'clearChat':
        this._chatHistory = [];
        webview.postMessage({ type: 'cleared' });
        break;
      case 'insertCode':
        if (msg.code !== undefined) {
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            const selection = editor.selection;
            await editor.edit((eb) => {
              if (selection.isEmpty) {
                eb.insert(selection.start, msg.code!);
              } else {
                eb.replace(selection, msg.code!);
              }
            });
          }
        }
        break;
      case 'getSelectionContext':
        this._updateSelectionBadge(webview);
        break;
      case 'getConnectionStatus':
        this._client.isAvailable().then((available) => {
          webview.postMessage({ type: 'connectionStatus', available });
        });
        break;
    }
  }

  private async _sendModelList(webview: vscode.Webview) {
    const config = vscode.workspace.getConfiguration('ollamaCopilot');
    const current = config.get<string>('model', 'llama3');
    let installed: OllamaModel[] = [];
    try {
      installed = await this._client.listModels();
    } catch {
      // offline
    }
    const installedNames = new Set(installed.map((m) => m.name));
    const groups: { label: string; models: KnownModel[] }[] = [];
    const code = KNOWN_MODELS.filter((m) => m.category === 'code' && !installedNames.has(m.name));
    const general = KNOWN_MODELS.filter((m) => m.category === 'general' && !installedNames.has(m.name));
    const small = KNOWN_MODELS.filter((m) => m.category === 'small' && !installedNames.has(m.name));
    if (code.length) groups.push({ label: '📦 Code — pull to use', models: code });
    if (general.length) groups.push({ label: '📦 General — pull to use', models: general });
    if (small.length) groups.push({ label: '📦 Small/Fast — pull to use', models: small });
    webview.postMessage({
      type: 'modelList',
      installed: installed.map((m) => ({ name: m.name })),
      groups,
      current,
    });
  }

  private _updateSelectionBadge(webview: vscode.Webview) {
    const editor = vscode.window.activeTextEditor;
    const hasSelection = !!(editor && !editor.selection.isEmpty);
    webview.postMessage({ type: 'selectionContext', hasSelection });
  }

  private async _handleChat(userText: string) {
    if (!this._view || this._isStreaming) return;
    const config = vscode.workspace.getConfiguration('ollamaCopilot');
    const model = config.get<string>('model', 'llama3');
    const maxTokens = config.get<number>('maxTokens', 512);
    const systemPrompt = config.get<string>('systemPrompt', 'You are an expert coding assistant. Be concise, accurate, and helpful.');

    let fullUserMessage = userText;
    const editor = vscode.window.activeTextEditor;
    if (editor && !editor.selection.isEmpty) {
      const selection = editor.document.getText(editor.selection);
      const lang = editor.document.languageId;
      fullUserMessage = userText + '\n\n```' + lang + '\n' + selection + '\n```';
    }

    this._chatHistory.push({ role: 'user', content: fullUserMessage });
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...this._chatHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    this._isStreaming = true;
    this._view.webview.postMessage({ type: 'streamStart' });
    const chunks: string[] = [];
    try {
      for await (const chunk of this._client.streamChat(messages, model, maxTokens)) {
        chunks.push(chunk);
        const html = renderMarkdownToHtml(chunks.join(''));
        this._view?.webview.postMessage({ type: 'streamChunk', content: html });
      }
      const fullContent = chunks.join('');
      this._chatHistory.push({ role: 'assistant', content: fullContent });
      const finalHtml = renderMarkdownToHtml(fullContent);
      this._view?.webview.postMessage({ type: 'streamEnd', content: finalHtml });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this._view?.webview.postMessage({ type: 'streamError', error: message });
    } finally {
      this._isStreaming = false;
    }
  }

  async sendCodeAction(action: CodeActionType, code: string, language: string): Promise<void> {
    const prompts: Record<CodeActionType, string> = {
      explain: `Explain the following code. Be concise.\n\n\`\`\`${language}\n${code}\n\`\`\``,
      refactor: `Refactor the following code. Keep the same behavior, improve clarity and style.\n\n\`\`\`${language}\n${code}\n\`\`\``,
      fix: `Find and fix bugs or issues in the following code.\n\n\`\`\`${language}\n${code}\n\`\`\``,
      docs: `Write clear documentation (comments or docblocks) for the following code.\n\n\`\`\`${language}\n${code}\n\`\`\``,
    };
    const text = prompts[action];
    if (text) await this._handleChat(text);
  }

  /** Call when view becomes visible to refresh connection status and selection. */
  refresh(): void {
    if (!this._view) return;
    this._client.isAvailable().then((available) => {
      this._view?.webview.postMessage({ type: 'connectionStatus', available });
    });
    this._updateSelectionBadge(this._view.webview);
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
