import * as vscode from 'vscode';
import { testApiKey, type ApiType } from '../providers/apiKeyTester';
import { SECRET_KEY_IDS } from '../providers/secretKeys';

function getNonce(): string {
  let t = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) t += possible.charAt(Math.floor(Math.random() * possible.length));
  return t;
}

function getHtml(extensionUri: vscode.Uri, nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClawPilot: API Keys</title>
  <style nonce="${nonce}">
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family); font-size: 13px; color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 16px; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    .warning { background: var(--vscode-inputValidation-warningBackground); border-left: 4px solid var(--vscode-inputValidation-warningBorder); padding: 10px 12px; margin: 12px 0; font-size: 12px; }
    .section { border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 12px; margin: 12px 0; background: var(--vscode-editor-inactiveSelectionBackground); }
    .section h2 { font-size: 14px; margin-bottom: 8px; color: var(--vscode-descriptionForeground); }
    input[type="password"], input[type="text"] { width: 100%; padding: 6px 8px; margin: 4px 0; font-family: monospace; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); color: var(--vscode-input-foreground); border-radius: 4px; }
    .row { display: flex; align-items: center; gap: 8px; margin: 6px 0; flex-wrap: wrap; }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .status { font-size: 12px; margin-left: 8px; }
    .status.not-set { color: var(--vscode-descriptionForeground); }
    .status.valid { color: var(--vscode-testing-iconPassed); }
    .status.invalid { color: var(--vscode-testing-iconFailed); }
    .save-row { margin-top: 16px; }
  </style>
</head>
<body>
  <h1>ClawPilot: API Keys</h1>
  <p class="warning"><strong>API keys are only needed for premium models.</strong> Local models (Ollama, LM Studio, etc.) are free. Only add keys here if you want to use Anthropic, OpenAI, or Google Gemini.</p>

  <div class="section">
    <h2>Anthropic (Claude)</h2>
    <input type="password" id="anthropicKey" placeholder="sk-ant-..." />
    <div class="row">
      <button id="testAnthropic">Test</button>
      <span id="statusAnthropic" class="status not-set">Not set</span>
    </div>
  </div>
  <div class="section">
    <h2>OpenAI (GPT)</h2>
    <input type="password" id="openaiKey" placeholder="sk-..." />
    <div class="row">
      <button id="testOpenai">Test</button>
      <span id="statusOpenai" class="status not-set">Not set</span>
    </div>
  </div>
  <div class="section">
    <h2>Google (Gemini)</h2>
    <input type="password" id="googleKey" placeholder="AIza..." />
    <div class="row">
      <button id="testGoogle">Test</button>
      <span id="statusGoogle" class="status not-set">Not set</span>
    </div>
  </div>

  <div class="row save-row">
    <button id="saveBtn">Save keys</button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const $ = id => document.getElementById(id);
    const apis = ['anthropic', 'openai', 'google'];

    function setStatus(api, state, text) {
      const el = $('status' + api.charAt(0).toUpperCase() + api.slice(1));
      if (!el) return;
      el.className = 'status ' + state;
      el.textContent = text;
    }

    apis.forEach(api => {
      $('test' + api.charAt(0).toUpperCase() + api.slice(1)).onclick = () => {
        const key = $(api + 'Key').value.trim();
        if (!key) { setStatus(api, 'invalid', 'Enter a key first'); return; }
        setStatus(api, 'not-set', 'Testing...');
        vscode.postMessage({ command: 'testKey', apiType: api, apiKey: key });
      };
    });

    $('saveBtn').onclick = () => {
      const keys = {};
      apis.forEach(api => {
        keys[api] = $(api + 'Key').value.trim();
      });
      vscode.postMessage({ command: 'saveKeys', keys });
    };

    window.addEventListener('message', e => {
      const msg = e.data;
      if (msg.command === 'keyStatus') {
        apis.forEach(api => {
          const has = msg[api];
          setStatus(api, 'not-set', has ? 'Saved (click Test to verify)' : 'Not set');
        });
      }
      if (msg.command === 'testResult') {
        const api = msg.apiType;
        if (msg.ok) setStatus(api, 'valid', 'Valid');
        else setStatus(api, 'invalid', msg.error || 'Invalid');
      }
      if (msg.command === 'saved') {
        apis.forEach(api => setStatus(api, 'not-set', msg[api] ? 'Saved (click Test to verify)' : 'Not set'));
      }
    });

    vscode.postMessage({ command: 'loadKeyStatus' });
  </script>
</body>
</html>`;
}

export function openApiKeyPanel(extensionUri: vscode.Uri, context: vscode.ExtensionContext): void {
  const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
  const panel = vscode.window.createWebviewPanel(
    'clawpilot.apiKeys',
    'ClawPilot: API Keys',
    column,
    {
      enableScripts: true,
      localResourceRoots: [extensionUri],
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = getHtml(extensionUri, getNonce());

  panel.webview.onDidReceiveMessage(async (msg: { command: string; apiType?: ApiType; apiKey?: string; keys?: Partial<Record<ApiType, string>> }) => {
    if (msg.command === 'loadKeyStatus') {
      const anthropic = !!(await context.secrets.get(SECRET_KEY_IDS.anthropic));
      const openai = !!(await context.secrets.get(SECRET_KEY_IDS.openai));
      const google = !!(await context.secrets.get(SECRET_KEY_IDS.google));
      panel.webview.postMessage({ command: 'keyStatus', anthropic, openai, google });
    }
    if (msg.command === 'testKey' && msg.apiType && msg.apiKey !== undefined) {
      const result = await testApiKey(msg.apiType, msg.apiKey);
      panel.webview.postMessage({
        command: 'testResult',
        apiType: msg.apiType,
        ok: result.ok,
        error: result.error,
      });
    }
    if (msg.command === 'saveKeys' && msg.keys) {
      const k = msg.keys as Partial<Record<ApiType, string>>;
      for (const api of ['anthropic', 'openai', 'google'] as const) {
        const val = k[api];
        const id = SECRET_KEY_IDS[api];
        if (val) await context.secrets.store(id, val);
        else await context.secrets.delete(id);
      }
      const anthropic = !!(k.anthropic && k.anthropic.length);
      const openai = !!(k.openai && k.openai.length);
      const google = !!(k.google && k.google.length);
      panel.webview.postMessage({ command: 'saved', anthropic, openai, google });
    }
  });

  context.subscriptions.push(panel);
}
