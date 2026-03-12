import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { spawn, execSync, spawnSync } from 'child_process';

const OLLAMA_TAGS = 'https://ollama.com/download/Ollama-darwin.zip';
const OLLAMA_WIN = 'https://ollama.com/download/OllamaSetup.exe';
const OLLAMA_INSTALL_SCRIPT = 'https://ollama.com/install.sh';

function downloadFile(url: string, destPath: string, onProgress: (msg: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, { headers: { 'User-Agent': 'ClawPilot/1.0' } }, response => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const loc = response.headers.location;
        if (loc) {
          file.close();
          fs.unlinkSync(destPath);
          return downloadFile(loc, destPath, onProgress).then(resolve, reject);
        }
      }
      const total = parseInt(response.headers['content-length'] || '0', 10);
      let done = 0;
      response.on('data', (chunk: Buffer) => {
        done += chunk.length;
        if (total > 0) onProgress(`Downloaded ${(100 * done / total).toFixed(0)}%`);
      });
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', err => { fs.unlink(destPath, () => {}); reject(err); });
    }).on('error', err => { file.close(); fs.unlink(destPath, () => {}); reject(err); });
  });
}

export async function isOllamaInstalled(): Promise<boolean> {
  const platform = os.platform();
  const pathsToCheck: string[] = [];
  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
    pathsToCheck.push(path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe'));
  }
  if (platform === 'darwin') {
    pathsToCheck.push('/usr/local/bin/ollama', '/opt/homebrew/bin/ollama', '/Applications/Ollama.app/Contents/MacOS/ollama');
  }
  if (platform === 'linux') {
    pathsToCheck.push('/usr/local/bin/ollama', '/usr/bin/ollama');
  }
  for (const p of pathsToCheck) {
    try {
      if (fs.existsSync(p)) return true;
    } catch {
      // skip
    }
  }
  try {
    const r = spawnSync('ollama', ['--version'], { encoding: 'utf8', timeout: 3000, shell: true, windowsHide: true });
    if (r.status === 0 || (r.stdout && r.stdout.trim().length > 0)) return true;
  } catch {
    // not in PATH
  }
  return false;
}

export async function installOllama(onProgress: (msg: string) => void): Promise<void> {
  const platform = os.platform();
  const tmpDir = os.tmpdir();

  if (platform === 'darwin') {
    const zipPath = path.join(tmpDir, 'Ollama-darwin.zip');
    const appPath = '/Applications/Ollama.app';
    onProgress('Downloading Ollama for macOS...');
    await downloadFile(OLLAMA_TAGS, zipPath, onProgress);
    onProgress('Extracting...');
    execSync(`unzip -o "${zipPath}" -d /Applications`, { stdio: 'inherit', timeout: 60000 });
    try { fs.unlinkSync(zipPath); } catch { /* ignore */ }
    onProgress('Ollama installed to /Applications/Ollama.app');
    return;
  }

  if (platform === 'linux') {
    const scriptPath = path.join(tmpDir, 'ollama-install.sh');
    onProgress('Downloading install script...');
    await downloadFile(OLLAMA_INSTALL_SCRIPT, scriptPath, onProgress);
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    onProgress('To install Ollama on Linux, run this in your terminal (may require sudo):');
    onProgress('curl -fsSL https://ollama.com/install.sh | sh');
    try { fs.unlinkSync(scriptPath); } catch { /* ignore */ }
    throw new Error('Linux install requires manual step. Run in terminal: curl -fsSL https://ollama.com/install.sh | sh');
  }

  if (platform === 'win32') {
    const exePath = path.join(tmpDir, 'OllamaSetup.exe');
    onProgress('Downloading Ollama for Windows...');
    await downloadFile(OLLAMA_WIN, exePath, onProgress);
    onProgress('Running installer (silent)...');
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(exePath, ['/S'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      proc.on('error', reject);
      proc.on('close', code => {
        if (code === 0) resolve();
        else reject(new Error(`Installer exited with code ${code}`));
      });
      setTimeout(() => resolve(), 60000);
    });
    try { fs.unlinkSync(exePath); } catch { /* ignore */ }
    onProgress('Ollama installed. You may need to restart VS Code for the PATH to update.');
    return;
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

export async function startOllamaServer(onProgress: (msg: string) => void): Promise<boolean> {
  try {
    const platform = os.platform();
    let ollamaPath = 'ollama';
    if (platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
      const p = path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe');
      if (fs.existsSync(p)) ollamaPath = p;
    }
    if (platform === 'darwin') {
      if (fs.existsSync('/Applications/Ollama.app/Contents/MacOS/ollama')) {
        ollamaPath = '/Applications/Ollama.app/Contents/MacOS/ollama';
      }
    }
    const child = spawn(ollamaPath, ['serve'], {
      detached: true,
      stdio: 'ignore',
      shell: true,
      windowsHide: true,
    });
    child.unref();
    onProgress('Starting Ollama server...');
  } catch (e) {
    onProgress(`Start failed: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }

  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const c = new AbortController();
      setTimeout(() => c.abort(), 2000);
      const res = await fetch('http://localhost:11434/api/tags', { signal: c.signal });
      if (res.ok) {
        onProgress('Ollama server is running.');
        return true;
      }
    } catch {
      // keep waiting
    }
  }
  onProgress('Server did not respond in time. Try running "ollama serve" in a terminal.');
  return false;
}
