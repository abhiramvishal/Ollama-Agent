import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { execSync, spawnSync } from 'child_process';

export interface SystemInfo {
  platform: 'win32' | 'darwin' | 'linux';
  arch: string;
  totalRamGB: number;
  gpuInfo: string[];
  vramGB: number | null;
  cpuCores: number;
  ollamaInstalled: boolean;
  ollamaRunning: boolean;
  lmstudioRunning: boolean;
  installedOllamaModels: string[];
  diskFreeGB: number;
}

const FETCH_TIMEOUT_MS = 2000;

function fetchWithTimeout(url: string): Promise<{ ok: boolean; json?: unknown }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { signal: controller.signal })
    .then(async res => {
      clearTimeout(t);
      try {
        const json = await res.json();
        return { ok: res.ok, json };
      } catch {
        return { ok: res.ok };
      }
    })
    .catch(() => {
      clearTimeout(t);
      return { ok: false };
    });
}

function getGpuInfo(): { lines: string[]; vramGB: number | null } {
  const platform = os.platform();
  let out = '';
  let vramGB: number | null = null;
  try {
    if (platform === 'win32') {
      out = execSync('wmic path win32_VideoController get name,AdapterRAM', {
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true,
      });
      const lines = out.split('\n').map(l => l.trim()).filter(Boolean);
      const vramMatch = out.match(/AdapterRAM\s+(\d+)/);
      if (vramMatch) {
        const bytes = parseInt(vramMatch[1], 10);
        if (!isNaN(bytes) && bytes > 0) vramGB = bytes / (1024 ** 3);
      }
      return { lines: lines.filter(l => l && l !== 'Name' && l !== 'AdapterRAM'), vramGB };
    }
    if (platform === 'darwin') {
      out = execSync('system_profiler SPDisplaysDataType', {
        encoding: 'utf8',
        timeout: 10000,
        maxBuffer: 1024 * 1024,
      });
      const lines = out.split('\n').map(l => l.trim()).filter(l => l.startsWith('Chipset') || l.startsWith('VRAM') || l.includes('Memory'));
      const vramLine = lines.find(l => /VRAM|vram|Video.*Memory/i.test(l));
      if (vramLine) {
        const m = vramLine.match(/(\d+)\s*([MG]B)/i);
        if (m) vramGB = m[2].toUpperCase() === 'GB' ? parseFloat(m[1]) : parseFloat(m[1]) / 1024;
      }
      return { lines: lines.slice(0, 10), vramGB };
    }
    if (platform === 'linux') {
      out = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader', {
        encoding: 'utf8',
        timeout: 5000,
      });
      const lines = out.trim().split('\n').map(l => l.trim()).filter(Boolean);
      const m = out.match(/(\d+)\s*MiB/);
      if (m) vramGB = parseInt(m[1], 10) / 1024;
      return { lines, vramGB };
    }
  } catch {
    // ignore
  }
  return { lines: [], vramGB: null };
}

function checkOllamaInstalled(): boolean {
  const platform = os.platform();
  const pathsToCheck: string[] = [];
  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
    pathsToCheck.push(path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe'));
  }
  if (platform === 'darwin') {
    pathsToCheck.push('/usr/local/bin/ollama', '/opt/homebrew/bin/ollama');
    const home = process.env.HOME || '';
    if (home) pathsToCheck.push(path.join(home, '.ollama', 'ollama'));
  }
  if (platform === 'linux') {
    pathsToCheck.push('/usr/local/bin/ollama', '/usr/bin/ollama');
    const home = process.env.HOME || '';
    if (home) pathsToCheck.push(path.join(home, '.ollama', 'ollama'));
  }
  for (const p of pathsToCheck) {
    try {
      if (fs.existsSync(p)) return true;
    } catch {
      // skip
    }
  }
  try {
    const r = spawnSync('ollama', ['--version'], {
      encoding: 'utf8',
      timeout: 3000,
      shell: true,
      windowsHide: true,
    });
    if (r.status === 0 || r.stdout?.trim() || r.stderr?.trim()) return true;
  } catch {
    // not in PATH
  }
  return false;
}

function getDiskFreeGB(): number {
  const platform = os.platform();
  try {
    if (platform === 'win32') {
      const out = execSync('wmic logicaldisk get size,freespace', {
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true,
      });
      const lines = out.split('\n').filter(l => l.trim());
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length >= 2) {
          const free = parseInt(parts[0], 10);
          if (!isNaN(free)) return free / (1024 ** 3);
        }
      }
    } else {
      const out = execSync('df -k /', { encoding: 'utf8', timeout: 5000 });
      const m = out.match(/\d+\s+(\d+)\s+\d+\s+\d+%\s+/);
      if (m) return parseInt(m[1], 10) / (1024 ** 2);
    }
  } catch {
    // fallback
  }
  return 50;
}

export async function scanSystem(): Promise<SystemInfo> {
  const platform = os.platform() as 'win32' | 'darwin' | 'linux';
  const totalRamGB = os.totalmem() / 1e9;
  const cpuCores = os.cpus().length;
  const { lines: gpuInfo, vramGB } = getGpuInfo();
  const ollamaInstalled = checkOllamaInstalled();

  const [ollamaStatus, lmstudioStatus] = await Promise.all([
    fetchWithTimeout('http://localhost:11434/api/tags'),
    fetchWithTimeout('http://localhost:1234/v1/models'),
  ]);

  const ollamaRunning = ollamaStatus.ok;
  const lmstudioRunning = lmstudioStatus.ok;

  let installedOllamaModels: string[] = [];
  if (ollamaRunning && ollamaStatus.json && typeof ollamaStatus.json === 'object' && 'models' in ollamaStatus.json) {
    const models = (ollamaStatus.json as { models?: Array<{ name?: string }> }).models ?? [];
    installedOllamaModels = models.map(m => (m.name ?? '').trim()).filter(Boolean);
  }

  const diskFreeGB = getDiskFreeGB();

  return {
    platform,
    arch: os.arch(),
    totalRamGB,
    gpuInfo,
    vramGB,
    cpuCores,
    ollamaInstalled,
    ollamaRunning,
    lmstudioRunning,
    installedOllamaModels,
    diskFreeGB,
  };
}
