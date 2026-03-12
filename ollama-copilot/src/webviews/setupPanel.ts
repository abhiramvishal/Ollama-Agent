import * as vscode from 'vscode';
import * as path from 'path';
import { scanSystem } from '../system/systemScanner';
import type { SystemInfo } from '../system/systemScanner';
import { recommendModels } from '../system/modelRecommender';
import type { ModelRecommendation } from '../system/modelRecommender';
import { installOllama, startOllamaServer } from '../system/ollamaInstaller';

interface WebviewMessage {
  command: 'scanSystem' | 'installOllama' | 'installModel';
  model?: string;
}

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
  <title>ClawPilot Setup</title>
  <style nonce="${nonce}">
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family); font-size: 13px; color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 16px; }
    h1 { font-size: 18px; margin-bottom: 12px; }
    h2 { font-size: 14px; margin: 12px 0 8px; color: var(--vscode-descriptionForeground); }
    .specs { background: var(--vscode-textBlockQuote-background); border-left: 4px solid var(--vscode-focusBorder); padding: 10px 12px; margin: 8px 0; font-size: 12px; }
    .specs p { margin: 4px 0; }
    .card { border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 12px; margin: 8px 0; background: var(--vscode-editor-inactiveSelectionBackground); }
    .card.recommended { border-color: var(--vscode-focusBorder); }
    .card .badge { display: inline-block; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 8px; }
    .badge.installed { background: #4caf50; color: #fff; }
    .badge.rec { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
    .card .reason { font-size: 11px; color: var(--vscode-descriptionForeground); margin: 4px 0; }
    .card .meta { font-size: 11px; opacity: 0.8; margin: 4px 0; }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 6px; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .log { background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); padding: 8px; font-family: monospace; font-size: 11px; max-height: 120px; overflow-y: auto; margin: 8px 0; white-space: pre-wrap; }
    .progress { margin: 8px 0; height: 6px; background: var(--vscode-progressBar-background); border-radius: 3px; overflow: hidden; }
    .progress .fill { height: 100%; background: var(--vscode-progressBar-foreground); transition: width 0.2s; }
    .status { margin: 8px 0; font-size: 12px; }
    .done { color: #4caf50; margin: 12px 0; }
  </style>
</head>
<body>
  <h1>ClawPilot Setup</h1>
  <div id="step1">
    <h2>System summary</h2>
    <div id="specs" class="specs">Scanning...</div>
    <p class="status" id="ollamaStatus">Checking Ollama...</p>
    <h2>Recommended for you</h2>
    <div id="recommendations"></div>
  </div>
  <div id="step2" style="display:none">
    <h2>Install Ollama</h2>
    <button id="installOllamaBtn">Install Ollama automatically</button>
    <div class="log" id="installLog"></div>
  </div>
  <div id="step3" style="display:none">
    <h2>Install model</h2>
    <div class="progress"><div class="fill" id="modelProgress" style="width:0%"></div></div>
    <div class="log" id="modelLog"></div>
    <div id="modelDone" class="done" style="display:none"></div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const $ = id => document.getElementById(id);
    const specs = $('specs');
    const recsEl = $('recommendations');
    const ollamaStatus = $('ollamaStatus');
    const step2 = $('step2');
    const step3 = $('step3');
    const installLog = $('installLog');
    const modelLog = $('modelLog');
    const modelProgress = $('modelProgress');
    const modelDone = $('modelDone');

    function esc(s) { return (s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function renderSpecs(info) {
      if (!info) return;
      specs.innerHTML = '<p><strong>Platform:</strong> ' + esc(info.platform) + ' / ' + esc(info.arch) + '</p>' +
        '<p><strong>RAM:</strong> ' + (info.totalRamGB || 0).toFixed(1) + ' GB</p>' +
        '<p><strong>CPU cores:</strong> ' + (info.cpuCores || 0) + '</p>' +
        (info.gpuInfo && info.gpuInfo.length ? '<p><strong>GPU:</strong> ' + esc(info.gpuInfo.slice(0,3).join('; ')) + '</p>' : '') +
        (info.vramGB != null ? '<p><strong>VRAM:</strong> ' + info.vramGB.toFixed(1) + ' GB</p>' : '') +
        '<p><strong>Disk free:</strong> ' + (info.diskFreeGB || 0).toFixed(0) + ' GB</p>';
    }
    function renderRecs(list) {
      if (!list || !list.length) { recsEl.innerHTML = '<p>No models to show. Install Ollama first.</p>'; return; }
      recsEl.innerHTML = list.map(r => {
        const badges = (r.alreadyInstalled ? '<span class="badge installed">Installed</span>' : '') +
          (r.recommended ? '<span class="badge rec">Recommended</span>' : '');
        const btn = r.alreadyInstalled ? '' : '<button data-model="' + esc(r.name) + '">Install</button>';
        return '<div class="card' + (r.recommended ? ' recommended' : '') + '">' +
          '<strong>' + esc(r.label) + '</strong>' + badges +
          '<p class="reason">' + esc(r.reason) + '</p>' +
          '<p class="meta">' + (r.sizeGB ? r.sizeGB + ' GB' : '') + ' · Min RAM: ' + r.minRamGB + ' GB' + (r.minVramGB ? ', VRAM: ' + r.minVramGB + ' GB' : '') + '</p>' +
          btn + '</div>';
      }).join('');
      recsEl.querySelectorAll('button[data-model]').forEach(btn => {
        btn.onclick = () => vscode.postMessage({ command: 'installModel', model: btn.dataset.model });
      });
    }
    window.addEventListener('message', e => {
      const msg = e.data;
      if (msg.command === 'systemInfo') {
        renderSpecs(msg.data);
        const info = msg.data;
        ollamaStatus.textContent = info.ollamaRunning ? 'Ollama is running.' : (info.ollamaInstalled ? 'Ollama is installed but not running. Start it from the setup flow.' : 'Ollama is not installed.');
        if (!info.ollamaInstalled) step2.style.display = 'block';
      }
      if (msg.command === 'recommendations') {
        renderRecs(msg.data);
      }
      if (msg.command === 'progress') {
        if (msg.percent != null) {
          modelProgress.style.width = msg.percent + '%';
          step3.style.display = 'block';
        }
        if (msg.message) {
          const el = msg.phase === 'model' ? modelLog : installLog;
          el.textContent += msg.message + '\\n';
          el.scrollTop = el.scrollHeight;
        }
      }
      if (msg.command === 'done') {
        modelProgress.style.width = '100%';
        modelDone.style.display = 'block';
        modelDone.textContent = 'Ready! ClawPilot is now using ' + (msg.model || '') + '. You can close this panel.';
      }
    });
    $('installOllamaBtn').onclick = () => vscode.postMessage({ command: 'installOllama' });
    vscode.postMessage({ command: 'scanSystem' });
  </script>
</body>
</html>`;
}

export function openSetupPanel(extensionUri: vscode.Uri, context: vscode.ExtensionContext): void {
  const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
  const panel = vscode.window.createWebviewPanel(
    'clawpilot.setup',
    'ClawPilot Setup',
    column,
    {
      enableScripts: true,
      localResourceRoots: [extensionUri],
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = getHtml(extensionUri, getNonce());

  panel.webview.onDidReceiveMessage(async (msg: WebviewMessage) => {
    if (msg.command === 'scanSystem') {
      try {
        const info = await scanSystem();
        panel.webview.postMessage({ command: 'systemInfo', data: info });
        const recs = recommendModels(info);
        panel.webview.postMessage({ command: 'recommendations', data: recs });
      } catch (e) {
        panel.webview.postMessage({ command: 'progress', message: `Scan failed: ${e instanceof Error ? e.message : String(e)}` });
      }
    }
    if (msg.command === 'installOllama') {
      const logEl = (m: string) => panel.webview.postMessage({ command: 'progress', message: m, phase: 'ollama' });
      try {
        const { installOllama: doInstall } = await import('../system/ollamaInstaller');
        await doInstall(logEl);
        logEl('Starting Ollama server...');
        const started = await startOllamaServer(logEl);
        if (started) {
          logEl('Done! Refreshing...');
          const info = await scanSystem();
          panel.webview.postMessage({ command: 'systemInfo', data: info });
          panel.webview.postMessage({ command: 'recommendations', data: recommendModels(info) });
        }
      } catch (e) {
        logEl(`Install failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (msg.command === 'installModel' && msg.model) {
      const model = msg.model;
      const { spawn } = await import('child_process');
      const send = (m: string, p?: number) => panel.webview.postMessage({ command: 'progress', message: m, percent: p, phase: 'model' });
      send(`Pulling ${model}...`, 0);
      const proc = spawn('ollama', ['pull', model], { shell: true, windowsHide: true });
      let lastPercent = 0;
      proc.stdout?.on('data', (d: Buffer) => {
        const line = d.toString();
        send(line.trim());
        const m = line.match(/(\d+)%/);
        if (m) lastPercent = Math.min(100, parseInt(m[1], 10));
      });
      proc.stderr?.on('data', (d: Buffer) => send(d.toString().trim()));
      proc.on('close', async code => {
        if (code === 0) {
          send('', 100);
          const cfg = vscode.workspace.getConfiguration('clawpilot');
          await cfg.update('model', model, vscode.ConfigurationTarget.Global);
          panel.webview.postMessage({ command: 'done', model });
        } else {
          send(`Pull exited with code ${code}`);
        }
      });
    }
  });

  context.subscriptions.push(panel);
}
