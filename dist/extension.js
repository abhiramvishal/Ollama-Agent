"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/system/ollamaInstaller.ts
var ollamaInstaller_exports = {};
__export(ollamaInstaller_exports, {
  installOllama: () => installOllama,
  isOllamaInstalled: () => isOllamaInstalled,
  startOllamaServer: () => startOllamaServer
});
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs8.createWriteStream(destPath);
    https.get(url, { headers: { "User-Agent": "ClawPilot/1.0" } }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const loc = response.headers.location;
        if (loc) {
          file.close();
          fs8.unlinkSync(destPath);
          return downloadFile(loc, destPath, onProgress).then(resolve, reject);
        }
      }
      const total = parseInt(response.headers["content-length"] || "0", 10);
      let done = 0;
      response.on("data", (chunk) => {
        done += chunk.length;
        if (total > 0) onProgress(`Downloaded ${(100 * done / total).toFixed(0)}%`);
      });
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
      file.on("error", (err) => {
        fs8.unlink(destPath, () => {
        });
        reject(err);
      });
    }).on("error", (err) => {
      file.close();
      fs8.unlink(destPath, () => {
      });
      reject(err);
    });
  });
}
async function isOllamaInstalled() {
  const platform3 = os2.platform();
  const pathsToCheck = [];
  if (platform3 === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path13.join(process.env.USERPROFILE || "", "AppData", "Local");
    pathsToCheck.push(path13.join(localAppData, "Programs", "Ollama", "ollama.exe"));
  }
  if (platform3 === "darwin") {
    pathsToCheck.push("/usr/local/bin/ollama", "/opt/homebrew/bin/ollama", "/Applications/Ollama.app/Contents/MacOS/ollama");
  }
  if (platform3 === "linux") {
    pathsToCheck.push("/usr/local/bin/ollama", "/usr/bin/ollama");
  }
  for (const p of pathsToCheck) {
    try {
      if (fs8.existsSync(p)) return true;
    } catch {
    }
  }
  try {
    const r = (0, import_child_process5.spawnSync)("ollama", ["--version"], { encoding: "utf8", timeout: 3e3, shell: true, windowsHide: true });
    if (r.status === 0 || r.stdout && r.stdout.trim().length > 0) return true;
  } catch {
  }
  return false;
}
async function installOllama(onProgress) {
  const platform3 = os2.platform();
  const tmpDir = os2.tmpdir();
  if (platform3 === "darwin") {
    const zipPath = path13.join(tmpDir, "Ollama-darwin.zip");
    const appPath = "/Applications/Ollama.app";
    onProgress("Downloading Ollama for macOS...");
    await downloadFile(OLLAMA_TAGS, zipPath, onProgress);
    onProgress("Extracting...");
    (0, import_child_process5.execSync)(`unzip -o "${zipPath}" -d /Applications`, { stdio: "inherit", timeout: 6e4 });
    try {
      fs8.unlinkSync(zipPath);
    } catch {
    }
    onProgress("Ollama installed to /Applications/Ollama.app");
    return;
  }
  if (platform3 === "linux") {
    const scriptPath = path13.join(tmpDir, "ollama-install.sh");
    onProgress("Downloading install script...");
    await downloadFile(OLLAMA_INSTALL_SCRIPT, scriptPath, onProgress);
    const scriptContent = fs8.readFileSync(scriptPath, "utf8");
    onProgress("To install Ollama on Linux, run this in your terminal (may require sudo):");
    onProgress("curl -fsSL https://ollama.com/install.sh | sh");
    try {
      fs8.unlinkSync(scriptPath);
    } catch {
    }
    throw new Error("Linux install requires manual step. Run in terminal: curl -fsSL https://ollama.com/install.sh | sh");
  }
  if (platform3 === "win32") {
    const exePath = path13.join(tmpDir, "OllamaSetup.exe");
    onProgress("Downloading Ollama for Windows...");
    await downloadFile(OLLAMA_WIN, exePath, onProgress);
    onProgress("Running installer (silent)...");
    await new Promise((resolve, reject) => {
      const proc = (0, import_child_process5.spawn)(exePath, ["/S"], {
        detached: true,
        stdio: "ignore",
        windowsHide: true
      });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Installer exited with code ${code}`));
      });
      setTimeout(() => resolve(), 6e4);
    });
    try {
      fs8.unlinkSync(exePath);
    } catch {
    }
    onProgress("Ollama installed. You may need to restart VS Code for the PATH to update.");
    return;
  }
  throw new Error(`Unsupported platform: ${platform3}`);
}
async function startOllamaServer(onProgress) {
  try {
    const platform3 = os2.platform();
    let ollamaPath = "ollama";
    if (platform3 === "win32") {
      const localAppData = process.env.LOCALAPPDATA || path13.join(process.env.USERPROFILE || "", "AppData", "Local");
      const p = path13.join(localAppData, "Programs", "Ollama", "ollama.exe");
      if (fs8.existsSync(p)) ollamaPath = p;
    }
    if (platform3 === "darwin") {
      if (fs8.existsSync("/Applications/Ollama.app/Contents/MacOS/ollama")) {
        ollamaPath = "/Applications/Ollama.app/Contents/MacOS/ollama";
      }
    }
    const child = (0, import_child_process5.spawn)(ollamaPath, ["serve"], {
      detached: true,
      stdio: "ignore",
      shell: true,
      windowsHide: true
    });
    child.unref();
    onProgress("Starting Ollama server...");
  } catch (e) {
    onProgress(`Start failed: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1e3));
    try {
      const c = new AbortController();
      setTimeout(() => c.abort(), 2e3);
      const res = await fetch("http://localhost:11434/api/tags", { signal: c.signal });
      if (res.ok) {
        onProgress("Ollama server is running.");
        return true;
      }
    } catch {
    }
  }
  onProgress('Server did not respond in time. Try running "ollama serve" in a terminal.');
  return false;
}
var os2, path13, fs8, https, import_child_process5, OLLAMA_TAGS, OLLAMA_WIN, OLLAMA_INSTALL_SCRIPT;
var init_ollamaInstaller = __esm({
  "src/system/ollamaInstaller.ts"() {
    "use strict";
    os2 = __toESM(require("os"));
    path13 = __toESM(require("path"));
    fs8 = __toESM(require("fs"));
    https = __toESM(require("https"));
    import_child_process5 = require("child_process");
    OLLAMA_TAGS = "https://ollama.com/download/Ollama-darwin.zip";
    OLLAMA_WIN = "https://ollama.com/download/OllamaSetup.exe";
    OLLAMA_INSTALL_SCRIPT = "https://ollama.com/install.sh";
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode25 = __toESM(require("vscode"));

// src/providers/providerManager.ts
var vscode3 = __toESM(require("vscode"));

// src/providers/llmProvider.ts
var PROVIDER_DEFAULT_PORTS = {
  ollama: 11434,
  lmstudio: 1234,
  llamafile: 8080,
  vllm: 8e3,
  localai: 8080,
  jan: 1337,
  "textgen-webui": 5e3,
  "openai-compatible": 11434,
  anthropic: 443,
  openai: 443,
  google: 443
};
var PROVIDER_DISPLAY_NAMES = {
  ollama: "Ollama",
  lmstudio: "LM Studio",
  llamafile: "llamafile",
  vllm: "vLLM",
  localai: "LocalAI",
  jan: "Jan",
  "textgen-webui": "Text Generation WebUI",
  "openai-compatible": "OpenAI-compatible server",
  anthropic: "Anthropic (API)",
  openai: "OpenAI (API)",
  google: "Google Gemini (API)"
};
var API_PROVIDER_TYPES = ["anthropic", "openai", "google"];

// src/ollamaClient.ts
var vscode = __toESM(require("vscode"));
var KNOWN_MODELS = [
  // Code models
  { name: "deepseek-coder:6.7b", label: "DeepSeek Coder 6.7B", category: "code" },
  { name: "deepseek-coder:33b", label: "DeepSeek Coder 33B", category: "code" },
  { name: "deepseek-coder-v2", label: "DeepSeek Coder v2", category: "code" },
  { name: "codellama:7b", label: "Code Llama 7B", category: "code" },
  { name: "codellama:13b", label: "Code Llama 13B", category: "code" },
  { name: "codellama:34b", label: "Code Llama 34B", category: "code" },
  { name: "starcoder2:3b", label: "StarCoder2 3B", category: "code" },
  { name: "starcoder2:7b", label: "StarCoder2 7B", category: "code" },
  { name: "qwen2.5-coder:7b", label: "Qwen2.5 Coder 7B", category: "code" },
  { name: "qwen2.5-coder:14b", label: "Qwen2.5 Coder 14B", category: "code" },
  { name: "qwen2.5-coder:32b", label: "Qwen2.5 Coder 32B", category: "code" },
  // General models
  { name: "llama3.2:3b", label: "Llama 3.2 3B", category: "general" },
  { name: "llama3.1:8b", label: "Llama 3.1 8B", category: "general" },
  { name: "llama3.1:70b", label: "Llama 3.1 70B", category: "general" },
  { name: "mistral:7b", label: "Mistral 7B", category: "general" },
  { name: "mistral-nemo", label: "Mistral Nemo", category: "general" },
  { name: "mixtral:8x7b", label: "Mixtral 8x7B", category: "general" },
  { name: "gemma2:2b", label: "Gemma 2 2B", category: "general" },
  { name: "gemma2:9b", label: "Gemma 2 9B", category: "general" },
  { name: "phi3.5", label: "Phi 3.5", category: "general" },
  { name: "phi4", label: "Phi 4", category: "general" },
  { name: "qwen2.5:7b", label: "Qwen2.5 7B", category: "general" },
  { name: "qwen2.5:14b", label: "Qwen2.5 14B", category: "general" },
  { name: "qwen2.5:32b", label: "Qwen2.5 32B", category: "general" },
  // Small/fast models
  { name: "tinyllama", label: "TinyLlama", category: "small" },
  { name: "smollm2:135m", label: "SmolLM2 135M", category: "small" },
  { name: "smollm2:360m", label: "SmolLM2 360M", category: "small" },
  { name: "smollm2:1.7b", label: "SmolLM2 1.7B", category: "small" }
];
var TIMEOUT_MS = 3e3;
var OllamaClient = class _OllamaClient {
  constructor() {
    this.providerType = "ollama";
    this.displayName = "Ollama";
    this._config = vscode.workspace.getConfiguration("clawpilot");
  }
  get baseEndpoint() {
    const base = this._config.get("endpoint", "http://localhost:11434");
    return base.replace(/\/$/, "");
  }
  get endpoint() {
    return this.baseEndpoint;
  }
  refreshConfig() {
    this._config = vscode.workspace.getConfiguration("clawpilot");
  }
  async isAvailable() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this.endpoint}/api/tags`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      clearTimeout(timeout);
      return false;
    }
  }
  async listModels() {
    this.refreshConfig();
    const res = await fetch(`${this.endpoint}/api/tags`);
    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    return data.models ?? [];
  }
  /**
   * Returns the best available model given a preferred name.
   * - If the preferred model is installed, returns it.
   * - Otherwise, returns the first installed model.
   * - If listing models fails (e.g. offline), returns the preferred name as-is.
   */
  async getBestAvailableModel(preferred) {
    try {
      const models = await this.listModels();
      if (models.some((m) => m.name === preferred)) {
        return preferred;
      }
      if (models.length > 0) {
        return models[0].name;
      }
      return preferred;
    } catch {
      return preferred;
    }
  }
  static {
    /** Models that support native Ollama tool calling via /api/chat tools field */
    this.TOOL_CAPABLE_MODELS = [
      "llama3.1",
      "llama3.2",
      "llama3.3",
      "qwen2.5",
      "qwen2.5-coder",
      "mistral-nemo",
      "mistral-small",
      "command-r",
      "command-r-plus",
      "firefunction-v2"
    ];
  }
  static supportsNativeTools(modelName) {
    const base = modelName.split(":")[0].toLowerCase();
    return _OllamaClient.TOOL_CAPABLE_MODELS.some((m) => base.includes(m));
  }
  async *streamChat(messages, model, maxTokens) {
    const tokens = maxTokens ?? this._config.get("maxTokens", 2048);
    this.refreshConfig();
    const body = {
      model,
      messages,
      stream: true,
      options: { num_predict: tokens }
    };
    const res = await fetch(`${this.endpoint}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama chat error: ${res.status} ${text}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            const chunk = obj.message?.content;
            if (typeof chunk === "string") yield chunk;
          } catch {
          }
        }
      }
      if (buffer.trim()) {
        try {
          const obj = JSON.parse(buffer);
          const chunk = obj.message?.content;
          if (typeof chunk === "string") yield chunk;
        } catch {
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  /**
   * Stream chat with a primary model and an ordered list of fallbacks.
   * Emits an informational chunk when switching models.
   */
  async *streamChatWithFallback(messages, primaryModel, fallbackModels, maxTokens) {
    const tried = [];
    const models = [primaryModel, ...fallbackModels];
    let isFirst = true;
    for (const name of models) {
      tried.push(name);
      try {
        if (!isFirst) {
          yield `[ClawPilot: switching to fallback model: ${name}]`;
        }
        for await (const chunk of this.streamChat(messages, name, maxTokens)) {
          yield chunk;
        }
        return;
      } catch {
        isFirst = false;
      }
    }
    throw new Error(`All models failed. Tried: ${tried.join(", ")}`);
  }
  async *streamGenerate(prompt, model, maxTokens, stopTokens) {
    this.refreshConfig();
    const body = {
      model,
      prompt,
      stream: true,
      options: { num_predict: maxTokens }
    };
    const res = await fetch(`${this.endpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama generate error: ${res.status} ${text}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    const stops = stopTokens?.length ? stopTokens : [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            const chunk = obj.response;
            if (typeof chunk === "string") {
              let out = chunk;
              for (const stop of stops) {
                const idx = out.indexOf(stop);
                if (idx !== -1) out = out.slice(0, idx);
              }
              if (out) yield out;
            }
            if (obj.done) return;
          } catch {
          }
        }
      }
      if (buffer.trim()) {
        try {
          const obj = JSON.parse(buffer);
          const chunk = obj.response;
          if (typeof chunk === "string") yield chunk;
        } catch {
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  async pullModel(name, onProgress) {
    this.refreshConfig();
    const body = { name, stream: true };
    const res = await fetch(`${this.endpoint}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama pull error: ${res.status} ${text}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.status) onProgress(obj.status);
          } catch {
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
};

// src/providers/openaiCompatibleProvider.ts
var vscode2 = __toESM(require("vscode"));
var TIMEOUT_MS2 = 3e3;
var ENDPOINT_CONFIG_KEYS = {
  lmstudio: "lmstudioEndpoint",
  llamafile: "llamafileEndpoint",
  vllm: "vllmEndpoint",
  localai: "localaiEndpoint",
  jan: "janEndpoint",
  "textgen-webui": "textgenEndpoint",
  "openai-compatible": "endpoint"
};
var OpenAICompatibleProvider = class {
  constructor(providerType) {
    this.providerType = providerType;
    this.displayName = PROVIDER_DISPLAY_NAMES[providerType];
    this._config = vscode2.workspace.getConfiguration("clawpilot");
  }
  get baseEndpoint() {
    this._config = vscode2.workspace.getConfiguration("clawpilot");
    const key = ENDPOINT_CONFIG_KEYS[this.providerType] ?? "endpoint";
    let base = this._config.get(key, "");
    if (!base && key !== "endpoint") {
      base = this._config.get("endpoint", "");
    }
    if (!base) {
      const port = PROVIDER_DEFAULT_PORTS[this.providerType];
      base = `http://localhost:${port}`;
    }
    return base.replace(/\/$/, "");
  }
  refreshConfig() {
    this._config = vscode2.workspace.getConfiguration("clawpilot");
  }
  async isAvailable() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS2);
    try {
      const res = await fetch(`${this.baseEndpoint}/v1/models`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      clearTimeout(timeout);
      return false;
    }
  }
  async listModels() {
    this.refreshConfig();
    const res = await fetch(`${this.baseEndpoint}/v1/models`);
    if (!res.ok) {
      throw new Error(`Models API error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const list = data.data ?? [];
    return list.map((m) => ({
      name: m.id,
      modified_at: m.created != null ? new Date(m.created * 1e3).toISOString() : void 0
    }));
  }
  async getBestAvailableModel(preferred) {
    try {
      const models = await this.listModels();
      if (models.some((m) => m.name === preferred)) {
        return preferred;
      }
      if (models.length > 0) {
        return models[0].name;
      }
      return preferred;
    } catch {
      return preferred;
    }
  }
  async *streamChat(messages, model, maxTokens) {
    const tokens = maxTokens ?? this._config.get("maxTokens", 2048);
    this.refreshConfig();
    const body = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      max_tokens: tokens
    };
    const res = await fetch(`${this.baseEndpoint}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Chat error: ${res.status} ${text}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data: ")) {
            try {
              const obj = JSON.parse(trimmed.slice(6));
              const content = obj.choices?.[0]?.delta?.content;
              if (typeof content === "string") yield content;
            } catch {
            }
          }
        }
      }
      if (buffer.trim() && buffer.trim() !== "data: [DONE]" && buffer.startsWith("data: ")) {
        try {
          const obj = JSON.parse(buffer.trim().slice(6));
          const content = obj.choices?.[0]?.delta?.content;
          if (typeof content === "string") yield content;
        } catch {
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  async *streamChatWithFallback(messages, primaryModel, fallbackModels, maxTokens) {
    const tried = [];
    const models = [primaryModel, ...fallbackModels];
    let isFirst = true;
    for (const name of models) {
      tried.push(name);
      try {
        if (!isFirst) {
          yield `[ClawPilot: switching to fallback model: ${name}]`;
        }
        for await (const chunk of this.streamChat(messages, name, maxTokens)) {
          yield chunk;
        }
        return;
      } catch {
        isFirst = false;
      }
    }
    throw new Error(`All models failed. Tried: ${tried.join(", ")}`);
  }
  async *streamGenerate(prompt, model, maxTokens, stopTokens) {
    this.refreshConfig();
    const body = {
      model,
      prompt,
      stream: true,
      max_tokens: maxTokens
    };
    let res = await fetch(`${this.baseEndpoint}/v1/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res.status === 404) {
      const messages = [{ role: "user", content: prompt }];
      yield* this.streamChat(messages, model, maxTokens);
      return;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Completions error: ${res.status} ${text}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    const stops = stopTokens?.length ? stopTokens : [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data: ")) {
            try {
              const obj = JSON.parse(trimmed.slice(6));
              const choice = obj.choices?.[0];
              const chunk = choice?.text ?? choice?.delta?.content;
              if (typeof chunk === "string") {
                let out = chunk;
                for (const stop of stops) {
                  const idx = out.indexOf(stop);
                  if (idx !== -1) out = out.slice(0, idx);
                }
                if (out) yield out;
              }
            } catch {
            }
          }
        }
      }
      if (buffer.trim() && buffer.trim() !== "data: [DONE]" && buffer.startsWith("data: ")) {
        try {
          const obj = JSON.parse(buffer.trim().slice(6));
          const choice = obj.choices?.[0];
          const chunk = choice?.text ?? choice?.delta?.content;
          if (typeof chunk === "string") yield chunk;
        } catch {
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
};

// src/providers/apiProvider.ts
var ANTHROPIC_MODELS = [
  { name: "claude-sonnet-4-5", modified_at: void 0 },
  { name: "claude-haiku-4-5", modified_at: void 0 }
];
var OPENAI_MODELS = [
  { name: "gpt-4o", modified_at: void 0 },
  { name: "gpt-4o-mini", modified_at: void 0 }
];
var GOOGLE_MODELS = [
  { name: "gemini-1.5-pro", modified_at: void 0 },
  { name: "gemini-1.5-flash", modified_at: void 0 }
];
function apiTypeToProviderType(apiType) {
  return apiType;
}
var ApiProvider = class {
  constructor(apiType, apiKey) {
    this._apiType = apiType;
    this._apiKey = apiKey;
    this.providerType = apiTypeToProviderType(apiType);
    this.displayName = PROVIDER_DISPLAY_NAMES[this.providerType];
    this.baseEndpoint = this._baseUrl();
  }
  _baseUrl() {
    switch (this._apiType) {
      case "anthropic":
        return "https://api.anthropic.com";
      case "openai":
        return "https://api.openai.com";
      case "google":
        return "https://generativelanguage.googleapis.com";
      default:
        return "";
    }
  }
  refreshConfig() {
  }
  async isAvailable() {
    return !!this._apiKey?.trim();
  }
  async listModels() {
    switch (this._apiType) {
      case "anthropic":
        return [...ANTHROPIC_MODELS];
      case "openai":
        return [...OPENAI_MODELS];
      case "google":
        return [...GOOGLE_MODELS];
      default:
        return [];
    }
  }
  async getBestAvailableModel(preferred) {
    const models = await this.listModels();
    if (models.some((m) => m.name === preferred)) return preferred;
    if (models.length > 0) return models[0].name;
    return preferred;
  }
  async *streamChat(messages, model, maxTokens) {
    const tokens = maxTokens ?? 2048;
    if (this._apiType === "anthropic") {
      yield* this._streamAnthropic(messages, model, tokens);
      return;
    }
    if (this._apiType === "openai") {
      yield* this._streamOpenAI(messages, model, tokens);
      return;
    }
    if (this._apiType === "google") {
      yield* this._streamGoogle(messages, model, tokens);
      return;
    }
    throw new Error(`Unsupported API type: ${this._apiType}`);
  }
  async *_streamAnthropic(messages, model, maxTokens) {
    const system = messages.find((m) => m.role === "system")?.content;
    const apiMessages = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content }));
    const body = {
      model,
      max_tokens: maxTokens,
      messages: apiMessages,
      stream: true
    };
    if (system) body.system = system;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this._apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Anthropic error: ${res.status} ${t}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const obj = JSON.parse(data);
              if (obj.type === "content_block_delta" && obj.delta?.text) yield obj.delta.text;
            } catch {
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  async *_streamOpenAI(messages, model, maxTokens) {
    const body = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      max_tokens: maxTokens
    };
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this._apiKey}`
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OpenAI error: ${res.status} ${t}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data: ")) {
            try {
              const obj = JSON.parse(trimmed.slice(6));
              const content = obj.choices?.[0]?.delta?.content;
              if (typeof content === "string") yield content;
            } catch {
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  async *_streamGoogle(messages, model, maxTokens) {
    const parts = messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const body = {
      contents: parts,
      generationConfig: { maxOutputTokens: maxTokens }
    };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${encodeURIComponent(this._apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Google Gemini error: ${res.status} ${t}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const trimmed = chunk.trim();
          if (!trimmed) continue;
          try {
            const obj = JSON.parse(trimmed);
            const text = obj.candidates?.[0]?.content?.parts?.[0]?.text;
            if (typeof text === "string") yield text;
          } catch {
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  async *streamChatWithFallback(messages, primaryModel, fallbackModels, maxTokens) {
    const models = [primaryModel, ...fallbackModels];
    let isFirst = true;
    for (const name of models) {
      try {
        if (!isFirst) yield `[ClawPilot: switching to fallback model: ${name}]`;
        yield* this.streamChat(messages, name, maxTokens);
        return;
      } catch {
        isFirst = false;
      }
    }
    throw new Error(`All models failed. Tried: ${models.join(", ")}`);
  }
  async *streamGenerate(prompt, model, maxTokens, _stopTokens) {
    const messages = [{ role: "user", content: prompt }];
    yield* this.streamChat(messages, model, maxTokens);
  }
};

// src/providers/secretKeys.ts
var CLAWPILOT_ANTHROPIC_KEY = "clawpilot.anthropicApiKey";
var CLAWPILOT_OPENAI_KEY = "clawpilot.openaiApiKey";
var CLAWPILOT_GOOGLE_KEY = "clawpilot.googleApiKey";
var SECRET_KEY_IDS = {
  anthropic: CLAWPILOT_ANTHROPIC_KEY,
  openai: CLAWPILOT_OPENAI_KEY,
  google: CLAWPILOT_GOOGLE_KEY
};

// src/providers/providerManager.ts
var API_SECRET_KEYS = {
  ollama: void 0,
  lmstudio: void 0,
  llamafile: void 0,
  vllm: void 0,
  localai: void 0,
  jan: void 0,
  "textgen-webui": void 0,
  "openai-compatible": void 0,
  anthropic: SECRET_KEY_IDS.anthropic,
  openai: SECRET_KEY_IDS.openai,
  google: SECRET_KEY_IDS.google
};
async function createProvider(context) {
  const config = vscode3.workspace.getConfiguration("clawpilot");
  const provider = config.get("provider", "ollama");
  if (provider === "ollama") {
    return new OllamaClient();
  }
  if (API_PROVIDER_TYPES.includes(provider)) {
    const secretId = API_SECRET_KEYS[provider];
    if (!secretId) throw new Error("Unknown API provider");
    const apiKey = await context.secrets.get(secretId);
    if (!apiKey?.trim()) {
      throw new Error(
        `No API key set for ${provider}. Use "ClawPilot: Manage API Keys" to add your key.`
      );
    }
    return new ApiProvider(provider, apiKey);
  }
  return new OpenAICompatibleProvider(provider);
}
async function autoDetectProvider() {
  const candidates = [
    new OllamaClient(),
    new OpenAICompatibleProvider("lmstudio"),
    new OpenAICompatibleProvider("jan"),
    new OpenAICompatibleProvider("llamafile"),
    new OpenAICompatibleProvider("vllm"),
    new OpenAICompatibleProvider("localai"),
    new OpenAICompatibleProvider("textgen-webui")
  ];
  const results = await Promise.all(
    candidates.map(async (p) => ({ provider: p, ok: await p.isAvailable() }))
  );
  const found = results.find((r) => r.ok);
  return found ? found.provider : null;
}

// src/completion/completionProvider.ts
var vscode4 = __toESM(require("vscode"));
var DEBOUNCE_MS = 300;
var PREFIX_LINES = 40;
var SUFFIX_LINES = 10;
var MAX_TOKENS = 80;
var OllamaCompletionProvider = class {
  constructor(client2, model) {
    this._client = client2;
    this._model = model;
  }
  updateModel(model) {
    this._model = model;
  }
  setClient(client2) {
    this._client = client2;
  }
  provideInlineCompletionItems(document, position, _context, token) {
    this._pendingCancel?.cancel();
    this._pendingCancel = new vscode4.CancellationTokenSource();
    const cts = this._pendingCancel;
    token.onCancellationRequested(() => cts.cancel());
    return new Promise((resolve) => {
      this._pendingResolve?.(null);
      this._pendingResolve = resolve;
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(async () => {
        this._pendingResolve = void 0;
        if (cts.token.isCancellationRequested) {
          resolve(null);
          return;
        }
        const cfg = vscode4.workspace.getConfiguration("clawpilot");
        if (!cfg.get("inlineCompletionsEnabled", true)) {
          resolve(null);
          return;
        }
        const prefix = this._getPrefix(document, position);
        const suffix = this._getSuffix(document, position);
        const currentLine = document.lineAt(position.line).text.slice(0, position.character).trim();
        if (!currentLine && prefix.split("\n").slice(-3).every((l) => !l.trim())) {
          resolve(null);
          return;
        }
        try {
          const completion = await this._fetchCompletion(prefix, suffix, document.languageId, cts.token);
          if (!completion || cts.token.isCancellationRequested) {
            resolve(null);
            return;
          }
          const item = new vscode4.InlineCompletionItem(
            completion,
            new vscode4.Range(position, position)
          );
          resolve(new vscode4.InlineCompletionList([item]));
        } catch {
          resolve(null);
        }
      }, DEBOUNCE_MS);
    });
  }
  _getPrefix(doc, pos) {
    const startLine = Math.max(0, pos.line - PREFIX_LINES);
    const range = new vscode4.Range(startLine, 0, pos.line, pos.character);
    return doc.getText(range);
  }
  _getSuffix(doc, pos) {
    const endLine = Math.min(doc.lineCount - 1, pos.line + SUFFIX_LINES);
    const range = new vscode4.Range(pos.line, pos.character, endLine, doc.lineAt(endLine).text.length);
    return doc.getText(range);
  }
  async _fetchCompletion(prefix, suffix, language, cancelToken) {
    const systemPrompt = `You are a code completion engine. Complete the code at the cursor position.
Output ONLY the completion text \u2014 no explanation, no markdown fence, no repetition of the prefix.
Stop after completing the current logical statement or block.
Language: ${language}`;
    const userPrompt = `<PREFIX>
${prefix}
<SUFFIX>
${suffix}
<COMPLETION>`;
    let result = "";
    let lineCount = 0;
    let tokenCount = 0;
    const stopSeqs = ["<|endoftext|>", "</s>", "<EOT>"];
    try {
      for await (const chunk of this._client.streamChat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        this._model
      )) {
        if (cancelToken.isCancellationRequested) return null;
        result += chunk;
        tokenCount += chunk.split(/\s+/).filter(Boolean).length;
        lineCount += (chunk.match(/\n/g) || []).length;
        if (stopSeqs.some((s) => result.includes(s))) {
          for (const s of stopSeqs) {
            const idx = result.indexOf(s);
            if (idx !== -1) result = result.slice(0, idx);
          }
          break;
        }
        if (result.includes("\n\n\n")) {
          result = result.slice(0, result.indexOf("\n\n\n"));
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
};

// src/completion/completionStatusBar.ts
var vscode5 = __toESM(require("vscode"));
var CompletionStatusBar = class {
  constructor(context) {
    this._item = vscode5.window.createStatusBarItem(
      vscode5.StatusBarAlignment.Right,
      100
    );
    this._item.command = "clawpilot.toggleCompletions";
    context.subscriptions.push(this._item);
    this._update();
    context.subscriptions.push(
      vscode5.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("clawpilot.inlineCompletionsEnabled")) {
          this._update();
        }
      })
    );
    this._item.show();
  }
  _update() {
    const enabled = vscode5.workspace.getConfiguration("clawpilot").get("inlineCompletionsEnabled", true);
    this._item.text = enabled ? "$(claw) ClawPilot" : "$(circle-slash) Ollama";
    this._item.tooltip = enabled ? "ClawPilot inline completions: ON (click to disable)" : "ClawPilot inline completions: OFF (click to enable)";
    this._item.color = enabled ? void 0 : new vscode5.ThemeColor("statusBarItem.warningForeground");
  }
};

// src/chatViewProvider.ts
var vscode10 = __toESM(require("vscode"));
var path4 = __toESM(require("path"));
var import_child_process3 = require("child_process");

// src/agentRunner.ts
var vscode8 = __toESM(require("vscode"));
var path2 = __toESM(require("path"));
var fs2 = __toESM(require("fs"));

// src/tools/agentTools.ts
var vscode7 = __toESM(require("vscode"));
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var import_child_process2 = require("child_process");

// src/diff/diffEngine.ts
var CONTEXT_LINES = 3;
var MAX_OUTPUT_LINES = 300;
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function computeDiff(oldText, newText) {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);
  const n = oldLines.length;
  const m = newLines.length;
  const out = [];
  let i = 0, j = 0;
  let contextCount = 0;
  while (i < n || j < m) {
    if (i < n && j < m && oldLines[i] === newLines[j]) {
      if (contextCount < CONTEXT_LINES) {
        out.push({ type: "context", content: oldLines[i] ?? "", lineNo: i + 1 });
        contextCount++;
      } else if (contextCount === CONTEXT_LINES) {
        out.push({ type: "context", content: "..." });
        contextCount++;
      }
      i++;
      j++;
      continue;
    }
    contextCount = 0;
    if (i < n && j < m) {
      const nextOld = oldLines.indexOf(newLines[j], i + 1);
      const nextNew = newLines.indexOf(oldLines[i], j + 1);
      if (nextOld !== -1 && (nextNew === -1 || nextOld - i <= nextNew - j)) {
        while (i < nextOld) {
          out.push({ type: "remove", content: oldLines[i] ?? "", lineNo: i + 1 });
          i++;
        }
        continue;
      }
      if (nextNew !== -1 && (nextOld === -1 || nextNew - j <= nextOld - i)) {
        while (j < nextNew) {
          out.push({ type: "add", content: newLines[j] ?? "", lineNo: j + 1 });
          j++;
        }
        continue;
      }
    }
    if (i < n && j < m) {
      out.push({ type: "remove", content: oldLines[i] ?? "", lineNo: i + 1 });
      out.push({ type: "add", content: newLines[j] ?? "", lineNo: j + 1 });
      i++;
      j++;
    } else if (i < n) {
      out.push({ type: "remove", content: oldLines[i] ?? "", lineNo: i + 1 });
      i++;
    } else {
      out.push({ type: "add", content: newLines[j] ?? "", lineNo: j + 1 });
      j++;
    }
  }
  if (out.length > MAX_OUTPUT_LINES) {
    const truncated = out.slice(0, MAX_OUTPUT_LINES);
    truncated.push({ type: "context", content: `... (${out.length - MAX_OUTPUT_LINES} more lines truncated)` });
    return truncated;
  }
  return out;
}
function formatDiffHtml(diff) {
  const maxLines = Math.min(diff.length, MAX_OUTPUT_LINES);
  const parts = [];
  for (let i = 0; i < maxLines; i++) {
    const line = diff[i];
    const cls = line.type === "add" ? "diff-add" : line.type === "remove" ? "diff-remove" : "diff-context";
    const prefix = line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
    parts.push(`<div class="diff-line ${cls}">${escapeHtml(prefix + " " + line.content)}</div>`);
  }
  if (diff.length > MAX_OUTPUT_LINES) {
    parts.push(`<div class="diff-line diff-context">... (${diff.length - MAX_OUTPUT_LINES} more lines)</div>`);
  }
  return parts.join("");
}

// src/git/gitClient.ts
var import_child_process = require("child_process");
var vscode6 = __toESM(require("vscode"));
var MAX_OUTPUT = 8e3;
function getRoot() {
  return vscode6.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}
function run(cmd, cwd) {
  try {
    const out = (0, import_child_process.execSync)(cmd, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return out.length > MAX_OUTPUT ? out.slice(0, MAX_OUTPUT) + "\n... (truncated)" : out;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return `Error: ${msg.slice(0, 500)}`;
  }
}
function gitStatus() {
  const root = getRoot();
  if (!root) return "Error: No workspace open.";
  return run("git status --short", root);
}
function gitStatusParsed() {
  const root = getRoot();
  if (!root) return { branch: "unknown", dirtyCount: 0, raw: "" };
  try {
    const branch = (0, import_child_process.execSync)("git rev-parse --abbrev-ref HEAD", {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    const raw = (0, import_child_process.execSync)("git status --short", {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    const lines = raw.split("\n").filter((l) => l.trim());
    return { branch, dirtyCount: lines.length, raw };
  } catch {
    return { branch: "unknown", dirtyCount: 0, raw: "" };
  }
}
function gitDiff(args) {
  const root = getRoot();
  if (!root) return "Error: No workspace open.";
  const staged = args.staged ? "--staged" : "";
  const file = args.file ? `-- "${args.file}"` : "";
  return run(`git diff ${staged} ${file}`.trim(), root);
}
function gitLog(args) {
  const root = getRoot();
  if (!root) return "Error: No workspace open.";
  const n = Math.min(args.count ?? 10, 50);
  return run(`git log --oneline -${n}`, root);
}
function gitCommit(args) {
  const root = getRoot();
  if (!root) return "Error: No workspace open.";
  if (!args.message?.trim()) return "Error: Commit message is required.";
  const msg = args.message.replace(/[`"$\\]/g, " ").trim();
  if (args.addAll) {
    const addResult = run("git add -A", root);
    if (addResult.startsWith("Error:")) return addResult;
  }
  return run(`git commit -m "${msg}"`, root);
}
function gitBranch(args) {
  const root = getRoot();
  if (!root) return "Error: No workspace open.";
  if (args.create) {
    const name = args.create.replace(/[^a-zA-Z0-9/_.-]/g, "-");
    return run(`git checkout -b "${name}"`, root);
  }
  return run("git branch -a", root);
}
function gitCheckout(args) {
  const root = getRoot();
  if (!root) return "Error: No workspace open.";
  const name = args.branch.replace(/[^a-zA-Z0-9/_.-]/g, "-");
  return run(`git checkout "${name}"`, root);
}

// src/tools/agentTools.ts
var TOOL_DEFINITIONS = [
  {
    name: "read_file",
    description: "Read the contents of a file in the workspace",
    parameters: {
      path: { type: "string", description: "Relative path to the file from workspace root", required: true }
    }
  },
  {
    name: "write_file",
    description: "Write or overwrite a file with new content",
    parameters: {
      path: { type: "string", description: "Relative path to the file from workspace root", required: true },
      content: { type: "string", description: "Full content to write to the file", required: true }
    }
  },
  {
    name: "edit_file",
    description: "Replace a specific block of text in a file with new content (surgical edit)",
    parameters: {
      path: { type: "string", description: "Relative path to the file", required: true },
      old_text: { type: "string", description: "Exact text block to find and replace", required: true },
      new_text: { type: "string", description: "New text to replace the old block with", required: true }
    }
  },
  {
    name: "create_file",
    description: "Create a new file with content (fails if file already exists)",
    parameters: {
      path: { type: "string", description: "Relative path to the new file", required: true },
      content: { type: "string", description: "Content to write to the new file", required: true }
    }
  },
  {
    name: "delete_file",
    description: "Delete a file from the workspace",
    parameters: {
      path: { type: "string", description: "Relative path to the file to delete", required: true }
    }
  },
  {
    name: "list_files",
    description: "List files and directories in a directory",
    parameters: {
      path: { type: "string", description: "Relative directory path (default: workspace root)", required: false },
      pattern: { type: "string", description: 'Glob pattern to filter files (e.g. "**/*.ts")', required: false }
    }
  },
  {
    name: "search_in_files",
    description: "Search for text or regex pattern across workspace files",
    parameters: {
      query: { type: "string", description: "Text or regex pattern to search for", required: true },
      file_pattern: { type: "string", description: 'Glob pattern for files to search in (e.g. "**/*.ts")', required: false }
    }
  },
  {
    name: "run_terminal",
    description: "Run a shell command in the workspace directory and return its output",
    parameters: {
      command: { type: "string", description: "Shell command to execute", required: true }
    }
  },
  {
    name: "get_diagnostics",
    description: "Get current errors and warnings from VS Code diagnostics (linting, type errors)",
    parameters: {
      path: { type: "string", description: "File path to get diagnostics for (optional, all files if omitted)", required: false }
    }
  },
  {
    name: "semantic_search",
    description: "Semantically search the codebase for code related to a concept or query",
    parameters: {
      query: { type: "string", description: "Natural language or concept to search for", required: true },
      top_k: { type: "string", description: "Maximum number of results (default 5)", required: false }
    }
  },
  {
    name: "save_memory",
    description: "Save an important fact, decision, or insight to persistent memory for future sessions",
    parameters: {
      content: { type: "string", description: "Content to save", required: true },
      tier: { type: "string", description: "'recall' or 'archival' (default recall)", required: false },
      tags: { type: "string", description: "Optional comma-separated tags", required: false }
    }
  },
  {
    name: "search_memory",
    description: "Search your persistent memory for relevant past context, decisions, or facts",
    parameters: {
      query: { type: "string", description: "Search query", required: true },
      tier: { type: "string", description: "'recall' | 'archival' | 'both' (default both)", required: false },
      top_k: { type: "string", description: "Max results (default 5)", required: false }
    }
  },
  {
    name: "update_project_context",
    description: "Update the always-present project context (what this project is, its tech stack, architecture)",
    parameters: {
      context: { type: "string", description: "Project context text (replaces existing)", required: true }
    }
  },
  {
    name: "add_key_fact",
    description: "Add a critical fact to always-present core memory (e.g. Auth uses JWT, DB is PostgreSQL)",
    parameters: {
      fact: { type: "string", description: "Fact to add (max 100 chars)", required: true }
    }
  },
  {
    name: "add_skill",
    description: "Save a reusable coding pattern or instruction as a skill for future use",
    parameters: {
      name: { type: "string", description: "Skill name", required: true },
      description: { type: "string", description: "Short description for matching", required: true },
      content: { type: "string", description: "Full skill instructions/examples", required: true },
      tags: { type: "string", description: "Optional comma-separated tags", required: false }
    }
  },
  {
    name: "git_status",
    description: "Show the working tree status (modified, untracked, staged files)",
    parameters: {}
  },
  {
    name: "git_diff",
    description: "Show unstaged or staged changes. Optionally for a specific file.",
    parameters: {
      staged: { type: "boolean", description: "Show staged changes (default: unstaged)" },
      file: { type: "string", description: "Optional: specific file path to diff" }
    }
  },
  {
    name: "git_log",
    description: "Show recent commit history (oneline format)",
    parameters: {
      count: { type: "number", description: "Number of commits to show (default 10, max 50)" }
    }
  },
  {
    name: "git_commit",
    description: "Stage all changes and create a git commit",
    parameters: {
      message: { type: "string", description: "Commit message", required: true },
      addAll: { type: "boolean", description: "Stage all changes before committing (git add -A)" }
    }
  },
  {
    name: "git_branch",
    description: "List all branches, or create a new branch and switch to it",
    parameters: {
      create: { type: "string", description: "Name of new branch to create and switch to" }
    }
  },
  {
    name: "git_checkout",
    description: "Switch to an existing branch",
    parameters: {
      branch: { type: "string", description: "Branch name to checkout", required: true }
    }
  }
];
var AgentTools = class {
  constructor(workspaceIndex2, memoryStore2, skillStore2) {
    const folders = vscode7.workspace.workspaceFolders;
    this.workspaceRoot = folders ? folders[0].uri.fsPath : "";
    this.workspaceIndex = workspaceIndex2;
    this.memoryStore = memoryStore2;
    this.skillStore = skillStore2;
  }
  resolvePath(relativePath) {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    return path.join(this.workspaceRoot, relativePath);
  }
  async executeTool(name, args) {
    try {
      switch (name) {
        case "read_file":
          return await this.readFile(args.path);
        case "write_file":
          return await this.writeFile(args.path, args.content);
        case "edit_file":
          return await this.editFile(args.path, args.old_text, args.new_text);
        case "create_file":
          return await this.createFile(args.path, args.content);
        case "delete_file":
          return await this.deleteFile(args.path);
        case "list_files":
          return await this.listFiles(args.path, args.pattern);
        case "search_in_files":
          return await this.searchInFiles(args.query, args.file_pattern);
        case "run_terminal":
          return await this.runTerminal(args.command);
        case "get_diagnostics":
          return await this.getDiagnostics(args.path);
        case "semantic_search":
          return await this.semanticSearch(args.query, args.top_k);
        case "save_memory":
          return await this.saveMemory(args.content, args.tier, args.tags);
        case "search_memory":
          return await this.searchMemory(args.query, args.tier, args.top_k);
        case "update_project_context":
          return await this.updateProjectContext(args.context);
        case "add_key_fact":
          return await this.addKeyFact(args.fact);
        case "add_skill":
          return await this.addSkill(args.name, args.description, args.content, args.tags);
        case "git_status":
          return { success: true, output: gitStatus() };
        case "git_diff":
          return { success: true, output: gitDiff({ staged: args.staged === "true", file: args.file }) };
        case "git_log":
          return { success: true, output: gitLog({ count: args.count ? parseInt(args.count, 10) : 10 }) };
        case "git_commit": {
          const out = gitCommit({ message: args.message ?? "", addAll: args.addAll === "true" });
          const failed = out.startsWith("Error:") || out.includes("nothing to commit");
          return { success: !failed, output: out, error: failed ? out : void 0 };
        }
        case "git_branch":
          return { success: true, output: gitBranch({ create: args.create }) };
        case "git_checkout":
          return { success: true, output: gitCheckout({ branch: args.branch ?? "" }) };
        default:
          return { success: false, output: "", error: `Unknown tool: ${name}` };
      }
    } catch (err) {
      return { success: false, output: "", error: err.message || String(err) };
    }
  }
  async readFile(filePath) {
    const fullPath = this.resolvePath(filePath);
    if (!fs.existsSync(fullPath)) {
      return { success: false, output: "", error: `File not found: ${filePath}` };
    }
    const content = fs.readFileSync(fullPath, "utf8");
    const lines = content.split("\n");
    const numbered = lines.map((line, i) => `${String(i + 1).padStart(4, " ")} | ${line}`).join("\n");
    return { success: true, output: `File: ${filePath}
${"\u2500".repeat(60)}
${numbered}` };
  }
  async writeFile(filePath, content) {
    const fullPath = this.resolvePath(filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const existed = fs.existsSync(fullPath);
    const oldContent = existed ? fs.readFileSync(fullPath, "utf8") : "";
    fs.writeFileSync(fullPath, content, "utf8");
    const uri = vscode7.Uri.file(fullPath);
    await vscode7.workspace.openTextDocument(uri);
    const lines = computeDiff(oldContent, content);
    const diff = { path: filePath, oldContent, newContent: content, lines, isNew: !existed };
    return { success: true, output: `${existed ? "Updated" : "Created"} file: ${filePath} (${content.split("\n").length} lines)`, diff };
  }
  async editFile(filePath, oldText, newText) {
    const fullPath = this.resolvePath(filePath);
    if (!fs.existsSync(fullPath)) {
      return { success: false, output: "", error: `File not found: ${filePath}` };
    }
    const content = fs.readFileSync(fullPath, "utf8");
    if (!content.includes(oldText)) {
      return { success: false, output: "", error: `Text not found in ${filePath}. The exact text block could not be located.` };
    }
    const updated = content.replace(oldText, newText);
    fs.writeFileSync(fullPath, updated, "utf8");
    const uri = vscode7.Uri.file(fullPath);
    const doc = await vscode7.workspace.openTextDocument(uri);
    await vscode7.window.showTextDocument(doc, { preview: false, preserveFocus: true });
    const lines = computeDiff(content, updated);
    const diff = { path: filePath, oldContent: content, newContent: updated, lines, isNew: false };
    const removedLines = oldText.split("\n").length;
    const addedLines = newText.split("\n").length;
    return { success: true, output: `Edited ${filePath}: replaced ${removedLines} lines with ${addedLines} lines`, diff };
  }
  async createFile(filePath, content) {
    const fullPath = this.resolvePath(filePath);
    if (fs.existsSync(fullPath)) {
      return { success: false, output: "", error: `File already exists: ${filePath}. Use write_file to overwrite.` };
    }
    return this.writeFile(filePath, content);
  }
  async deleteFile(filePath) {
    const fullPath = this.resolvePath(filePath);
    if (!fs.existsSync(fullPath)) {
      return { success: false, output: "", error: `File not found: ${filePath}` };
    }
    fs.unlinkSync(fullPath);
    return { success: true, output: `Deleted file: ${filePath}` };
  }
  async listFiles(dirPath, pattern) {
    const searchDir = dirPath ? this.resolvePath(dirPath) : this.workspaceRoot;
    if (!this.workspaceRoot) {
      return { success: false, output: "", error: "No workspace folder open" };
    }
    const glob = pattern || "**/*";
    const uris = await vscode7.workspace.findFiles(
      new vscode7.RelativePattern(this.workspaceRoot, glob),
      "**/node_modules/**",
      500
    );
    if (dirPath) {
      const filtered = uris.filter((u) => u.fsPath.startsWith(searchDir));
      const relative7 = filtered.map((u) => path.relative(this.workspaceRoot, u.fsPath)).sort();
      return { success: true, output: relative7.length ? relative7.join("\n") : "No files found" };
    }
    const relative6 = uris.map((u) => path.relative(this.workspaceRoot, u.fsPath)).sort();
    return { success: true, output: relative6.length ? relative6.join("\n") : "No files found" };
  }
  async searchInFiles(query, filePattern) {
    if (!this.workspaceRoot) {
      return { success: false, output: "", error: "No workspace folder open" };
    }
    const glob = filePattern || "**/*";
    const uris = await vscode7.workspace.findFiles(
      new vscode7.RelativePattern(this.workspaceRoot, glob),
      "**/node_modules/**",
      200
    );
    const results = [];
    let regex;
    try {
      regex = new RegExp(query, "gi");
    } catch {
      regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    }
    for (const uri of uris) {
      try {
        const content = fs.readFileSync(uri.fsPath, "utf8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            const rel = path.relative(this.workspaceRoot, uri.fsPath);
            results.push(`${rel}:${i + 1}: ${lines[i].trim()}`);
          }
          regex.lastIndex = 0;
        }
      } catch {
      }
      if (results.length > 100) {
        break;
      }
    }
    return {
      success: true,
      output: results.length ? results.join("\n") : `No matches found for: ${query}`
    };
  }
  async runTerminal(command) {
    if (!this.workspaceRoot) {
      return { success: false, output: "", error: "No workspace folder open" };
    }
    const dangerous = /\b(rm\s+-rf|format|mkfs|dd\s+if=|shutdown|reboot|:(){ :|:& };:)\b/i;
    if (dangerous.test(command)) {
      return { success: false, output: "", error: `Command blocked for safety: ${command}` };
    }
    try {
      const output = (0, import_child_process2.execSync)(command, {
        cwd: this.workspaceRoot,
        encoding: "utf8",
        timeout: 3e4,
        maxBuffer: 1024 * 1024 * 5
        // 5MB
      });
      return { success: true, output: output || "(no output)" };
    } catch (err) {
      const stderr = err.stderr || "";
      const stdout = err.stdout || "";
      return {
        success: false,
        output: stdout,
        error: stderr || err.message || "Command failed"
      };
    }
  }
  async getDiagnostics(filePath) {
    let diagnostics;
    if (filePath) {
      const fullPath = this.resolvePath(filePath);
      const uri = vscode7.Uri.file(fullPath);
      const diags = vscode7.languages.getDiagnostics(uri);
      diagnostics = [[uri, diags]];
    } else {
      diagnostics = vscode7.languages.getDiagnostics();
    }
    const lines = [];
    for (const [uri, diags] of diagnostics) {
      if (diags.length === 0) {
        continue;
      }
      const rel = this.workspaceRoot ? path.relative(this.workspaceRoot, uri.fsPath) : uri.fsPath;
      for (const d of diags) {
        const severity = ["Error", "Warning", "Info", "Hint"][d.severity];
        const line = d.range.start.line + 1;
        const col = d.range.start.character + 1;
        lines.push(`[${severity}] ${rel}:${line}:${col} - ${d.message}`);
      }
    }
    return {
      success: true,
      output: lines.length ? lines.join("\n") : "No diagnostics found (no errors or warnings)"
    };
  }
  async semanticSearch(query, topKStr) {
    if (!this.workspaceIndex) {
      return { success: false, output: "", error: "Workspace index not available. Use Re-index Workspace first." };
    }
    if (!query?.trim()) {
      return { success: false, output: "", error: 'semantic_search requires a "query" argument.' };
    }
    try {
      const topK = topKStr ? Math.max(1, parseInt(topKStr, 10) || 5) : 5;
      const chunks = await this.workspaceIndex.query(query, topK);
      const lines = [];
      for (const c of chunks) {
        lines.push(`--- ${c.filePath} | ${c.type}: ${c.name} | lines ${c.startLine}-${c.endLine} ---`);
        lines.push(c.content);
        lines.push("");
      }
      return {
        success: true,
        output: lines.length ? lines.join("\n") : "No relevant code found for that query."
      };
    } catch (err) {
      return {
        success: false,
        output: "",
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
  async saveMemory(content, tier, tagsStr) {
    if (!this.memoryStore) {
      return { success: false, output: "", error: "Memory not available." };
    }
    if (!content?.trim()) {
      return { success: false, output: "", error: 'save_memory requires "content".' };
    }
    try {
      const tags = tagsStr ? tagsStr.split(",").map((t2) => t2.trim()).filter(Boolean) : [];
      const t = (tier || "recall").toLowerCase();
      if (t === "archival") {
        await this.memoryStore.addArchival(content.trim(), "agent", tags);
      } else {
        await this.memoryStore.addRecall(content.trim(), "agent", tags);
      }
      return { success: true, output: `Saved to ${t} memory.` };
    } catch (err) {
      return { success: false, output: "", error: err instanceof Error ? err.message : String(err) };
    }
  }
  async searchMemory(query, tier, topKStr) {
    if (!this.memoryStore) {
      return { success: false, output: "", error: "Memory not available." };
    }
    if (!query?.trim()) {
      return { success: false, output: "", error: 'search_memory requires "query".' };
    }
    try {
      const t = (tier || "both").toLowerCase();
      const topK = topKStr ? Math.max(1, parseInt(topKStr, 10) || 5) : 5;
      const entries = this.memoryStore.searchMemory(query, t, topK);
      const lines = entries.map((e) => `[${e.source}] ${e.content}`);
      return { success: true, output: lines.length ? lines.join("\n\n") : "No matching memory found." };
    } catch (err) {
      return { success: false, output: "", error: err instanceof Error ? err.message : String(err) };
    }
  }
  async updateProjectContext(context) {
    if (!this.memoryStore) {
      return { success: false, output: "", error: "Memory not available." };
    }
    try {
      await this.memoryStore.updateCoreMemory({ projectContext: context || "" });
      return { success: true, output: "Project context updated." };
    } catch (err) {
      return { success: false, output: "", error: err instanceof Error ? err.message : String(err) };
    }
  }
  async addKeyFact(fact) {
    if (!this.memoryStore) {
      return { success: false, output: "", error: "Memory not available." };
    }
    const f = fact?.trim().slice(0, 100);
    if (!f) {
      return { success: false, output: "", error: 'add_key_fact requires "fact".' };
    }
    try {
      const core = this.memoryStore.getCoreMemory();
      const keyFacts = [...core.keyFacts, f].slice(-10);
      await this.memoryStore.updateCoreMemory({ keyFacts });
      return { success: true, output: "Key fact added." };
    } catch (err) {
      return { success: false, output: "", error: err instanceof Error ? err.message : String(err) };
    }
  }
  async addSkill(name, description, content, tagsStr) {
    if (!this.skillStore) {
      return { success: false, output: "", error: "Skill store not available." };
    }
    if (!name?.trim() || !description?.trim() || !content?.trim()) {
      return { success: false, output: "", error: "add_skill requires name, description, and content." };
    }
    try {
      const tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const skill = await this.skillStore.addSkill(name.trim(), description.trim(), content.trim(), tags);
      return { success: true, output: `Skill "${skill.name}" saved (id: ${skill.id}).` };
    } catch (err) {
      return { success: false, output: "", error: err instanceof Error ? err.message : String(err) };
    }
  }
  /** Generate the system prompt block describing all tools */
  static getToolsSystemPrompt() {
    return `You are a powerful local coding assistant with access to tools that let you read, write, and modify files, search the codebase, and run terminal commands \u2014 just like Claude Code.

## TOOLS AVAILABLE

You can use the following tools by outputting JSON in this exact format:
<tool_call>
{"tool": "tool_name", "args": {"param1": "value1", "param2": "value2"}}
</tool_call>

Available tools:

${TOOL_DEFINITIONS.map((t) => {
      const params = Object.entries(t.parameters).map(([k, v]) => `  - ${k} (${v.type}${v.required ? ", required" : ", optional"}): ${v.description}`).join("\n");
      return `### ${t.name}
${t.description}
Parameters:
${params}`;
    }).join("\n\n")}

## RULES

1. Think step-by-step before taking action
2. Read files before editing them
3. Use edit_file for small surgical changes; use write_file for full rewrites
4. Always show your reasoning before making tool calls
5. After all tool calls are done, output: <agent_done>
6. If you need user confirmation before destructive actions, ask first
7. Use save_memory to record important decisions, findings, or facts discovered during tasks
8. Use search_memory at the start of complex tasks to check for relevant prior context
9. Use update_project_context when you learn the project's purpose, stack, or architecture
10. Use add_key_fact for critical facts that should always be available (e.g. API keys pattern, DB schema, coding conventions)

## PLAN MODE

When the user asks for a plan, output:
<plan>
## Plan: [Task Name]

**Steps:**
1. [Step description]
2. [Step description]
...

**Files to modify:** [list]
**Commands to run:** [list]
</plan>

Then wait for user to confirm before executing.`;
  }
};

// src/reflexion/reflectionEngine.ts
var ReflectionEngine = class {
  constructor(maxReflections = 3) {
    this._context = { entries: [], totalAttempts: 0 };
    this._maxReflections = maxReflections;
  }
  reset() {
    this._context = { entries: [], totalAttempts: 0 };
  }
  shouldRetry() {
    return this._context.totalAttempts < this._maxReflections;
  }
  getReflectionCount() {
    return this._context.entries.length;
  }
  reflect(error, toolName, _toolArgs, attempt) {
    const err = error.toLowerCase();
    let reflection;
    if (err.includes("not found") || err.includes("enoent") || err.includes("file not found")) {
      reflection = "The file path was wrong. I should use list_files first to confirm the exact path.";
    } else if (err.includes("text not found") || err.includes("could not be located")) {
      reflection = "The old_text didn't match exactly. I should read_file first to get the current content, then use the exact text from the file.";
    } else if (err.includes("command failed") || err.includes("exit code") || err.includes("command blocked")) {
      reflection = "The command failed. I should check the error output and try a different approach or fix the issue before retrying.";
    } else if (err.includes("already exists")) {
      reflection = "The file already exists. I should use write_file instead of create_file, or read it first to decide if I should overwrite.";
    } else if (err.includes("error ts") || err.includes("syntaxerror") || err.includes("typescript")) {
      reflection = "There is a compile error. I should read the file again, fix the syntax, and ensure types are correct before writing.";
    } else if (err.includes("no relevant code found") || err.includes("no matching")) {
      reflection = "Semantic search found nothing. I should try different search terms or use list_files to browse the structure directly.";
    } else {
      reflection = `The previous attempt failed with: ${error.slice(0, 200)}. I should try a different approach.`;
    }
    const entry = {
      attempt,
      toolName,
      error,
      reflection,
      timestamp: Date.now()
    };
    this._context.entries.push(entry);
    this._context.totalAttempts += 1;
    return entry;
  }
  getReflectionBlock() {
    if (this._context.entries.length === 0) {
      return "";
    }
    const lines = [
      "<reflexion>",
      ...this._context.entries.map(
        (e) => `Attempt ${e.attempt} failed. Reflection: ${e.reflection}`
      ),
      "Based on these failures, try a different approach.",
      "</reflexion>"
    ];
    return lines.join("\n");
  }
  static isTerminalSuccess(output, command) {
    const out = output.toLowerCase();
    const cmd = command.toLowerCase();
    if (cmd.includes("test") || cmd.includes("jest") || cmd.includes("vitest") || cmd.includes("pytest")) {
      if (out.includes("failed") || out.includes("fail")) {
        return false;
      }
      return out.includes("passed") || out.includes("\u2713") || out.includes("ok");
    }
    if (cmd.includes("tsc") || cmd.includes("npm run build") || cmd.includes("cargo build") || cmd.includes("go build")) {
      if (out.includes("error")) {
        return false;
      }
      return out.length === 0 || out.includes("successfully compiled");
    }
    if (cmd.includes("npm install") || cmd.includes("pip install")) {
      return !out.includes("err!") && !out.includes("error");
    }
    return true;
  }
};

// src/agentRunner.ts
function parseToolCall(text) {
  const match = text.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/);
  if (!match) {
    return null;
  }
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.tool && typeof parsed.tool === "string") {
      return { tool: parsed.tool, args: parsed.args || {} };
    }
  } catch {
  }
  return null;
}
function parsePlan(text) {
  const match = text.match(/<plan>([\s\S]*?)<\/plan>/);
  return match ? match[1].trim() : null;
}
function isDone(text) {
  return text.includes("<agent_done>") || text.includes("</agent_done>");
}
var FILE_EDIT_TOOLS = /* @__PURE__ */ new Set(["write_file", "edit_file", "create_file"]);
var DIFF_TIMEOUT_MS = 5 * 60 * 1e3;
var AgentRunner = class {
  constructor(client2, tools, maxReflections) {
    this._pendingDiffs = /* @__PURE__ */ new Map();
    this._stopRequested = false;
    this.client = client2;
    this.tools = tools ?? new AgentTools();
    this._maxReflections = maxReflections ?? 3;
  }
  async _revertFile(path14, content) {
    await this.tools.executeTool("write_file", { path: path14, content });
  }
  async _deleteFile(path14) {
    await this.tools.executeTool("delete_file", { path: path14 });
  }
  stop() {
    this._stopRequested = true;
  }
  resolveDiff(stepId, approved) {
    const resolve = this._pendingDiffs.get(stepId);
    if (resolve) {
      this._pendingDiffs.delete(stepId);
      resolve(approved);
    }
  }
  _awaitDiffDecision(stepId) {
    return new Promise((resolve) => {
      this._pendingDiffs.set(stepId, resolve);
      setTimeout(() => {
        if (this._pendingDiffs.has(stepId)) {
          this._pendingDiffs.delete(stepId);
          resolve(false);
        }
      }, DIFF_TIMEOUT_MS);
    });
  }
  async run(options) {
    this._stopRequested = false;
    const { messages, model, onStep, maxIterations = 15 } = options;
    const maxReflections = options.maxReflections ?? this._maxReflections;
    const diffPreviewEnabled = options.diffPreviewEnabled !== false;
    const config = vscode8.workspace.getConfiguration("clawpilot");
    const fallbackModels = config.get("fallbackModels", []);
    const history = [...messages];
    const reflectionEngine = new ReflectionEngine(maxReflections);
    const filesTouched = /* @__PURE__ */ new Set();
    let iteration = 0;
    while (iteration < maxIterations) {
      if (this._stopRequested) {
        this._stopRequested = false;
        onStep({ type: "done", content: "[Stopped by user]" });
        return;
      }
      let fullResponse = "";
      onStep({ type: "thinking", content: "" });
      try {
        for await (const chunk of this.client.streamChatWithFallback(history, model, fallbackModels)) {
          if (chunk.startsWith("[ClawPilot: switching to fallback model:")) {
            onStep({ type: "thinking", content: "[Switching to fallback model...]" });
            continue;
          }
          fullResponse += chunk;
          onStep({ type: "response", content: chunk });
        }
      } catch (err) {
        onStep({ type: "error", content: err instanceof Error ? err.message : "Streaming failed" });
        return;
      }
      const plan = parsePlan(fullResponse);
      if (plan) {
        onStep({ type: "plan", content: plan });
        history.push({ role: "assistant", content: fullResponse });
        return;
      }
      const toolCall = parseToolCall(fullResponse);
      if (toolCall) {
        onStep({
          type: "tool_call",
          content: `Calling ${toolCall.tool}`,
          toolName: toolCall.tool,
          toolArgs: toolCall.args
        });
        const result = await this.tools.executeTool(toolCall.tool, toolCall.args);
        if (FILE_EDIT_TOOLS.has(toolCall.tool) && result.success && toolCall.args.path) {
          filesTouched.add(toolCall.args.path);
        }
        let treatAsFailure = !result.success;
        let failureError = result.error || result.output || "Tool failed";
        if (result.success && toolCall.tool === "run_terminal" && toolCall.args.command) {
          if (!ReflectionEngine.isTerminalSuccess(result.output, toolCall.args.command)) {
            treatAsFailure = true;
            failureError = "Command completed but output indicates failure: " + result.output.slice(0, 300);
          }
        }
        if (treatAsFailure) {
          const attempt = reflectionEngine.getReflectionCount() + 1;
          const entry = reflectionEngine.reflect(
            failureError,
            toolCall.tool,
            toolCall.args,
            attempt
          );
          onStep({
            type: "tool_result",
            content: result.success ? result.output : result.error || "Tool failed",
            toolName: toolCall.tool,
            success: false
          });
          onStep({ type: "reflection", content: entry.reflection, attempt: entry.attempt });
          if (!reflectionEngine.shouldRetry()) {
            onStep({ type: "error", content: "Max reflections reached. Could not complete task." });
            return;
          }
          history.push({ role: "assistant", content: fullResponse });
          history.push({
            role: "user",
            content: reflectionEngine.getReflectionBlock() + "\n\nThe previous tool call failed. Review the reflection above and try again with a corrected approach."
          });
          continue;
        }
        if (result.diff && diffPreviewEnabled) {
          const stepId = `diff_${Date.now()}`;
          onStep({ type: "diff_preview", content: "", diff: result.diff, stepId });
          const approved = await this._awaitDiffDecision(stepId);
          if (!approved) {
            const d = result.diff;
            filesTouched.delete(d.path);
            if (d.isNew) {
              await this._deleteFile(d.path);
            } else {
              await this._revertFile(d.path, d.oldContent);
            }
            history.push({ role: "assistant", content: fullResponse });
            history.push({
              role: "user",
              content: `The file change to ${d.path} was rejected by the user. Do NOT make this change. Try a different approach or ask what to do instead.`
            });
            onStep({ type: "reflection", content: "File change rejected by user.", attempt: 0 });
            continue;
          }
        }
        onStep({
          type: "tool_result",
          content: result.output,
          toolName: toolCall.tool,
          success: true
        });
        history.push({ role: "assistant", content: fullResponse });
        history.push({
          role: "user",
          content: `<tool_result tool="${toolCall.tool}" success="true">
${result.output}
</tool_result>

Continue with the task.`
        });
        iteration++;
        continue;
      }
      if (isDone(fullResponse) || !toolCall) {
        if (filesTouched.size > 0 && maxReflections > 0) {
          const tscError = await this.runPostTaskTscCheck();
          if (tscError) {
            const attempt = reflectionEngine.getReflectionCount() + 1;
            reflectionEngine.reflect(tscError, "post_task_tsc", {}, attempt);
            if (reflectionEngine.shouldRetry()) {
              onStep({ type: "reflection", content: tscError.slice(0, 400), attempt });
              history.push({ role: "assistant", content: fullResponse });
              history.push({
                role: "user",
                content: reflectionEngine.getReflectionBlock() + "\n\nTypeScript compilation failed after your changes. Fix the errors above and try again."
              });
              continue;
            }
          }
        }
        onStep({ type: "done", content: fullResponse });
        return;
      }
      iteration++;
    }
    onStep({ type: "error", content: `Agent reached max iterations (${maxIterations}). Task may be incomplete.` });
  }
  async runPostTaskTscCheck() {
    const folders = vscode8.workspace.workspaceFolders;
    if (!folders?.length) {
      return null;
    }
    const root = folders[0].uri.fsPath;
    const tsconfigPath = path2.join(root, "tsconfig.json");
    if (!fs2.existsSync(tsconfigPath)) {
      return null;
    }
    try {
      const result = await this.tools.executeTool("run_terminal", {
        command: "npx tsc --noEmit 2>&1 || true"
      });
      if (!result.success || !result.output) {
        return null;
      }
      const out = result.output;
      if (out.toLowerCase().includes("error ts") || out.includes("SyntaxError")) {
        return "TypeScript compilation failed after changes. I need to fix these errors: " + out.slice(0, 500);
      }
      return null;
    } catch {
      return null;
    }
  }
  /** Resume execution after user approves a plan */
  async resumeAfterPlan(messages, model, onStep) {
    const history = [
      ...messages,
      { role: "user", content: "Plan approved. Please proceed with execution now." }
    ];
    await this.run({ messages: history, model, onStep });
  }
  getTools() {
    return this.tools;
  }
};

// src/utils.ts
function renderMarkdownToHtml(text) {
  if (!text) return "";
  let html = escapeHtml2(text);
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_, lang, code) => {
      const codeEscaped = escapeHtml2(code.trim());
      const langLabel = lang ? lang : "plaintext";
      return `<div class="code-block"><div class="code-block-header"><span class="code-lang">${escapeHtml2(langLabel)}</span><div class="code-actions"><button class="code-btn copy-btn" data-code="${escapeAttr(code.trim())}">Copy</button><button class="code-btn insert-btn" data-code="${escapeAttr(code.trim())}">Insert</button></div></div><pre><code>${codeEscaped}</code></pre></div>`;
    }
  );
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/^[\*\-] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");
  html = html.replace(/\n/g, "<br>\n");
  return html;
}
function escapeHtml2(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeAttr(s) {
  return escapeHtml2(s).replace(/'/g, "&#39;");
}

// src/slash/slashCommands.ts
var SLASH_COMMANDS = [
  {
    name: "help",
    usage: "/help",
    description: "Show all available slash commands",
    isDynamic: true
  },
  {
    name: "clear",
    usage: "/clear",
    description: "Clear the current session messages",
    isDynamic: true
  },
  {
    name: "new",
    usage: "/new [session name]",
    description: "Start a new chat session",
    isDynamic: true
  },
  {
    name: "status",
    usage: "/status",
    description: "Ask ClawPilot to summarise the current git status",
    expandTo: "Run git_status and git_log to summarise the current state of the repo. List modified files and the last 5 commits. Be concise."
  },
  {
    name: "commit",
    usage: "/commit <message>",
    description: "Stage all changes and commit with the given message",
    isDynamic: true
  },
  {
    name: "search",
    usage: "/search <query>",
    description: "Search the workspace with RAG and show top results",
    isDynamic: true
  },
  {
    name: "explain",
    usage: "/explain",
    description: "Explain the current editor selection",
    isDynamic: true
  },
  {
    name: "fix",
    usage: "/fix",
    description: "Find and fix bugs in the current editor selection",
    isDynamic: true
  },
  {
    name: "tests",
    usage: "/tests",
    description: "Write unit tests for the current editor selection",
    isDynamic: true
  },
  {
    name: "model",
    usage: "/model <name>",
    description: "Switch the active model",
    isDynamic: true
  },
  {
    name: "install",
    usage: "/install <model>",
    description: "Install (pull) a model via Ollama and switch to it",
    isDynamic: true
  },
  {
    name: "skills",
    usage: "/skills",
    description: "List and invoke ClawPilot built-in and saved skills",
    isDynamic: true
  }
];
function matchSlashCommand(input) {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;
  const parts = trimmed.slice(1).split(/\s+/);
  const name = parts[0]?.toLowerCase() ?? "";
  const arg = parts.slice(1).join(" ");
  const command = SLASH_COMMANDS.find((c) => c.name === name);
  return command ? { command, arg } : null;
}

// src/mentions/mentionResolver.ts
var vscode9 = __toESM(require("vscode"));
var path3 = __toESM(require("path"));
var MENTION_REGEX = /^@(\w+)(?::(.*))?$/;
async function resolveMention(mention, workspaceIndex2, memoryStore2) {
  const m = mention.trim().match(MENTION_REGEX);
  if (!m) return null;
  const type = m[1].toLowerCase();
  const value = (m[2] ?? "").trim();
  try {
    switch (type) {
      case "file": {
        if (!value) return null;
        const folders = vscode9.workspace.workspaceFolders;
        if (!folders?.length) return null;
        const fullPath = path3.join(folders[0].uri.fsPath, value);
        const doc = await vscode9.workspace.openTextDocument(fullPath);
        const content = doc.getText().slice(0, 15e3);
        const label = value;
        return {
          type: "file",
          label,
          content: `<mention_file path="${escapeXml(value)}">
${content}
</mention_file>`
        };
      }
      case "git": {
        const sub = value.toLowerCase() || "diff";
        if (sub === "diff") {
          const out = gitDiff({ staged: false });
          return { type: "git", label: "git diff", content: `<mention_git type="diff">
${out}
</mention_git>` };
        }
        if (sub === "log") {
          const out = gitLog({ count: 10 });
          return { type: "git", label: "git log", content: `<mention_git type="log">
${out}
</mention_git>` };
        }
        return null;
      }
      case "symbol": {
        if (!value) return null;
        const chunks = await workspaceIndex2.query(value, 3);
        const matching = chunks.filter((c) => c.name && c.name.toLowerCase().includes(value.toLowerCase()));
        const toUse = matching.length > 0 ? matching : chunks.slice(0, 3);
        const parts = toUse.map((c) => `--- ${c.filePath} | ${c.type}: ${c.name} | lines ${c.startLine}-${c.endLine} ---
${c.content}`).join("\n\n");
        return {
          type: "symbol",
          label: `symbol: ${value}`,
          content: `<mention_symbol name="${escapeXml(value)}">
${parts}
</mention_symbol>`
        };
      }
      case "memory": {
        const query = value || "recent";
        const entries = memoryStore2.searchRecall(query, 3);
        const parts = entries.map((e) => e.content).join("\n\n---\n\n");
        return {
          type: "memory",
          label: `memory: ${query}`,
          content: `<mention_memory query="${escapeXml(query)}">
${parts}
</mention_memory>`
        };
      }
      case "workspace": {
        const ctx = await workspaceIndex2.getContext("overview");
        if (!ctx) return null;
        return {
          type: "workspace",
          label: "workspace overview",
          content: `<mention_workspace>
${ctx}
</mention_workspace>`
        };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/chatViewProvider.ts
var ChatViewProvider = class _ChatViewProvider {
  constructor(_extensionUri, client2, workspaceIndex2, memoryStore2, skillStore2) {
    this._extensionUri = _extensionUri;
    this._chatHistory = [];
    this._isAgentRunning = false;
    this._pendingPlanMessages = null;
    this._activeSessionId = null;
    this._client = client2;
    this._workspaceIndex = workspaceIndex2;
    this._memoryStore = memoryStore2;
    this._skillStore = skillStore2;
    const maxRetries = vscode10.workspace.getConfiguration("clawpilot").get("reflexionMaxRetries", 3);
    this._agentRunner = new AgentRunner(client2, new AgentTools(workspaceIndex2, memoryStore2, skillStore2), maxRetries);
  }
  static {
    this.viewType = "clawpilot.chatView";
  }
  setClient(client2) {
    this._client = client2;
    const maxRetries = vscode10.workspace.getConfiguration("clawpilot").get("reflexionMaxRetries", 3);
    this._agentRunner = new AgentRunner(client2, new AgentTools(this._workspaceIndex, this._memoryStore, this._skillStore), maxRetries);
  }
  resolveWebviewView(webviewView, _context, _token) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    this._isAgentRunning = false;
    webviewView.webview.html = this._getHtml();
    webviewView.webview.onDidReceiveMessage((msg) => this._handleMessage(msg));
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this._refreshModels();
        this._checkConnection();
        this._sendIndexStatus();
      }
    });
    setTimeout(() => {
      this._refreshModels();
      this._checkConnection();
      this._sendIndexStatus();
      this._sendMemoryData();
    }, 500);
    if (this._historyStore) {
      const session = this._historyStore.getOrCreateActiveSession();
      this._activeSessionId = session.id;
      this._sendHistoryToWebview(session);
    }
    this._view?.webview.postMessage({
      type: "slashCommands",
      commands: SLASH_COMMANDS.map((c) => ({ name: c.name, usage: c.usage, description: c.description }))
    });
  }
  sendToChat(userMessage, codeContext) {
    if (!this._view) {
      return;
    }
    this._view.show(true);
    setTimeout(() => {
      this._view?.webview.postMessage({
        type: "injectMessage",
        text: userMessage,
        codeContext
      });
    }, 300);
  }
  async sendQuickAction(prompt) {
    await vscode10.commands.executeCommand("clawpilot.openChat");
    await new Promise((resolve) => setTimeout(resolve, 150));
    this._view?.webview.postMessage({ type: "injectPrompt", text: prompt });
    this._view?.webview.postMessage({ type: "submitPrompt" });
  }
  setHistoryStore(store) {
    this._historyStore = store;
    const session = store.getOrCreateActiveSession();
    this._activeSessionId = session.id;
    if (this._view) {
      this._sendHistoryToWebview(session);
    }
  }
  switchSession(session) {
    this._activeSessionId = session.id;
    this._historyStore?.setActiveSession(session.id);
    this._sendHistoryToWebview(session);
  }
  setContextRegistry(registry) {
    this._contextRegistry = registry;
  }
  clearWebviewMessages() {
    this._chatHistory = [];
    this._view?.webview.postMessage({ type: "clearMessages" });
  }
  _sendHistoryToWebview(session) {
    const messages = session.messages.map(
      (m) => m.role === "assistant" ? { role: m.role, content: m.content, html: renderMarkdownToHtml(m.content) } : m
    );
    this._view?.webview.postMessage({
      type: "loadHistory",
      sessionName: session.name,
      messages
    });
    this._chatHistory = session.messages.slice(-40).map((m) => ({ role: m.role, content: m.content }));
  }
  async _handleMessage(msg) {
    switch (msg.type) {
      case "sendMessage":
        try {
          await this._handleUserMessage(msg.text, msg.codeContext, msg.files, msg.agentMode);
        } catch (err) {
          this._view?.webview.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
        }
        break;
      case "changeModel":
        vscode10.workspace.getConfiguration("clawpilot").update("model", msg.model, true);
        break;
      case "clearChat":
        this._chatHistory = [];
        this._pendingPlanMessages = null;
        break;
      case "insertCode":
        this._insertCodeToEditor(msg.code);
        break;
      case "getModels":
        await this._refreshModels();
        break;
      case "getConnectionStatus":
        await this._checkConnection();
        break;
      case "getSelectionContext":
        this._sendSelectionContext();
        break;
      case "getWorkspaceFiles":
        await this._sendWorkspaceFiles(msg.query);
        break;
      case "confirmPlan":
        await this._executePlan();
        break;
      case "rejectPlan":
        this._pendingPlanMessages = null;
        this._view?.webview.postMessage({ type: "planRejected" });
        break;
      case "stopAgent":
        this._agentRunner.stop();
        this._isAgentRunning = false;
        break;
      case "cancelAgent":
        this._isAgentRunning = false;
        break;
      case "reindexWorkspace":
        await this._reindexWorkspace();
        break;
      case "getIndexStatus":
        this._sendIndexStatus();
        break;
      case "getMemory":
        await this._sendMemoryData();
        break;
      case "updateCore":
        if (msg.patch != null) {
          await this._memoryStore.updateCoreMemory(msg.patch);
          await this._sendMemoryData();
        }
        break;
      case "addSkillFromChat":
        if (msg.name != null && msg.desc != null && msg.content != null) {
          await this._skillStore.addSkill(msg.name, msg.desc, msg.content, msg.tags?.split(",").map((t) => t.trim()).filter(Boolean));
          await this._sendMemoryData();
        }
        break;
      case "deleteSkill":
        if (msg.id != null) {
          await this._skillStore.deleteSkill(msg.id);
          await this._sendMemoryData();
        }
        break;
      case "approveDiff":
        this._agentRunner.resolveDiff(msg.stepId, true);
        break;
      case "rejectDiff":
        this._agentRunner.resolveDiff(msg.stepId, false);
        break;
      case "runCommand":
        if (typeof msg.command === "string") {
          vscode10.commands.executeCommand(msg.command);
        }
        break;
    }
  }
  async _sendMemoryData() {
    if (!this._view) return;
    const core = this._memoryStore.getCoreMemory();
    const skills = this._skillStore.listSkills();
    this._view.webview.postMessage({
      type: "memoryData",
      core: { projectContext: core.projectContext, userPreferences: core.userPreferences, keyFacts: core.keyFacts },
      recallCount: this._memoryStore.getRecallCount(),
      archivalCount: this._memoryStore.getArchivalCount(),
      skills: skills.map((s) => ({ id: s.id, name: s.name, description: s.description }))
    });
  }
  _sendIndexStatus() {
    if (!this._view) return;
    const st = this._workspaceIndex.status;
    const message = st.isIndexing ? "Indexing workspace..." : st.chunkCount > 0 ? `${st.chunkCount} chunks indexed` : "Not indexed";
    this._view.webview.postMessage({
      type: "indexStatus",
      indexing: st.isIndexing,
      message,
      chunkCount: st.chunkCount
    });
  }
  async _reindexWorkspace() {
    if (!this._view) return;
    this._view.webview.postMessage({ type: "indexStatus", indexing: true, message: "Indexing workspace..." });
    await this._workspaceIndex.indexAll((message, fileCount) => {
      this._view?.webview.postMessage({
        type: "indexStatus",
        indexing: true,
        message,
        fileCount
      });
    });
    const st = this._workspaceIndex.status;
    this._view.webview.postMessage({
      type: "indexStatus",
      indexing: false,
      message: st.chunkCount > 0 ? `${st.chunkCount} chunks indexed` : "Not indexed",
      chunkCount: st.chunkCount
    });
  }
  async _handleUserMessage(text, codeContext, attachedFiles, agentModeOverride) {
    if (this._isAgentRunning) {
      this._view?.webview.postMessage({ type: "error", message: "Agent is already running. Wait or click Stop." });
      return;
    }
    let processedText = text;
    const slashMatchNew = matchSlashCommand(text);
    if (slashMatchNew) {
      const { command, arg } = slashMatchNew;
      switch (command.name) {
        case "help": {
          const helpText = "**Available slash commands:**\n\n" + SLASH_COMMANDS.map((c) => `- \`${c.usage}\` \u2014 ${c.description}`).join("\n");
          this._view?.webview.postMessage({
            type: "assistantMessage",
            html: renderMarkdownToHtml(helpText)
          });
          return;
        }
        case "clear":
          if (this._historyStore && this._activeSessionId) {
            this._historyStore.clearMessages(this._activeSessionId);
          }
          this.clearWebviewMessages();
          return;
        case "new": {
          if (!this._historyStore) return;
          const session = this._historyStore.createSession(arg || void 0);
          this.switchSession(session);
          return;
        }
        case "commit": {
          if (!arg.trim()) {
            this._view?.webview.postMessage({
              type: "assistantMessage",
              html: renderMarkdownToHtml("Usage: `/commit <message>`")
            });
            return;
          }
          processedText = `Use git_commit with addAll=true and message="${arg.trim()}". Then confirm the commit was successful.`;
          break;
        }
        case "search": {
          if (!arg.trim()) {
            this._view?.webview.postMessage({
              type: "assistantMessage",
              html: renderMarkdownToHtml("Usage: `/search <query>`")
            });
            return;
          }
          processedText = `Search the workspace for: ${arg.trim()}. Use semantic_search to find relevant code and summarise the top results.`;
          break;
        }
        case "explain":
          await vscode10.commands.executeCommand("clawpilot.explain");
          return;
        case "fix":
          await vscode10.commands.executeCommand("clawpilot.fix");
          return;
        case "tests":
          await vscode10.commands.executeCommand("clawpilot.add_tests");
          return;
        case "status":
          processedText = command.expandTo;
          break;
        case "model": {
          if (!arg.trim()) {
            this._view?.webview.postMessage({
              type: "assistantMessage",
              html: renderMarkdownToHtml("Usage: `/model <name>` \u2014 e.g. `/model codellama`")
            });
            return;
          }
          await vscode10.workspace.getConfiguration("clawpilot").update("model", arg.trim(), vscode10.ConfigurationTarget.Global);
          this._view?.webview.postMessage({ type: "setModel", model: arg.trim() });
          this._view?.webview.postMessage({
            type: "assistantMessage",
            html: renderMarkdownToHtml(`Switched model to \`${arg.trim()}\`.`)
          });
          return;
        }
        case "install": {
          const modelArg = arg.trim();
          if (!modelArg) {
            this._view?.webview.postMessage({
              type: "assistantMessage",
              html: renderMarkdownToHtml("Usage: `/install <model>` \u2014 e.g. `/install qwen2.5-coder:7b`")
            });
            return;
          }
          await this._handleInstallModel(modelArg);
          return;
        }
        case "skills": {
          const skills = this._skillStore.listSkills();
          const builtin = skills.filter((s) => s.isBuiltin);
          const user = skills.filter((s) => !s.isBuiltin);
          let body = "**Built-in skills**\n\n";
          body += builtin.map((s) => `- **${s.name}** \u2014 ${s.description}`).join("\n");
          body += "\n\n**Your saved skills**\n\n";
          body += user.length > 0 ? user.map((s) => `- **${s.name}** \u2014 ${s.description}`).join("\n") : "_None yet. Save skills from the chat to reuse them._";
          this._view?.webview.postMessage({
            type: "assistantMessage",
            html: renderMarkdownToHtml(body)
          });
          return;
        }
        default:
          break;
      }
    }
    const config = vscode10.workspace.getConfiguration("clawpilot");
    const model = config.get("model", "llama3");
    const systemPrompt = config.get("systemPrompt", "");
    const slashMatch = !slashMatchNew ? text.match(/^\/(\w+)\s*(.*)/s) : null;
    const agentSlashCmds = ["plan", "edit", "fix", "run", "test", "refactor", "build", "review", "optimize", "types"];
    let isAgentTask = agentModeOverride ?? config.get("agentMode", true);
    if (slashMatch) {
      processedText = this._expandSlashCommand(slashMatch[1], slashMatch[2], codeContext);
      if (agentSlashCmds.includes(slashMatch[1])) {
        isAgentTask = true;
      }
    }
    try {
      processedText = await this._resolveMentionsInMessage(processedText);
    } catch {
    }
    let fullMessage = processedText;
    const contextTypes = [];
    if (this._contextRegistry) {
      try {
        const ctx = await this._contextRegistry.assemble(processedText, 8e3);
        if (ctx.text && ctx.text.trim()) {
          fullMessage = ctx.text + "\n\n" + fullMessage;
          contextTypes.push(...ctx.sources);
        }
      } catch {
      }
    }
    if (codeContext && !fullMessage.includes(codeContext)) {
      fullMessage = fullMessage + "\n\n**Selected code:**\n```" + this._getEditorLang() + "\n" + codeContext + "\n```";
      if (!contextTypes.includes("selection")) contextTypes.push("selection");
    }
    if (attachedFiles && attachedFiles.length > 0) {
      const folders = vscode10.workspace.workspaceFolders;
      if (folders) {
        for (const f of attachedFiles) {
          try {
            const fullPath = path4.join(folders[0].uri.fsPath, f);
            const doc = await vscode10.workspace.openTextDocument(fullPath);
            const content = doc.getText().slice(0, 1e4);
            fullMessage += `

**@${f}:**
\`\`\`
${content}
\`\`\``;
          } catch {
          }
        }
      }
      if (!contextTypes.includes("files")) contextTypes.push("files");
    }
    const messages = [];
    if (isAgentTask) {
      messages.push({ role: "system", content: AgentTools.getToolsSystemPrompt() });
    } else {
      const sysContent = systemPrompt || "You are an expert coding assistant. Be concise, accurate, and helpful.";
      messages.push({ role: "system", content: sysContent });
    }
    messages.push(...this._chatHistory);
    messages.push({ role: "user", content: fullMessage });
    if (this._historyStore && this._activeSessionId) {
      this._historyStore.appendMessage(this._activeSessionId, {
        role: "user",
        content: text,
        timestamp: Date.now()
      });
    }
    this._view?.webview.postMessage({ type: "userMessage", text, contextTypes });
    if (isAgentTask) {
      await this._runAgent(messages, model, text, processedText);
    } else {
      await this._runChat(messages, model, text, processedText);
    }
  }
  _getEditorLang() {
    return vscode10.window.activeTextEditor?.document.languageId || "";
  }
  async _runChat(messages, model, userMsg, processedText) {
    this._isAgentRunning = true;
    let fullResponse = "";
    this._view?.webview.postMessage({ type: "startAssistantMessage" });
    try {
      for await (const chunk of this._client.streamChat(messages, model)) {
        fullResponse += chunk;
        this._view?.webview.postMessage({ type: "streamChunk", chunk });
      }
      this._view?.webview.postMessage({
        type: "finalizeAssistantMessage",
        html: renderMarkdownToHtml(fullResponse)
      });
      this._pushHistory(userMsg, fullResponse);
      if (this._historyStore && this._activeSessionId) {
        this._historyStore.appendMessage(this._activeSessionId, {
          role: "assistant",
          content: fullResponse,
          timestamp: Date.now()
        });
      }
      await this._autoSaveRecall(userMsg, fullResponse, model);
    } catch (err) {
      this._view?.webview.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      this._isAgentRunning = false;
    }
  }
  async _runAgent(messages, model, userMsg, processedText) {
    this._isAgentRunning = true;
    this._view?.webview.postMessage({ type: "agentStart" });
    let fullTextResponse = "";
    let stepCount = 0;
    const onStep = (step) => {
      switch (step.type) {
        case "thinking":
          this._view?.webview.postMessage({ type: "agentThinking" });
          break;
        case "response":
          fullTextResponse += step.content;
          this._view?.webview.postMessage({ type: "streamChunk", chunk: step.content });
          break;
        case "tool_call":
          stepCount++;
          this._view?.webview.postMessage({
            type: "agentToolCall",
            toolName: step.toolName,
            toolArgs: step.toolArgs,
            step: stepCount
          });
          fullTextResponse = "";
          break;
        case "tool_result":
          this._view?.webview.postMessage({
            type: "agentToolResult",
            toolName: step.toolName,
            output: step.content,
            success: step.success,
            step: stepCount
          });
          break;
        case "reflection":
          this._view?.webview.postMessage({
            type: "agentReflection",
            content: step.content,
            attempt: step.attempt ?? 0
          });
          break;
        case "diff_preview":
          if (step.diff && step.stepId) {
            this._view?.webview.postMessage({
              type: "agentDiffPreview",
              stepId: step.stepId,
              path: step.diff.path,
              isNew: step.diff.isNew,
              html: formatDiffHtml(step.diff.lines)
            });
          }
          break;
        case "plan":
          this._pendingPlanMessages = messages;
          this._view?.webview.postMessage({
            type: "agentPlan",
            plan: step.content,
            html: renderMarkdownToHtml(step.content)
          });
          break;
        case "done":
        case "error":
          this._view?.webview.postMessage({
            type: "agentDone",
            html: renderMarkdownToHtml(fullTextResponse || step.content),
            error: step.type === "error" ? step.content : void 0
          });
          break;
      }
    };
    try {
      const diffPreviewEnabled = vscode10.workspace.getConfiguration("clawpilot").get("diffPreviewEnabled", true);
      await this._agentRunner.run({ messages, model, onStep, diffPreviewEnabled });
      this._pushHistory(userMsg, fullTextResponse);
      if (this._historyStore && this._activeSessionId) {
        this._historyStore.appendMessage(this._activeSessionId, {
          role: "assistant",
          content: fullTextResponse,
          timestamp: Date.now()
        });
      }
      await this._autoSaveRecall(userMsg, fullTextResponse, model);
    } catch (err) {
      this._view?.webview.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      this._isAgentRunning = false;
    }
  }
  async _autoSaveRecall(userMsg, fullResponse, model) {
    const config = vscode10.workspace.getConfiguration("clawpilot");
    if (!config.get("autoSaveMemory", true)) return;
    try {
      const content = `User asked: ${userMsg.slice(0, 200)} | Response summary: ${fullResponse.slice(0, 300)}`;
      const lang = this._getEditorLang();
      const tags = [model, lang].filter(Boolean);
      await this._memoryStore.addRecall(content, "auto", tags);
    } catch {
    }
  }
  async _executePlan() {
    if (!this._pendingPlanMessages) {
      return;
    }
    const config = vscode10.workspace.getConfiguration("clawpilot");
    const model = config.get("model", "llama3");
    const messages = this._pendingPlanMessages;
    this._pendingPlanMessages = null;
    this._view?.webview.postMessage({ type: "planExecuting" });
    await this._runAgent(
      [...messages, { role: "user", content: "Plan approved. Execute all steps now." }],
      model,
      "Plan execution",
      "Plan approved. Execute all steps now."
    );
  }
  _pushHistory(userMsg, assistantMsg) {
    this._chatHistory.push({ role: "user", content: userMsg });
    this._chatHistory.push({ role: "assistant", content: assistantMsg });
    if (this._chatHistory.length > 40) {
      this._chatHistory = this._chatHistory.slice(-40);
    }
  }
  static {
    this.MENTION_PATTERN = /@(\w+)(?::([^\s]*))?/g;
  }
  async _resolveMentionsInMessage(text) {
    const matches = [...text.matchAll(_ChatViewProvider.MENTION_PATTERN)];
    if (matches.length === 0) return text;
    const replacements = [];
    for (const m of matches) {
      const full = m[0];
      const resolved = await resolveMention(full, this._workspaceIndex, this._memoryStore);
      replacements.push({
        index: m.index,
        length: full.length,
        content: resolved ? resolved.content : `[mention not found: ${full}]`
      });
    }
    replacements.sort((a, b) => b.index - a.index);
    let result = text;
    for (const r of replacements) {
      result = result.slice(0, r.index) + r.content + result.slice(r.index + r.length);
    }
    return result;
  }
  _expandSlashCommand(cmd, rest, codeContext) {
    const code = codeContext ? `

Code:
\`\`\`
${codeContext}
\`\`\`` : "";
    switch (cmd) {
      case "explain":
        return `Explain this code clearly.${code}${rest ? "\n\n" + rest : ""}`;
      case "fix":
        return `Find and fix all bugs. Show corrected code with explanations.${code}${rest ? "\nContext: " + rest : ""}`;
      case "refactor":
        return `Refactor for better readability, performance, and maintainability.${code}${rest ? "\nFocus: " + rest : ""}`;
      case "test":
        return `Write comprehensive unit tests.${code}${rest ? "\nFramework: " + rest : ""}`;
      case "docs":
        return `Generate thorough documentation for this code.${code}`;
      case "plan":
        return `Create a detailed step-by-step plan to: ${rest || "implement this feature"}${code}

Output the plan inside a <plan>...</plan> block.`;
      case "edit":
        return `Make the following changes: ${rest}${code}`;
      case "build":
        return `Build this feature: ${rest}${code}. Read relevant files first, then implement.`;
      case "run":
        return `Run this command and show me the output: ${rest}`;
      case "review":
        return `Do a thorough code review. Check for bugs, security issues, performance, and style.${code}`;
      case "optimize":
        return `Optimize for performance. Identify bottlenecks and improve them.${code}`;
      case "types":
        return `Add proper TypeScript types and interfaces.${code}`;
      default:
        return `/${cmd} ${rest}`;
    }
  }
  async _refreshModels() {
    try {
      const models = await this._client.listModels();
      const config = vscode10.workspace.getConfiguration("clawpilot");
      const current = config.get("model", "llama3");
      this._view?.webview.postMessage({ type: "models", models, current });
      const ok = await this._client.isAvailable();
      this._view?.webview.postMessage({
        type: "providerModelStatus",
        providerLabel: this._client.displayName,
        model: current || "",
        connected: ok
      });
    } catch {
      this._view?.webview.postMessage({ type: "models", models: [], current: "" });
      this._view?.webview.postMessage({
        type: "providerModelStatus",
        providerLabel: this._client.displayName,
        model: "",
        connected: false
      });
    }
  }
  async _checkConnection() {
    const ok = await this._client.isAvailable();
    const config = vscode10.workspace.getConfiguration("clawpilot");
    const model = config.get("model", "");
    this._view?.webview.postMessage({ type: "connectionStatus", connected: ok });
    this._view?.webview.postMessage({
      type: "providerModelStatus",
      providerLabel: this._client.displayName,
      model: model || "",
      connected: ok
    });
  }
  async _handleInstallModel(modelName) {
    if (!this._client.pullModel) {
      this._view?.webview.postMessage({
        type: "assistantMessage",
        html: renderMarkdownToHtml("`/install` is only available for the **Ollama** provider. Switch provider in the header or settings.")
      });
      return;
    }
    this._view?.webview.postMessage({ type: "installStart", model: modelName });
    const proc = (0, import_child_process3.spawn)("ollama", ["pull", modelName], { shell: true, windowsHide: true });
    const lines = [];
    proc.stdout?.on("data", (d) => {
      const line = d.toString().trim();
      if (line) {
        lines.push(line);
        this._view?.webview.postMessage({ type: "installProgress", line });
      }
    });
    proc.stderr?.on("data", (d) => {
      const line = d.toString().trim();
      if (line) {
        lines.push(line);
        this._view?.webview.postMessage({ type: "installProgress", line });
      }
    });
    proc.on("close", async (code) => {
      if (code === 0) {
        await vscode10.workspace.getConfiguration("clawpilot").update("model", modelName, vscode10.ConfigurationTarget.Global);
        this._view?.webview.postMessage({ type: "setModel", model: modelName });
        this._view?.webview.postMessage({ type: "installDone", model: modelName, success: true });
      } else {
        this._view?.webview.postMessage({ type: "installDone", model: modelName, success: false, error: `Exit code ${code}` });
      }
    });
  }
  _sendSelectionContext() {
    const editor = vscode10.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) {
      this._view?.webview.postMessage({ type: "selectionContext", text: "", lang: "" });
      return;
    }
    const text = editor.document.getText(editor.selection);
    const lang = editor.document.languageId;
    this._view?.webview.postMessage({ type: "selectionContext", text, lang });
  }
  async _sendWorkspaceFiles(query) {
    const folders = vscode10.workspace.workspaceFolders;
    if (!folders) {
      this._view?.webview.postMessage({ type: "workspaceFiles", files: [] });
      return;
    }
    const pattern = query ? `**/*${query}*` : "**/*";
    const uris = await vscode10.workspace.findFiles(pattern, "**/node_modules/**", 50);
    const files = uris.map((u) => path4.relative(folders[0].uri.fsPath, u.fsPath));
    this._view?.webview.postMessage({ type: "workspaceFiles", files });
  }
  _insertCodeToEditor(code) {
    const editor = vscode10.window.activeTextEditor;
    if (!editor) {
      vscode10.window.showErrorMessage("No active editor to insert code into");
      return;
    }
    editor.edit((eb) => {
      if (editor.selection.isEmpty) {
        eb.insert(editor.selection.active, code);
      } else {
        eb.replace(editor.selection, code);
      }
    });
  }
  _getHtml() {
    const nonce = getNonce();
    return (
      /* html */
      `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ClawPilot</title>
<style nonce="${nonce}">
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);background:var(--vscode-sideBar-background);display:flex;flex-direction:column;height:100vh;overflow:hidden}
/* \u2500\u2500 Top bar \u2500\u2500 */
.topbar{display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--vscode-panel-border);flex-shrink:0;min-height:36px}
.status-dot{width:7px;height:7px;border-radius:50%;background:#555;flex-shrink:0;transition:background .25s}
.status-dot.ok{background:#4ade80}
.provider-btn{flex:1;font-size:12px;font-weight:600;cursor:pointer;background:none;border:none;color:var(--vscode-foreground);text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:2px 4px;border-radius:4px}
.provider-btn:hover{background:var(--vscode-toolbar-hoverBackground)}
.icon-btn{background:none;border:none;cursor:pointer;padding:4px 5px;color:var(--vscode-foreground);opacity:.7;font-size:14px;border-radius:4px;flex-shrink:0;line-height:1}
.icon-btn:hover{opacity:1;background:var(--vscode-toolbar-hoverBackground)}
.session-name{font-size:10px;color:var(--vscode-descriptionForeground);padding:1px 12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-height:13px}
/* \u2500\u2500 Toolbar: model + mode \u2500\u2500 */
.toolbar{display:flex;align-items:center;gap:6px;padding:5px 10px;border-bottom:1px solid var(--vscode-panel-border);flex-shrink:0}
.model-select{flex:1;min-width:0;background:var(--vscode-dropdown-background);color:var(--vscode-dropdown-foreground);border:1px solid var(--vscode-dropdown-border);padding:3px 6px;border-radius:5px;font-size:11px;cursor:pointer;outline:none}
.mode-group{display:flex;gap:2px;flex-shrink:0}
.mode-btn{font-size:11px;font-weight:600;padding:3px 10px;border-radius:10px;cursor:pointer;border:1px solid var(--vscode-panel-border);background:none;color:var(--vscode-descriptionForeground);white-space:nowrap;transition:all .15s}
.mode-btn.active-agent{background:#7c3aed;color:#fff;border-color:#7c3aed}
.mode-btn.active-ask{background:#0ea5e9;color:#fff;border-color:#0ea5e9}
/* \u2500\u2500 Status bar \u2500\u2500 */
.status-bar{display:flex;align-items:center;gap:4px;padding:2px 10px;border-bottom:1px solid var(--vscode-panel-border);font-size:10px;color:var(--vscode-descriptionForeground);flex-shrink:0}
.index-info{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.index-info.indexing::before{content:'';display:inline-block;width:8px;height:8px;margin-right:4px;vertical-align:middle;border:1.5px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.text-btn{background:none;border:none;cursor:pointer;font-size:10px;color:var(--vscode-descriptionForeground);padding:1px 4px;border-radius:3px;white-space:nowrap}
.text-btn:hover{color:var(--vscode-foreground);background:var(--vscode-toolbar-hoverBackground)}
/* \u2500\u2500 Memory panel \u2500\u2500 */
.memory-panel{display:none;padding:8px 10px;border-bottom:1px solid var(--vscode-panel-border);background:var(--vscode-editor-inactiveSelectionBackground,rgba(0,0,0,.06));font-size:11px;max-height:220px;overflow-y:auto}
.memory-panel.open{display:block}
.memory-panel label{display:block;margin-top:6px;margin-bottom:2px;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.5px;opacity:.7}
.memory-panel textarea{width:100%;min-height:44px;max-height:70px;padding:5px;font-size:11px;resize:vertical;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:4px;outline:none}
.key-facts-list{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}
.key-fact-tag{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:8px;background:var(--vscode-badge-background);font-size:10px}
.key-fact-tag button{background:none;border:none;cursor:pointer;padding:0;opacity:.7;font-size:11px}
.skills-list{margin-top:4px}
.skill-row{display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--vscode-panel-border)}
.skill-row button{font-size:10px;padding:1px 5px}
.mem-save-btn{margin-top:8px;padding:4px 10px;font-size:11px}
/* \u2500\u2500 Setup empty state \u2500\u2500 */
.empty-setup{display:none;flex:1;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px;text-align:center}
.empty-setup.visible{display:flex}
.empty-setup-title{font-size:13px;font-weight:600}
.empty-setup-sub{font-size:11px;opacity:.75;line-height:1.5}
/* \u2500\u2500 Messages area \u2500\u2500 */
.messages{flex:1;overflow-y:auto;padding:10px 10px 6px;display:flex;flex-direction:column;gap:10px}
.messages::-webkit-scrollbar{width:3px}
.messages::-webkit-scrollbar-thumb{background:var(--vscode-scrollbarSlider-background);border-radius:2px}
/* \u2500\u2500 Welcome state \u2500\u2500 */
.empty-state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px}
.empty-icon{font-size:28px}
.empty-title{font-size:14px;font-weight:700}
.empty-sub{font-size:11px;text-align:center;opacity:.65;line-height:1.5}
.quick-actions{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:2px}
.quick-btn{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border:none;padding:5px 11px;border-radius:10px;cursor:pointer;font-size:11px}
.quick-btn:hover{background:var(--vscode-button-secondaryHoverBackground)}
/* \u2500\u2500 Message bubbles \u2500\u2500 */
.message{display:flex;flex-direction:column;gap:3px;max-width:100%}
.message.user{align-items:flex-end}
.message.assistant{align-items:flex-start}
.ctx-tags{font-size:9px;color:var(--vscode-descriptionForeground);display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;margin-bottom:1px}
.ctx-tag{background:var(--vscode-badge-background);padding:1px 5px;border-radius:4px;opacity:.8}
.bubble{padding:7px 11px;border-radius:12px;max-width:94%;word-break:break-word;line-height:1.55;font-size:13px}
.user .bubble{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border-bottom-right-radius:3px}
.assistant .bubble{background:var(--vscode-editor-inactiveSelectionBackground,var(--vscode-list-hoverBackground));border-bottom-left-radius:3px}
/* \u2500\u2500 Agent steps \u2500\u2500 */
.agent-steps{display:flex;flex-direction:column;gap:5px;width:100%;margin-bottom:5px}
.agent-step{display:flex;align-items:flex-start;gap:7px;padding:5px 9px;border-radius:7px;font-size:11px;background:var(--vscode-list-hoverBackground);border-left:3px solid #7c3aed}
.agent-step.success{border-left-color:#4ade80}
.agent-step.failure{border-left-color:#f87171}
.agent-step.reflection{border-left-color:#fbbf24}
.step-icon{font-size:12px;flex-shrink:0;margin-top:1px}
.step-body{flex:1;min-width:0}
.step-title{font-weight:600}
.step-detail{color:var(--vscode-descriptionForeground);font-size:10px;white-space:pre-wrap;word-break:break-all;margin-top:2px;max-height:2.2em;overflow:hidden;cursor:pointer}
.step-detail.expanded{max-height:100px;overflow-y:auto}
/* \u2500\u2500 Diff block \u2500\u2500 */
.diff-block{border:1px solid var(--vscode-panel-border);border-radius:8px;overflow:hidden;width:100%;margin:3px 0;font-family:monospace;font-size:11px}
.diff-header{background:rgba(124,58,237,.12);padding:5px 9px;font-size:11px;font-weight:600;color:#a78bfa;display:flex;justify-content:space-between;align-items:center}
.diff-body{max-height:180px;overflow-y:auto;background:var(--vscode-editor-background)}
.diff-line{padding:1px 9px;white-space:pre}
.diff-add{background:rgba(74,222,128,.1);color:#4ade80}
.diff-remove{background:rgba(248,113,113,.1);color:#f87171}
.diff-context{color:var(--vscode-descriptionForeground)}
.diff-actions{display:flex;gap:5px;padding:5px 9px;border-top:1px solid var(--vscode-panel-border)}
.btn-approve-diff{background:#4ade80;color:#000;border:none;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600}
.btn-reject-diff{background:#f87171;color:#000;border:none;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600}
/* \u2500\u2500 Plan block \u2500\u2500 */
.plan-block{border:1px solid #7c3aed;border-radius:10px;overflow:hidden;width:100%;margin:3px 0}
.plan-header{background:rgba(124,58,237,.12);padding:7px 11px;font-size:12px;font-weight:600;color:#a78bfa}
.plan-content{padding:9px 11px;font-size:12px}
.plan-actions{display:flex;gap:7px;padding:7px 11px;border-top:1px solid rgba(124,58,237,.3)}
.btn-approve{background:#7c3aed;color:#fff;border:none;padding:4px 12px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600}
.btn-approve:hover{background:#6d28d9}
.btn-reject{background:none;color:var(--vscode-foreground);border:1px solid var(--vscode-panel-border);padding:4px 12px;border-radius:5px;cursor:pointer;font-size:12px}
/* \u2500\u2500 Code blocks \u2500\u2500 */
.code-block{position:relative;margin:6px 0}
.code-lang{font-size:9px;color:var(--vscode-descriptionForeground);padding:3px 9px 0;font-family:monospace}
.code-block pre{background:var(--vscode-editor-background);padding:9px;border-radius:5px;overflow-x:auto;font-size:11.5px;font-family:var(--vscode-editor-font-family,monospace);border:1px solid var(--vscode-panel-border);white-space:pre;line-height:1.5}
.code-actions{position:absolute;top:5px;right:5px;display:flex;gap:3px;opacity:0;transition:opacity .15s}
.code-block:hover .code-actions{opacity:1}
.code-actions button{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border:none;padding:2px 7px;border-radius:3px;cursor:pointer;font-size:10px}
/* \u2500\u2500 Thinking \u2500\u2500 */
.thinking{display:flex;align-items:center;gap:7px;padding:3px 0;font-size:12px;color:var(--vscode-descriptionForeground)}
.thinking-dots{display:flex;gap:3px}
.thinking-dots span{width:4px;height:4px;border-radius:50%;background:currentColor;animation:bounce 1.2s infinite}
.thinking-dots span:nth-child(2){animation-delay:.2s}
.thinking-dots span:nth-child(3){animation-delay:.4s}
@keyframes bounce{0%,80%,100%{transform:scale(.6);opacity:.5}40%{transform:scale(1);opacity:1}}
/* \u2500\u2500 Slash / file popups \u2500\u2500 */
.popup{display:none;position:absolute;bottom:100%;left:0;right:0;background:var(--vscode-editorWidget-background,var(--vscode-editor-background));border:1px solid var(--vscode-panel-border);border-radius:8px;box-shadow:0 -4px 16px rgba(0,0,0,.35);max-height:200px;overflow-y:auto;z-index:100}
.popup.open{display:block}
.popup-item{display:flex;align-items:baseline;gap:8px;padding:6px 11px;cursor:pointer;font-size:12px}
.popup-item:hover,.popup-item.hi{background:var(--vscode-list-hoverBackground)}
.p-cmd{font-weight:700;color:#a78bfa;min-width:72px;flex-shrink:0}
.p-desc{color:var(--vscode-descriptionForeground);font-size:11px}
.file-item{padding:5px 11px;cursor:pointer;font-size:11px}
.file-item:hover,.file-item.hi{background:var(--vscode-list-hoverBackground)}
/* \u2500\u2500 @mention popup \u2500\u2500 */
.mention-pop{display:none;position:absolute;bottom:100%;left:0;right:0;background:var(--vscode-editorWidget-background,var(--vscode-editor-background));border:1px solid var(--vscode-panel-border);border-radius:8px;z-index:100;box-shadow:0 -4px 12px rgba(0,0,0,.3);padding:6px 8px;flex-wrap:wrap;gap:5px}
.mention-pop.open{display:flex}
.m-pill{padding:3px 9px;border-radius:12px;font-size:11px;cursor:pointer;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);border:1px solid var(--vscode-panel-border)}
.m-pill:hover{background:var(--vscode-list-hoverBackground)}
/* \u2500\u2500 Context bar \u2500\u2500 */
.ctx-bar{display:flex;align-items:center;gap:6px;padding:3px 10px;font-size:10px;color:var(--vscode-descriptionForeground);flex-shrink:0;border-top:1px solid var(--vscode-panel-border)}
.ctx-track{width:56px;height:4px;border-radius:2px;background:rgba(128,128,128,.2);flex-shrink:0;overflow:hidden}
.ctx-fill{height:100%;border-radius:2px;background:#4ade80;width:0%;transition:width .3s,background .3s}
.ctx-label{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.sel-pill{display:none;align-items:center;gap:3px;padding:1px 7px;background:var(--vscode-badge-background);border-radius:8px;font-size:10px;flex-shrink:0}
.sel-pill.on{display:flex}
/* \u2500\u2500 Input area \u2500\u2500 */
.input-area{padding:4px 8px 8px;flex-shrink:0}
.input-wrap{position:relative}
.input-box{display:flex;align-items:flex-end;gap:5px;background:var(--vscode-input-background);border:1px solid var(--vscode-input-border,var(--vscode-panel-border));border-radius:10px;padding:5px 6px;transition:border-color .15s}
.input-box:focus-within{border-color:var(--vscode-focusBorder)}
.input-box textarea{flex:1;background:none;border:none;outline:none;resize:none;color:var(--vscode-input-foreground);font-family:inherit;font-size:13px;line-height:1.5;max-height:160px;min-height:22px;padding:2px 2px}
.send-btn{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:7px;padding:5px 10px;cursor:pointer;font-size:15px;flex-shrink:0;height:30px;line-height:1}
.send-btn:hover{background:var(--vscode-button-hoverBackground)}
.send-btn:disabled{opacity:.35;cursor:not-allowed}
.stop-btn{background:#ef4444;color:#fff;border:none;border-radius:7px;padding:5px 11px;cursor:pointer;font-size:11px;font-weight:700;flex-shrink:0;height:30px;display:none;white-space:nowrap}
.stop-btn:hover{background:#dc2626}
.stop-btn:disabled{opacity:.5}
.char-ct{font-size:9px;color:var(--vscode-descriptionForeground);text-align:right;padding:1px 3px 0}
/* \u2500\u2500 Typography \u2500\u2500 */
p{margin:3px 0}h1,h2,h3{margin:7px 0 3px}ul,ol{padding-left:16px}li{margin:2px 0}
code{background:var(--vscode-textCodeBlock-background);padding:1px 4px;border-radius:3px;font-size:11px}
strong{font-weight:700}em{font-style:italic}a{color:var(--vscode-textLink-foreground)}
</style>
</head>
<body>
<div id="dbg" style="position:fixed;top:0;left:0;right:0;background:#ff0;color:#000;font-size:10px;padding:2px 4px;z-index:9999;word-break:break-all;">waiting...</div>
<!-- Top bar -->
<div class="topbar">
  <span class="status-dot" id="statusDot"></span>
  <button class="provider-btn" id="providerBadge" title="Change provider">ClawPilot</button>
  <span style="font-size:9px;opacity:.45;flex-shrink:0">v2</span>
  <button class="icon-btn" id="setupBtn" title="Settings">&#9881;</button>
  <button class="icon-btn" id="newSessionBtn" title="New chat">&#43;</button>
</div>
<div id="session-name" class="session-name"></div>
<!-- Model + Mode toolbar -->
<div class="toolbar">
  <select id="modelSelect" class="model-select" title="Select model"></select>
  <div class="mode-group">
    <button class="mode-btn active-agent" id="modeAgentBtn" title="Agent: multi-step, uses tools">&#9889; Agent</button>
    <button class="mode-btn" id="modeAskBtn" title="Ask: single reply, no tools">&#128172; Ask</button>
  </div>
</div>
<!-- Status bar -->
<div class="status-bar">
  <span class="index-info" id="indexStatus"></span>
  <button class="text-btn" id="reindexBtn">&#8635; Re-index</button>
  <span style="opacity:.4">&#183;</span>
  <button class="text-btn" id="memoryBtn">&#129504; Memory</button>
</div>
<!-- Memory panel (hidden by default) -->
<div class="memory-panel" id="memoryPanel">
  <label>Project context <span style="font-weight:400;opacity:.6">(max 500)</span></label>
  <textarea id="memProjectContext" maxlength="500" placeholder="Project description, tech stack..."></textarea>
  <label>User preferences <span style="font-weight:400;opacity:.6">(max 300)</span></label>
  <textarea id="memUserPreferences" maxlength="300" placeholder="Coding style, preferences..."></textarea>
  <label>Key facts</label>
  <div class="key-facts-list" id="keyFactsList"></div>
  <input type="text" id="newKeyFact" placeholder="Add a fact &#8594; Enter to save" maxlength="100"
    style="width:100%;margin-top:5px;padding:4px 6px;font-size:11px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:4px;outline:none">
  <label>Skills</label>
  <div class="skills-list" id="skillsList"></div>
  <button type="button" class="mem-save-btn btn-approve" id="memorySaveBtn">Save Memory</button>
</div>
<!-- Messages -->
<div class="messages" id="messages">
  <div class="empty-setup" id="emptyStateNoSetup">
    <div class="empty-icon">&#128268;</div>
    <div class="empty-setup-title">No model connected</div>
    <div class="empty-setup-sub">Start Ollama, or add an API key for a cloud provider.</div>
    <button type="button" class="quick-btn" id="setupEmptyBtn">&#9881; Open Setup</button>
  </div>
  <div class="empty-state" id="emptyState">
    <div class="empty-icon">&#129302;</div>
    <div class="empty-title">ClawPilot</div>
    <div class="empty-sub">Local AI &#183; Privacy-first &#183; No cloud required<br>Type <strong>/</strong> for commands &#183; <strong>@</strong> to attach files</div>
    <div class="quick-actions">
      <button type="button" class="quick-btn" data-cmd="/explain">Explain</button>
      <button type="button" class="quick-btn" data-cmd="/fix">Fix bugs</button>
      <button type="button" class="quick-btn" data-cmd="/refactor">Refactor</button>
      <button type="button" class="quick-btn" data-cmd="/test">Write tests</button>
      <button type="button" class="quick-btn" data-cmd="/plan ">Plan feature</button>
      <button type="button" class="quick-btn" data-cmd="/review">Review</button>
    </div>
  </div>
</div>
<!-- Context usage bar -->
<div class="ctx-bar">
  <div class="ctx-track"><div class="ctx-fill" id="ctxFill"></div></div>
  <span class="ctx-label" id="ctxLabel">0 tokens</span>
  <span class="sel-pill" id="selBadge">&#128206; <span id="selLabel">selection</span></span>
</div>
<!-- Input + Popups (popups positioned relative to input-area) -->
<div class="input-area" style="position:relative">
  <div class="popup" id="slashPop"></div>
  <div class="popup" id="filePop"></div>
  <div class="popup" id="cmdMenu"></div>
  <div class="mention-pop" id="mentionPop"></div>
  <div class="input-box">
    <textarea id="msgInput" placeholder="Ask anything...  / commands  @ files" rows="1"></textarea>
    <button class="stop-btn" id="stopBtn" title="Stop generation">&#9632; Stop</button>
    <button class="send-btn" id="sendBtn" title="Send (Enter)">&#9658;</button>
  </div>
  <div class="char-ct" id="charCt">0</div>
</div>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
let agentMode=true, running=false, selText='', selLang='';
let curBubble=null, curSteps=null, attachedFiles=[];
let slashIdx=-1, fileIdx=-1;
let convTokens=0, ctxLimit=32768;
let needSetup=true, allCmds=[];

/* \u2500\u2500 Context limit estimates \u2500\u2500 */
const MODEL_CTX={
  'llama3.3':131072,'llama3.2':131072,'llama3.1':131072,'llama3':8192,
  'phi4':16384,'phi3.5':131072,'phi3':131072,
  'mistral':32768,'mixtral':32768,
  'codellama':16384,'deepseek':65536,
  'qwen2.5':131072,'qwen2':32768,'qwen':32768,
  'gemma3':131072,'gemma2':8192,'gemma':8192,
  'llava':8192,'starcoder2':16384,'starcoder':8192,
  'wizardcoder':16384,'solar':4096,'vicuna':4096,
};
function getCtxLimit(m){
  if(!m)return 32768;
  const b=m.split(':')[0].toLowerCase();
  for(const[k,v]of Object.entries(MODEL_CTX))if(b.includes(k))return v;
  return 32768;
}
function countTok(t){return Math.ceil((t||'').length/3.5);}
function fmtTok(n){return n>=1000?(n/1000).toFixed(1)+'k':String(n);}
function updateCtx(){
  const pct=Math.min(100,(convTokens/ctxLimit)*100);
  const f=document.getElementById('ctxFill'),l=document.getElementById('ctxLabel');
  if(f)f.style.cssText='width:'+pct+'%;background:'+(pct<60?'#4ade80':pct<85?'#fbbf24':'#f87171');
  if(l)l.textContent=fmtTok(convTokens)+' / '+fmtTok(ctxLimit)+' tokens';
}

const SLASH=[
  {cmd:'/explain',desc:'Explain selected code'},
  {cmd:'/fix',desc:'Find and fix bugs'},
  {cmd:'/refactor',desc:'Refactor for quality'},
  {cmd:'/test',desc:'Write unit tests'},
  {cmd:'/docs',desc:'Generate documentation'},
  {cmd:'/review',desc:'Code review'},
  {cmd:'/optimize',desc:'Optimize performance'},
  {cmd:'/plan',desc:'Build step-by-step plan (agent)'},
  {cmd:'/edit',desc:'Describe changes to make (agent)'},
  {cmd:'/build',desc:'Build a new feature (agent)'},
  {cmd:'/run',desc:'Run terminal command (agent)'},
  {cmd:'/types',desc:'Add TypeScript types'},
];
const MENTIONT=[{type:'file',label:'file'},{type:'git',label:'git'},{type:'symbol',label:'symbol'},{type:'memory',label:'memory'},{type:'workspace',label:'workspace'}];

const $=id=>document.getElementById(id);
const msgs=$('messages'), inp=$('msgInput'), sendBtn=$('sendBtn'), stopBtn=$('stopBtn');
const statusDot=$('statusDot'), modelSel=$('modelSelect');
const selBadge=$('selBadge'), slashPop=$('slashPop'), filePop=$('filePop');
const emptyState=$('emptyState'), emptyNoSetup=$('emptyStateNoSetup'), sessionNameEl=$('session-name');
const charCt=$('charCt'), cmdMenu=$('cmdMenu'), mentionPop=$('mentionPop');

/* init */
vscode.postMessage({type:'getConnectionStatus'});
vscode.postMessage({type:'getModels'});
vscode.postMessage({type:'getIndexStatus'});
vscode.postMessage({type:'getMemory'});
setInterval(()=>vscode.postMessage({type:'getSelectionContext'}),1500);

/* \u2500\u2500 Mode toggle \u2500\u2500 */
const modeA=$('modeAgentBtn'), modeQ=$('modeAskBtn');
function setMode(a){
  agentMode=a;
  modeA.className='mode-btn'+(a?' active-agent':'');
  modeQ.className='mode-btn'+(!a?' active-ask':'');
}
modeA.onclick=()=>setMode(true);
modeQ.onclick=()=>setMode(false);

/* \u2500\u2500 Top bar buttons \u2500\u2500 */
$('providerBadge').onclick=()=>vscode.postMessage({type:'runCommand',command:'clawpilot.selectProvider'});
$('setupBtn').onclick=()=>vscode.postMessage({type:'runCommand',command:'clawpilot.setup'});
$('newSessionBtn').onclick=()=>vscode.postMessage({type:'runCommand',command:'clawpilot.newSession'});
if($('setupEmptyBtn'))$('setupEmptyBtn').onclick=()=>vscode.postMessage({type:'runCommand',command:'clawpilot.setup'});
$('reindexBtn').onclick=()=>vscode.postMessage({type:'reindexWorkspace'});
$('memoryBtn').onclick=()=>{const p=$('memoryPanel');p.classList.toggle('open',!p.classList.contains('open'));};
$('memorySaveBtn').onclick=()=>{
  const core={projectContext:$('memProjectContext').value,userPreferences:$('memUserPreferences').value,keyFacts:window._kf||[]};
  vscode.postMessage({type:'updateCore',patch:core});
};
$('newKeyFact').onkeydown=e=>{
  if(e.key==='Enter'){const v=$('newKeyFact').value.trim();if(v){(window._kf=window._kf||[]).push(v);$('newKeyFact').value='';renderKF();vscode.postMessage({type:'updateCore',patch:{keyFacts:window._kf}});}}
};
function renderKF(){
  const el=$('keyFactsList');if(!el)return;
  const f=window._kf||[];
  el.innerHTML=f.map((t,i)=>'<span class="key-fact-tag">'+esc(t)+' <button data-i="'+i+'">\xD7</button></span>').join('');
  el.querySelectorAll('button').forEach(b=>{b.onclick=()=>{(window._kf=window._kf||[]).splice(+b.dataset.i,1);renderKF();vscode.postMessage({type:'updateCore',patch:{keyFacts:window._kf}});};});
}

modelSel.onchange=()=>{ctxLimit=getCtxLimit(modelSel.value);updateCtx();vscode.postMessage({type:'changeModel',model:modelSel.value});};
stopBtn.onclick=()=>{vscode.postMessage({type:'stopAgent'});stopBtn.disabled=true;stopBtn.textContent='Stopping\u2026';};

document.querySelectorAll('.quick-btn').forEach(b=>{
  b.onclick=()=>{
    const cmd=(b.dataset.cmd||'').trim();
    if(!cmd){inp.focus();return;}
    inp.value=cmd;autoSz();closeSlash();closeFile();
    if(inp.value.trim()&&!running)send();else inp.focus();
  };
});

/* \u2500\u2500 Input events \u2500\u2500 */
inp.addEventListener('input',()=>{
  const v=inp.value,c=inp.selectionStart;
  if(charCt)charCt.textContent=v.length;
  /* New command menu from loaded commands */
  if(v.startsWith('/')&&!v.includes(' ')&&allCmds.length){
    const fil=allCmds.filter(x=>x.name.startsWith(v.slice(1).toLowerCase()));
    if(fil.length&&cmdMenu){
      cmdMenu.innerHTML=fil.map((x,i)=>'<div class="popup-item" data-usage="'+esc(x.usage)+'"><span class="p-cmd">'+esc('/'+x.name)+'</span><span class="p-desc">'+esc(x.description)+'</span></div>').join('');
      cmdMenu.classList.add('open');
      cmdMenu.querySelectorAll('.popup-item').forEach(el=>{
        el.addEventListener('mousedown',e=>{e.preventDefault();const u=el.getAttribute('data-usage')||'';inp.value=u.replace(/<[^>]*>/g,' ').trim()+(u.includes('<')?' ':'');cmdMenu.classList.remove('open');inp.focus();if(charCt)charCt.textContent=inp.value.length;});
      });
    }else if(cmdMenu)cmdMenu.classList.remove('open');
  }else if(cmdMenu)cmdMenu.classList.remove('open');
  autoSz();
  /* Fallback SLASH list */
  const sm=v.match(/^/(w*)$/);
  if(sm&&!allCmds.length){const p=sm[1].toLowerCase();const f=SLASH.filter(s=>s.cmd.slice(1).startsWith(p));if(f.length){renderSlash(f);return;}}
  closeSlash();
  /* @ mentions */
  const am=v.slice(0,c).match(/@(w*)$/);
  if(am){
    const seg=v.slice(0,c).slice(v.slice(0,c).lastIndexOf('@'));
    if(seg.indexOf(':')===-1){
      if(mentionPop){
        mentionPop.innerHTML=MENTIONT.map(m=>'<button class="m-pill" data-type="'+esc(m.type)+'">@'+esc(m.label)+'</button>').join('');
        mentionPop.classList.add('open');
        mentionPop.querySelectorAll('.m-pill').forEach(b=>{
          b.addEventListener('mousedown',function(e){e.preventDefault();
            const tp=this.dataset.type,val=inp.value,pos=inp.selectionStart;
            const st=val.slice(0,pos).lastIndexOf('@');
            const bef=val.slice(0,st),aft=val.slice(pos);
            const ins=tp==='workspace'?'@workspace ':'@'+tp+':';
            inp.value=bef+ins+aft;inp.selectionStart=inp.selectionEnd=bef.length+ins.length;
            mentionPop.classList.remove('open');inp.focus();autoSz();
            if(charCt)charCt.textContent=inp.value.length;
          });
        });
      }
      return;
    }
    vscode.postMessage({type:'getWorkspaceFiles',query:am[1]});
    return;
  }
  if(mentionPop)mentionPop.classList.remove('open');
  closeFile();
});

inp.addEventListener('blur',()=>setTimeout(()=>{
  closeSlash();closeFile();
  if(mentionPop)mentionPop.classList.remove('open');
  if(cmdMenu)cmdMenu.classList.remove('open');
},150));

inp.addEventListener('keydown',e=>{
  const enter=(e.key==='Enter'||e.keyCode===13)&&!e.shiftKey;
  if(slashPop.classList.contains('open')){
    const its=slashPop.querySelectorAll('.popup-item');
    if(e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();slashIdx=Math.min(slashIdx+1,its.length-1);hlSlash();return;}
    if(e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();slashIdx=Math.max(slashIdx-1,0);hlSlash();return;}
    if(enter||e.key==='Tab'){e.preventDefault();e.stopPropagation();(its[Math.max(0,slashIdx)]||its[0])?.click();return;}
    if(e.key==='Escape'){e.preventDefault();closeSlash();return;}
  }
  if(filePop.classList.contains('open')){
    const its=filePop.querySelectorAll('.file-item');
    if(e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();fileIdx=Math.min(fileIdx+1,its.length-1);hlFile();return;}
    if(e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();fileIdx=Math.max(fileIdx-1,0);hlFile();return;}
    if(enter||e.key==='Tab'){e.preventDefault();e.stopPropagation();(its[Math.max(0,fileIdx)]||its[0])?.click();return;}
    if(e.key==='Escape'){e.preventDefault();closeFile();return;}
  }
  if(enter){e.preventDefault();e.stopPropagation();send();}
},{capture:true});

function autoSz(){inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,160)+'px';}

function renderSlash(items){
  if(!items.length){closeSlash();return;}
  slashPop.innerHTML=items.map(it=>'<div class="popup-item" data-cmd="'+it.cmd+'"><span class="p-cmd">'+it.cmd+'</span><span class="p-desc">'+it.desc+'</span></div>').join('');
  slashPop.querySelectorAll('.popup-item').forEach(el=>{el.onclick=()=>{inp.value=el.dataset.cmd+' ';closeSlash();inp.focus();autoSz();};});
  slashIdx=0;hlSlash();slashPop.classList.add('open');
}
function closeSlash(){slashPop.classList.remove('open');slashIdx=-1;}
function hlSlash(){slashPop.querySelectorAll('.popup-item').forEach((el,i)=>{el.classList.toggle('hi',i===slashIdx);if(i===slashIdx)el.scrollIntoView({block:'nearest'});});}

function renderFile(files){
  if(!files.length){closeFile();return;}
  filePop.innerHTML=files.slice(0,20).map(f=>'<div class="file-item" data-f="'+esc(f)+'">'+esc(f)+'</div>').join('');
  filePop.querySelectorAll('.file-item').forEach(el=>{
    el.onclick=()=>{
      const v=inp.value,c=inp.selectionStart;
      inp.value=v.slice(0,c).replace(/@([^s]*)$/,'@'+el.dataset.f+' ')+v.slice(c);
      if(!attachedFiles.includes(el.dataset.f))attachedFiles.push(el.dataset.f);
      closeFile();inp.focus();autoSz();
    };
  });
  fileIdx=0;hlFile();filePop.classList.add('open');
}
function closeFile(){filePop.classList.remove('open');fileIdx=-1;}
function hlFile(){filePop.querySelectorAll('.file-item').forEach((el,i)=>el.classList.toggle('hi',i===fileIdx));}

function send(){
  const dbg=document.getElementById('dbg');
  if(dbg) dbg.textContent='send() called, running='+running+', text='+(inp.value||'').slice(0,20);
  const text=inp.value.trim();
  if(!text||running)return;
  const code=selText||'',files=[...attachedFiles];
  attachedFiles=[];inp.value='';autoSz();
  closeSlash();closeFile();
  convTokens+=countTok(text);updateCtx();
  // Show user message immediately (don't wait for extension echo)
  addUser(text,[]);
  startAssistant();
  setRunning(true);
  vscode.postMessage({type:'sendMessage',text,codeContext:code,files,agentMode});
}
sendBtn.onclick=send;

function setRunning(r){
  running=r;
  sendBtn.disabled=r;
  sendBtn.style.display=r?'none':'inline-block';
  stopBtn.style.display=r?'inline-block':'none';
  if(!r){stopBtn.disabled=false;stopBtn.textContent='\u25A0 Stop';}
}
function agentEnd(){setRunning(false);}

function hideEmpty(){
  emptyState.style.display='none';
  if(emptyNoSetup)emptyNoSetup.classList.remove('visible');
}
function scrollBot(){msgs.scrollTop=msgs.scrollHeight;}
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

const CTX_SYM={selection:'[sel]',activeFile:'[file]',workspaceRag:'[rag]',gitDiff:'[diff]',diagnostics:'[diag]',memory:'[mem]',skills:'[skill]',files:'[files]'};

function addUser(text,ctxTypes){
  hideEmpty();
  const d=document.createElement('div');d.className='message user';
  d.innerHTML='<div class="bubble">'+esc(text)+'</div>';
  if(ctxTypes&&ctxTypes.length){
    const s=document.createElement('div');s.className='ctx-tags';
    s.innerHTML=ctxTypes.map(t=>'<span class="ctx-tag" title="'+esc(t)+'">'+(CTX_SYM[t]||esc(t))+'</span>').join('');
    d.appendChild(s);
  }
  msgs.appendChild(d);scrollBot();
}

function startAssistant(){
  hideEmpty();
  const d=document.createElement('div');d.className='message assistant';
  const b=document.createElement('div');b.className='bubble';
  b.innerHTML='<div class="thinking"><div class="thinking-dots"><span></span><span></span><span></span></div> Thinking\u2026</div>';
  d.appendChild(b);msgs.appendChild(d);curBubble=b;curSteps=null;scrollBot();
}

function streamChunk(chunk){
  if(!curBubble)startAssistant();
  const t=curBubble.querySelector('.thinking');if(t)t.remove();
  let s=curBubble.querySelector('.stream-raw');
  if(!s){s=document.createElement('span');s.className='stream-raw';curBubble.appendChild(s);}
  s.textContent=(s.textContent||'')+chunk;scrollBot();
}

function finalize(html){
  if(!curBubble)return;
  convTokens+=countTok(curBubble.querySelector('.stream-raw')?.textContent||'');updateCtx();
  curBubble.innerHTML=html||'';attachActions(curBubble);curBubble=null;scrollBot();
}

function attachActions(el){
  el.querySelectorAll('.code-block').forEach(block=>{
    const pre=block.querySelector('pre');if(!pre)return;
    const cp=block.querySelector('.copy-btn'),ins=block.querySelector('.insert-btn');
    if(cp)cp.onclick=()=>{navigator.clipboard?.writeText(pre.textContent||'');cp.textContent='Copied!';setTimeout(()=>cp.textContent='Copy',1200);};
    if(ins)ins.onclick=()=>vscode.postMessage({type:'insertCode',code:pre.textContent||''});
  });
}

function agentStart(){
  setRunning(true);hideEmpty();
  const d=document.createElement('div');d.className='message assistant';
  const b=document.createElement('div');b.className='bubble';
  d.appendChild(b);msgs.appendChild(d);curBubble=b;
  const steps=document.createElement('div');steps.className='agent-steps';
  b.appendChild(steps);curSteps=steps;scrollBot();
}

function addToolCall(name,args,step){
  if(!curSteps)agentStart();
  const s=document.createElement('div');s.className='agent-step';s.id='step'+step;
  const argsStr=args?Object.entries(args).map(([k,v])=>k+': '+String(v).slice(0,60)).join(' \xB7 '):'';
  s.innerHTML='<span class="step-icon">\u2699</span><div class="step-body"><div class="step-title">'+esc(name)+'</div>'+(argsStr?'<div class="step-detail">'+esc(argsStr)+'</div>':'')+'</div>';
  const det=s.querySelector('.step-detail');if(det)det.onclick=()=>det.classList.toggle('expanded');
  curSteps.appendChild(s);scrollBot();
}

function addToolResult(name,output,ok,step){
  const s=document.getElementById('step'+step);if(!s)return;
  s.classList.add(ok?'success':'failure');
  s.querySelector('.step-icon').textContent=ok?'\u2713':'\u2717';
  const d=document.createElement('div');d.className='step-detail';
  d.textContent=(output||'').slice(0,400);d.onclick=()=>d.classList.toggle('expanded');
  s.querySelector('.step-body').appendChild(d);scrollBot();
}

function addReflection(content,attempt){
  if(!curSteps)agentStart();
  const s=document.createElement('div');s.className='agent-step reflection';
  s.innerHTML='<span class="step-icon">\u{1F504}</span><div class="step-body"><div class="step-title">Reflecting (attempt '+esc(String(attempt||1))+')</div><div class="step-detail">'+esc(content||'')+'</div></div>';
  const det=s.querySelector('.step-detail');if(det)det.onclick=()=>det.classList.toggle('expanded');
  curSteps.appendChild(s);scrollBot();
}

function showDiffPreview(stepId,filePath,isNew,html){
  if(!curSteps)agentStart();
  const wrap=document.createElement('div');wrap.className='diff-block';
  wrap.innerHTML='<div class="diff-header"><span>'+(isNew?'\u271A New: ':'~ Edit: ')+esc(filePath)+'</span></div><div class="diff-body">'+html+'</div><div class="diff-actions"><button class="btn-approve-diff">\u2713 Apply</button><button class="btn-reject-diff">\u2715 Reject</button></div>';
  wrap.querySelector('.btn-approve-diff').onclick=()=>{wrap.querySelector('.diff-actions').innerHTML='<em style="font-size:11px;color:#4ade80">Applied.</em>';vscode.postMessage({type:'approveDiff',stepId});};
  wrap.querySelector('.btn-reject-diff').onclick=()=>{wrap.querySelector('.diff-actions').innerHTML='<em style="font-size:11px;color:#f87171">Rejected.</em>';vscode.postMessage({type:'rejectDiff',stepId});};
  curSteps.appendChild(wrap);scrollBot();
}

function showPlan(html){
  setRunning(false);hideEmpty();
  const d=document.createElement('div');d.className='message assistant';
  const b=document.createElement('div');b.className='bubble';b.style.padding='4px';
  const plan=document.createElement('div');plan.className='plan-block';
  plan.innerHTML='<div class="plan-header">\u{1F4CB} Plan \u2014 Review before executing</div><div class="plan-content">'+html+'</div><div class="plan-actions"><button class="btn-approve" id="approveBtn">\u25B6 Execute</button><button class="btn-reject" id="rejectBtn">\u2715 Reject</button></div>';
  b.appendChild(plan);d.appendChild(b);msgs.appendChild(d);curBubble=null;
  plan.querySelector('#approveBtn').onclick=()=>{plan.querySelector('.plan-actions').innerHTML='<em style="font-size:12px;opacity:.7">Executing\u2026</em>';vscode.postMessage({type:'confirmPlan'});};
  plan.querySelector('#rejectBtn').onclick=()=>{plan.querySelector('.plan-actions').innerHTML='<em style="font-size:12px;color:#f44336">Rejected.</em>';vscode.postMessage({type:'rejectPlan'});};
  scrollBot();
}

/* \u2500\u2500 Message handler \u2500\u2500 */
window.addEventListener('message',e=>{
  const dbg=document.getElementById('dbg');
  try{
    if(dbg){
      const data=e.data??{};
      dbg.textContent='msg: '+(data.type||'unknown')+' | '+JSON.stringify(data).slice(0,80);
    }
  }catch{}
  const m=e.data;
  switch(m.type){
    case 'userMessage': break; // already shown optimistically in send()
    case 'startAssistantMessage': startAssistant();setRunning(true);break;
    case 'streamChunk': streamChunk(m.chunk);break;
    case 'finalizeAssistantMessage': finalize(m.html);agentEnd();break;
    case 'agentStart': agentStart();break;
    case 'agentThinking': break;
    case 'agentToolCall': addToolCall(m.toolName,m.toolArgs,m.step);break;
    case 'agentToolResult': addToolResult(m.toolName,m.output,m.success,m.step);break;
    case 'agentReflection': addReflection(m.content,m.attempt);break;
    case 'agentDiffPreview': showDiffPreview(m.stepId,m.path,m.isNew,m.html);break;
    case 'agentPlan': showPlan(m.html);break;
    case 'agentDone':
      if(m.html&&curBubble){const r=document.createElement('div');r.innerHTML=m.html;curBubble.appendChild(r);attachActions(r);convTokens+=countTok(r.textContent||'');updateCtx();}
      if(m.error&&curBubble){const er=document.createElement('div');er.style.cssText='color:#f87171;font-size:12px;margin-top:6px;';er.textContent='\u26A0 '+m.error;curBubble.appendChild(er);}
      curBubble=null;agentEnd();scrollBot();break;
    case 'planExecuting': startAssistant();setRunning(true);break;
    case 'planRejected': agentEnd();break;
    case 'models': renderModels(m.models,m.current);break;
    case 'connectionStatus': statusDot.classList.toggle('ok',m.connected);break;
    case 'providerModelStatus':{
      const badge=$('providerBadge');
      if(badge)badge.textContent=(m.providerLabel||'ClawPilot')+(m.model?' \u2022 '+m.model:'');
      needSetup=!m.connected||!m.model;
      if(emptyNoSetup)emptyNoSetup.classList.toggle('visible',needSetup);
      if(emptyState)emptyState.style.display=needSetup?'none':'flex';
      if(m.model){ctxLimit=getCtxLimit(m.model);updateCtx();}
      break;
    }
    case 'indexStatus':{
      const el=$('indexStatus');
      if(el){
        el.classList.toggle('indexing',!!m.indexing);
        if(m.indexing&&m.fileCount!=null)el.textContent='Indexing\u2026 ('+m.fileCount+' files)';
        else if(!m.indexing&&m.chunkCount!=null)el.textContent=m.chunkCount+' chunks indexed';
        else el.textContent=m.message||'';
      }
      break;
    }
    case 'memoryData':{
      const core=m.core||{};
      if($('memProjectContext'))$('memProjectContext').value=core.projectContext||'';
      if($('memUserPreferences'))$('memUserPreferences').value=core.userPreferences||'';
      window._kf=Array.isArray(core.keyFacts)?core.keyFacts.slice():[];
      renderKF();
      const skillList=m.skills||[];
      const sk=$('skillsList');
      if(sk){sk.innerHTML=skillList.map(s=>'<div class="skill-row"><span>'+esc(s.name)+'</span><button data-id="'+esc(s.id)+'">Delete</button></div>').join('')||'<span style="opacity:.7">No skills</span>';sk.querySelectorAll('button').forEach(b=>{b.onclick=()=>vscode.postMessage({type:'deleteSkill',id:b.dataset.id});});}
      break;
    }
    case 'selectionContext':
      selText=m.text;selLang=m.lang;
      selBadge.classList.toggle('on',!!m.text);
      if(m.text&&$('selLabel'))$('selLabel').textContent=m.text.split('
').length+' lines'+(m.lang?' ('+m.lang+')':'');
      break;
    case 'workspaceFiles': renderFile(m.files);break;
    case 'injectMessage': inp.value=m.text;if(m.codeContext)selText=m.codeContext;autoSz();inp.focus();break;
    case 'injectPrompt': inp.value=m.text||'';autoSz();break;
    case 'submitPrompt': if(inp.value.trim())send();break;
    case 'loadHistory':
      msgs.innerHTML='';
      if(emptyNoSetup)msgs.appendChild(emptyNoSetup);
      msgs.appendChild(emptyState);
      emptyState.style.display='none';
      if(emptyNoSetup)emptyNoSetup.classList.remove('visible');
      if(sessionNameEl)sessionNameEl.textContent=m.sessionName||'';
      convTokens=0;
      for(const msg of(m.messages||[])){
        if(msg.role==='user'){addUser(msg.content);convTokens+=countTok(msg.content);}
        else{
          hideEmpty();
          const d=document.createElement('div');d.className='message assistant';
          const b=document.createElement('div');b.className='bubble';
          b.innerHTML=msg.html||esc(msg.content);d.appendChild(b);msgs.appendChild(d);
          attachActions(b);convTokens+=countTok(msg.content);
        }
      }
      updateCtx();scrollBot();break;
    case 'clearMessages':
      msgs.innerHTML='';
      if(emptyNoSetup)msgs.appendChild(emptyNoSetup);
      msgs.appendChild(emptyState);
      emptyState.style.display=needSetup?'none':'flex';
      if(emptyNoSetup)emptyNoSetup.classList.toggle('visible',needSetup);
      convTokens=0;updateCtx();break;
    case 'error':
      if(curBubble){curBubble.innerHTML='<span style="color:#f87171">\u26A0 '+esc(m.message||'Error')+'</span>';curBubble=null;}
      else{
        hideEmpty();
        const d=document.createElement('div');d.className='message assistant';
        const b=document.createElement('div');b.className='bubble';
        b.innerHTML='<span style="color:#f87171">\u26A0 '+esc(m.message||'Error')+'</span>';
        d.appendChild(b);msgs.appendChild(d);scrollBot();
      }
      agentEnd();break;
    case 'slashCommands': allCmds=m.commands||[];break;
    case 'assistantMessage':{
      hideEmpty();
      const ad=document.createElement('div');ad.className='message assistant';
      const ab=document.createElement('div');ab.className='bubble';
      ab.innerHTML=m.html||esc(m.text||'');
      ad.appendChild(ab);msgs.appendChild(ad);attachActions(ab);
      convTokens+=countTok(m.text||'');updateCtx();scrollBot();break;
    }
    case 'setModel':
      if(modelSel&&m.model){modelSel.value=m.model;ctxLimit=getCtxLimit(m.model);updateCtx();vscode.postMessage({type:'changeModel',model:m.model});}
      break;
    case 'installStart':
      hideEmpty();
      {const d=document.createElement('div');d.className='message assistant';const b=document.createElement('div');b.className='bubble';b.innerHTML='<div style="font-family:monospace;font-size:11px;white-space:pre-wrap;">Pulling '+esc(m.model)+'\u2026</div>';d.appendChild(b);msgs.appendChild(d);window._installLog=b.querySelector('div');scrollBot();}
      break;
    case 'installProgress':
      if(window._installLog){window._installLog.textContent+=(window._installLog.textContent?'
':'')+m.line;scrollBot();}
      break;
    case 'installDone':
      if(window._installLog){window._installLog.textContent+='
'+(m.success?'\u2713 Done. Switched to '+m.model+'.':'\u2717 Failed. '+(m.error||''));window._installLog=null;}
      break;
  }
});

function renderModels(models,current){
  modelSel.innerHTML='';
  if(!models||!models.length){
    const o=document.createElement('option');
    o.textContent='No models \u2014 start Ollama or add API key';
    o.value='';modelSel.appendChild(o);
    modelSel.title='Run: ollama serve  then: ollama pull llama3.2';
    return;
  }
  models.forEach(m=>{
    const o=document.createElement('option');
    o.value=m.name;
    const sz=m.size!=null?(m.size/1e9).toFixed(1)+'B':'';
    o.textContent=m.name+(sz?' ('+sz+')':'');
    if(m.name===current)o.selected=true;
    modelSel.appendChild(o);
  });
  if(current){ctxLimit=getCtxLimit(current);updateCtx();}
}

updateCtx();
</script>
</body>
</html>`
    );
  }
};
function getNonce() {
  let text = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

// src/rag/workspaceIndex.ts
var vscode12 = __toESM(require("vscode"));
var path6 = __toESM(require("path"));
var fs3 = __toESM(require("fs"));

// src/rag/codeChunker.ts
var path5 = __toESM(require("path"));
var MIN_CHUNK_LINES = 5;
var MAX_CHUNK_LINES = 80;
var FALLBACK_WINDOW = 40;
var FALLBACK_OVERLAP = 10;
var SEMANTIC_LANGS = /* @__PURE__ */ new Set([
  "typescript",
  "javascript",
  "ts",
  "js",
  "python",
  "py",
  "go",
  "rust",
  "rs",
  "java",
  "c",
  "cpp",
  "csharp",
  "cs",
  "css",
  "html",
  "htm"
]);
var SKIP_DIRS = ["node_modules", ".git", "dist", "out", "build", ".next"];
var SKIP_FILES = /\.min\.(js|css)$/i;
function shouldIndexFile(relativePath) {
  const parts = relativePath.split(/[/\\]/);
  if (parts.some((p) => SKIP_DIRS.includes(p))) return false;
  if (SKIP_FILES.test(relativePath)) return false;
  return true;
}
function findDeclarations(content, language) {
  const lines = content.split("\n");
  const decls = [];
  const lang = language.toLowerCase();
  const classRe = /^\s*((?:export\s+)?(?:abstract\s+)?(?:public\s+)?(?:private\s+)?)?class\s+(\w+)/;
  const fnRe = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/;
  const fnExprRe = /^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\()/;
  const methodRe = /^\s{2,}(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{?\s*$/;
  const pyDefRe = /^\s*def\s+(\w+)\s*\(/;
  const pyClassRe = /^\s*class\s+(\w+)\s*[(:]/;
  const goFuncRe = /^\s*func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/;
  const rustFnRe = /^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*[<(]/;
  const cFuncRe = /^\s*(?:\w+(?:\s*\*+)?\s+)+\s*(\w+)\s*\([^)]*\)\s*\{?\s*$/;
  const htmlBlockRe = /^\s*<(script|style|div|section|main|article)\b/;
  const cssBlockRe = /^\s*(@\w+|\.[\w-]+|#[\w-]+)\s*\{/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    if (lang === "python" || lang === "py") {
      const m = line.match(pyClassRe) || line.match(pyDefRe);
      if (m) decls.push({ type: m[0].trim().startsWith("class") ? "class" : "function", name: m[1], startLine: lineNum });
      continue;
    }
    if (lang === "go") {
      const m = line.match(goFuncRe);
      if (m) decls.push({ type: "function", name: m[1], startLine: lineNum });
      continue;
    }
    if (lang === "rust" || lang === "rs") {
      const m = line.match(rustFnRe);
      if (m) decls.push({ type: "function", name: m[1], startLine: lineNum });
      continue;
    }
    if (lang === "html" || lang === "htm") {
      const m = line.match(htmlBlockRe);
      if (m) decls.push({ type: "block", name: m[1], startLine: lineNum });
      continue;
    }
    if (lang === "css") {
      const m = line.match(cssBlockRe);
      if (m) decls.push({ type: "block", name: m[1].replace(/^[.#]/, ""), startLine: lineNum });
      continue;
    }
    if (lang === "c" || lang === "cpp" || lang === "csharp" || lang === "cs") {
      const cm = line.match(classRe);
      if (cm) decls.push({ type: "class", name: cm[2], startLine: lineNum });
      else {
        const fm = line.match(cFuncRe);
        if (fm) decls.push({ type: "function", name: fm[1], startLine: lineNum });
      }
      continue;
    }
    if (classRe.test(line)) {
      const m = line.match(classRe);
      if (m) decls.push({ type: "class", name: m[2], startLine: lineNum });
    } else if (fnRe.test(line) || fnExprRe.test(line)) {
      const m = line.match(fnRe) || line.match(fnExprRe);
      if (m) decls.push({ type: "function", name: m[1], startLine: lineNum });
    } else if (methodRe.test(line) && line.trim().length > 3) {
      const m = line.match(methodRe);
      if (m) decls.push({ type: "method", name: m[1], startLine: lineNum });
    }
  }
  return decls;
}
function resolveEndLine(lines, startLine, language) {
  const lang = language.toLowerCase();
  const start = startLine - 1;
  if (lang === "python" || lang === "py" || lang === "go") {
    const indent = (lines[start] ?? "").match(/^(\s*)/)?.[1]?.length ?? 0;
    for (let i = start + 1; i < Math.min(start + MAX_CHUNK_LINES + 1, lines.length); i++) {
      const t = lines[i] ?? "";
      const curIndent = t.match(/^(\s*)/)?.[1]?.length ?? 0;
      if (t.trim() === "" && i > start + 1) continue;
      if (curIndent <= indent && t.trim() !== "") return Math.min(i, start + MAX_CHUNK_LINES);
    }
    return Math.min(lines.length, start + MAX_CHUNK_LINES);
  }
  let depth = 0;
  let inBlock = false;
  for (let i = start; i < Math.min(start + MAX_CHUNK_LINES, lines.length); i++) {
    const line = lines[i] ?? "";
    for (const c of line) {
      if (c === "{") {
        depth++;
        inBlock = true;
      } else if (c === "}") depth--;
    }
    if (inBlock && depth === 0) return i + 1;
  }
  return Math.min(lines.length, start + MAX_CHUNK_LINES);
}
function chunkBySlidingWindow(lines, filePath, language) {
  const chunks = [];
  let start = 0;
  let index = 0;
  while (start < lines.length) {
    const end = Math.min(start + FALLBACK_WINDOW, lines.length);
    const content = lines.slice(start, end).join("\n");
    if (content.trim().length > 0 && end - start >= MIN_CHUNK_LINES) {
      const id = `${filePath}:${start + 1}-${end}`;
      chunks.push({
        id,
        filePath,
        language,
        startLine: start + 1,
        endLine: end,
        name: `lines ${start + 1}-${end}`,
        content,
        type: "block"
      });
      index++;
    }
    start += FALLBACK_WINDOW - FALLBACK_OVERLAP;
    if (start >= lines.length) break;
  }
  return chunks;
}
function chunkFile(filePath, content, language) {
  const lines = content.split("\n");
  const ext = path5.extname(filePath).toLowerCase().replace(/^\./, "");
  const lang = language || ext;
  const useSemantic = SEMANTIC_LANGS.has(lang);
  if (!useSemantic || lines.length < MIN_CHUNK_LINES) {
    return chunkBySlidingWindow(lines, filePath, lang);
  }
  const decls = findDeclarations(content, lang);
  const chunks = [];
  for (let d = 0; d < decls.length; d++) {
    const decl = decls[d];
    const nextStart = d + 1 < decls.length ? decls[d + 1].startLine - 1 : lines.length;
    let endLine = resolveEndLine(lines, decl.startLine, lang);
    endLine = Math.min(endLine, decl.startLine + MAX_CHUNK_LINES - 1, nextStart + 1);
    const lineCount = endLine - decl.startLine + 1;
    if (lineCount < MIN_CHUNK_LINES) continue;
    const slice = lines.slice(decl.startLine - 1, endLine);
    const contentSlice = slice.join("\n");
    const id = `${filePath}:${decl.startLine}-${endLine}`;
    chunks.push({
      id,
      filePath,
      language: lang,
      startLine: decl.startLine,
      endLine,
      name: decl.name,
      content: contentSlice,
      type: decl.type
    });
  }
  if (chunks.length === 0) {
    return chunkBySlidingWindow(lines, filePath, lang);
  }
  return chunks;
}

// src/rag/embedder.ts
var vscode11 = __toESM(require("vscode"));
var BATCH_SIZE = 10;
var TIMEOUT_MS3 = 15e3;
var ENDPOINT_CONFIG_KEYS2 = {
  lmstudio: "lmstudioEndpoint",
  llamafile: "llamafileEndpoint",
  vllm: "vllmEndpoint",
  localai: "localaiEndpoint",
  jan: "janEndpoint",
  "textgen-webui": "textgenEndpoint",
  "openai-compatible": "endpoint"
};
var Embedder = class _Embedder {
  constructor() {
    this._cache = /* @__PURE__ */ new Map();
    this._available = null;
    this._config = vscode11.workspace.getConfiguration("clawpilot");
  }
  get _provider() {
    return this._config.get("provider", "ollama");
  }
  /** Cloud API providers (anthropic, openai, google) do not expose local /v1/embeddings; use Ollama endpoint. */
  get _useOllamaForEmbedding() {
    const provider = this._provider;
    return provider === "ollama" || API_PROVIDER_TYPES.includes(provider);
  }
  get _endpoint() {
    const provider = this._provider;
    if (provider === "ollama" || API_PROVIDER_TYPES.includes(provider)) {
      const base2 = this._config.get("endpoint", "http://localhost:11434");
      return base2.replace(/\/$/, "");
    }
    const key = ENDPOINT_CONFIG_KEYS2[provider] ?? "endpoint";
    let base = this._config.get(key, "");
    if (!base && key !== "endpoint") base = this._config.get("endpoint", "");
    if (!base) base = `http://localhost:${PROVIDER_DEFAULT_PORTS[provider]}`;
    return base.replace(/\/$/, "");
  }
  get model() {
    return this._config.get("embeddingModel", "nomic-embed-text");
  }
  refreshConfig() {
    this._config = vscode11.workspace.getConfiguration("clawpilot");
  }
  /** Check if embedding model is available (one-time probe, then cached). Tries Ollama and OpenAI formats. */
  async isAvailable() {
    if (this._available !== null) return this._available;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5e3);
    const endpoint = this._endpoint;
    const useOpenAI = !this._useOllamaForEmbedding;
    try {
      if (useOpenAI) {
        const res = await fetch(`${endpoint}/v1/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: this.model, input: "test" }),
          signal: controller.signal
        });
        clearTimeout(timeout);
        this._available = res.ok;
      } else {
        const res = await fetch(`${endpoint}/api/embed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: this.model, input: "test" }),
          signal: controller.signal
        });
        clearTimeout(timeout);
        this._available = res.ok;
      }
      return this._available;
    } catch {
      clearTimeout(timeout);
      this._available = false;
      return false;
    }
  }
  /** Reset availability cache (e.g. after pulling a model). */
  resetAvailability() {
    this._available = null;
  }
  /** Normalize vector to unit length. */
  static normalize(v) {
    let sum = 0;
    for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
    const norm = Math.sqrt(sum) || 1;
    return v.map((x) => x / norm);
  }
  /** Dot product (assumes vectors are already normalized => cosine similarity). */
  static dot(a, b) {
    if (a.length !== b.length) return 0;
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }
  /** Embed a single text. Returns normalized vector. Caches by optional cacheKey. */
  async embed(text, cacheKey) {
    if (cacheKey && this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }
    this.refreshConfig();
    const useOpenAI = !this._useOllamaForEmbedding;
    const vec = useOpenAI ? await this._embedOpenAI([text], this.model).then((r) => r[0]) : await this._embedOllama([text], this.model).then((r) => r[0]);
    const normalized = _Embedder.normalize(vec);
    if (cacheKey) this._cache.set(cacheKey, normalized);
    return normalized;
  }
  async _embedOllama(texts, model) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS3);
    try {
      const res = await fetch(`${this._endpoint}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: texts.length === 1 ? texts[0] : texts }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Embed failed: ${res.status} ${t}`);
      }
      const data = await res.json();
      const vectors = data.embeddings ?? (data.embedding ? [data.embedding] : []);
      if (vectors.length !== texts.length) throw new Error("Invalid embed response");
      return vectors;
    } finally {
      clearTimeout(timeout);
    }
  }
  async _embedOpenAI(texts, model) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS3);
    try {
      const res = await fetch(`${this._endpoint}/v1/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: texts.length === 1 ? texts[0] : texts }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Embed failed: ${res.status} ${t}`);
      }
      const data = await res.json();
      const list = data.data ?? [];
      if (list.length !== texts.length) throw new Error("Invalid embed response");
      return list.map((d) => d.embedding);
    } finally {
      clearTimeout(timeout);
    }
  }
  /** Embed multiple texts in batches of BATCH_SIZE. Fills cache with chunkIds[i] -> vector. */
  async embedBatch(texts, chunkIds) {
    const results = [];
    const toFetch = [];
    for (let i = 0; i < texts.length; i++) {
      if (this._cache.has(chunkIds[i])) {
        results[i] = this._cache.get(chunkIds[i]);
      } else {
        toFetch.push({ text: texts[i], id: chunkIds[i], index: i });
      }
    }
    this.refreshConfig();
    const useOpenAI = !this._useOllamaForEmbedding;
    const model = this.model;
    for (let b = 0; b < toFetch.length; b += BATCH_SIZE) {
      const batch = toFetch.slice(b, b + BATCH_SIZE);
      const inputs = batch.map((x) => x.text);
      const vectors = useOpenAI ? await this._embedOpenAI(inputs, model) : await this._embedOllama(inputs, model);
      for (let j = 0; j < batch.length; j++) {
        const normalized = _Embedder.normalize(vectors[j]);
        this._cache.set(batch[j].id, normalized);
        results[batch[j].index] = normalized;
      }
    }
    return results;
  }
  getCached(chunkId) {
    return this._cache.get(chunkId);
  }
  clearCache() {
    this._cache.clear();
  }
};

// src/rag/workspaceIndex.ts
var STOPWORDS = /* @__PURE__ */ new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with"
]);
var WorkspaceIndex = class _WorkspaceIndex {
  constructor() {
    this._chunks = [];
    this._chunkById = /* @__PURE__ */ new Map();
    this._lastIndexed = 0;
    this._indexing = false;
    this._tokenFreq = /* @__PURE__ */ new Map();
    // chunkId -> token -> count
    this._docFreq = /* @__PURE__ */ new Map();
    // token -> number of chunks containing it
    this._disposables = [];
    this._embedder = new Embedder();
  }
  get status() {
    return {
      isIndexed: this._chunks.length > 0 && !this._indexing,
      isIndexing: this._indexing,
      chunkCount: this._chunks.length,
      lastIndexed: this._lastIndexed
    };
  }
  /** Tokenize for BM25: split on non-alphanumeric, lowercase, drop stopwords. */
  static tokenize(text) {
    return text.toLowerCase().split(/\W+/).filter((t) => t.length > 1 && !STOPWORDS.has(t));
  }
  updateTokenStats(chunk) {
    const tokens = _WorkspaceIndex.tokenize(chunk.content);
    const freq = /* @__PURE__ */ new Map();
    for (const t of tokens) {
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
    this._tokenFreq.set(chunk.id, freq);
    for (const t of freq.keys()) {
      this._docFreq.set(t, (this._docFreq.get(t) ?? 0) + 1);
    }
  }
  removeTokenStats(chunkId) {
    const freq = this._tokenFreq.get(chunkId);
    if (!freq) return;
    for (const t of freq.keys()) {
      const n = this._docFreq.get(t) ?? 0;
      if (n <= 1) this._docFreq.delete(t);
      else this._docFreq.set(t, n - 1);
    }
    this._tokenFreq.delete(chunkId);
  }
  /** BM25-style score: sum of TF * IDF for query tokens in chunk. */
  bm25Score(chunk, queryTokens) {
    const totalChunks = this._chunks.length || 1;
    const freq = this._tokenFreq.get(chunk.id);
    if (!freq) return 0;
    let score = 0;
    for (const t of queryTokens) {
      const tf = freq.get(t) ?? 0;
      if (tf === 0) continue;
      const df = this._docFreq.get(t) ?? 0;
      const idf = Math.log(totalChunks / (df + 1) + 1);
      score += tf * idf;
    }
    return score;
  }
  /** Index a single file (add or update chunks, update token stats, optionally embed). */
  async indexFile(filePath, content, language, embed) {
    const normPath = path6.normalize(filePath);
    const oldChunks = this._chunks.filter((c) => path6.normalize(c.filePath) === normPath);
    for (const c of oldChunks) {
      this.removeTokenStats(c.id);
      this._chunkById.delete(c.id);
    }
    this._chunks = this._chunks.filter((c) => path6.normalize(c.filePath) !== normPath);
    const chunks = chunkFile(filePath, content, language);
    for (const c of chunks) {
      this._chunks.push(c);
      this._chunkById.set(c.id, c);
      this.updateTokenStats(c);
    }
    if (embed) {
      try {
        await this._embedder.embedBatch(
          chunks.map((c) => c.content),
          chunks.map((c) => c.id)
        );
      } catch {
      }
    }
  }
  /** Index entire workspace (skip node_modules, .git, dist, out, *.min.js). */
  async indexAll(progress) {
    const folders = vscode12.workspace.workspaceFolders;
    if (!folders?.length) {
      progress?.("No workspace folder open");
      return;
    }
    if (this._indexing) return;
    this._indexing = true;
    this._embedder.clearCache();
    this._chunks = [];
    this._chunkById.clear();
    this._tokenFreq.clear();
    this._docFreq.clear();
    const root = folders[0].uri.fsPath;
    const useEmbeddings = await this._embedder.isAvailable();
    try {
      const files = await vscode12.workspace.findFiles(
        new vscode12.RelativePattern(root, "**/*"),
        "{**/node_modules/**,**/.git/**,**/dist/**,**/out/**,**/*.min.js,**/build/**,**/.next/**}",
        5e3
      );
      let indexed = 0;
      for (let i = 0; i < files.length; i++) {
        const uri = files[i];
        const rel = path6.relative(root, uri.fsPath);
        if (!shouldIndexFile(rel)) continue;
        try {
          const content = fs3.readFileSync(uri.fsPath, "utf8");
          const ext = path6.extname(uri.fsPath).replace(/^\./, "") || "plaintext";
          const lang = ext;
          await this.indexFile(rel, content, lang, useEmbeddings);
          indexed++;
          if (progress && indexed % 10 === 0) {
            progress(`Indexing workspace... (${indexed} files)`, indexed);
          }
        } catch {
        }
      }
      this._lastIndexed = Date.now();
      progress?.(`Indexed ${this._chunks.length} chunks`, indexed);
    } catch (err) {
      progress?.(`Index error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this._indexing = false;
    }
  }
  /** Re-index a single file (on save). */
  async indexFileOnSave(doc) {
    const folders = vscode12.workspace.workspaceFolders;
    if (!folders?.length) return;
    const root = folders[0].uri.fsPath;
    const rel = path6.relative(root, doc.uri.fsPath);
    if (!shouldIndexFile(rel)) return;
    const useEmbeddings = await this._embedder.isAvailable();
    try {
      await this.indexFile(rel, doc.getText(), doc.languageId, useEmbeddings);
    } catch {
    }
  }
  /** Query: return top-K chunks by hybrid score (vector + BM25) or BM25 only. */
  async query(text, topK = 5) {
    const k = Math.min(topK, this._chunks.length);
    if (k === 0) return [];
    const queryTokens = _WorkspaceIndex.tokenize(text);
    const useEmbeddings = await this._embedder.isAvailable();
    const config = vscode12.workspace.getConfiguration("clawpilot");
    const alpha = config.get("ragHybridAlpha", 0.6);
    if (useEmbeddings) {
      try {
        const queryVec = await this._embedder.embed(text);
        const withBm25 = this._chunks.map((chunk) => {
          const vec = this._embedder.getCached(chunk.id);
          const vectorScore = vec ? Embedder.dot(queryVec, vec) : 0;
          const bm25 = this.bm25Score(chunk, queryTokens);
          return { chunk, vectorScore, bm25Score: bm25 };
        });
        const maxBm25 = Math.max(1, ...withBm25.map((x) => x.bm25Score));
        const scored2 = withBm25.map(({ chunk, vectorScore, bm25Score }) => {
          const normalizedBm25 = bm25Score / maxBm25;
          const hybridScore = alpha * vectorScore + (1 - alpha) * normalizedBm25;
          return { chunk, score: hybridScore };
        });
        scored2.sort((a, b) => b.score - a.score);
        return scored2.slice(0, k).map((x) => x.chunk);
      } catch {
      }
    }
    const scored = this._chunks.map((chunk) => ({
      chunk,
      score: this.bm25Score(chunk, queryTokens)
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).filter((x) => x.score > 0).map((x) => x.chunk);
  }
  /** Formatted context string for prompt injection. */
  async getContext(query) {
    const config = vscode12.workspace.getConfiguration("clawpilot");
    const topK = config.get("ragTopK", 5);
    const enabled = config.get("ragEnabled", true);
    if (!enabled || this._chunks.length === 0) return "";
    const chunks = await this.query(query, topK);
    if (chunks.length === 0) return "";
    const lines = [
      "<workspace_context>",
      "Relevant code from your workspace (retrieved by semantic search):",
      ""
    ];
    for (const c of chunks) {
      lines.push(`--- ${c.filePath} | ${c.type}: ${c.name} | lines ${c.startLine}-${c.endLine} ---`);
      lines.push(c.content);
      lines.push("");
    }
    lines.push("</workspace_context>");
    return lines.join("\n");
  }
  /** Register file watcher for re-index on save. */
  startWatching() {
    const sub = vscode12.workspace.onDidSaveTextDocument((doc) => {
      this.indexFileOnSave(doc).catch(() => {
      });
    });
    this._disposables.push(sub);
  }
  dispose() {
    for (const d of this._disposables) d.dispose();
    this._disposables = [];
  }
};

// src/memory/memoryStore.ts
var path7 = __toESM(require("path"));
var fs4 = __toESM(require("fs"));
var MAX_RECALL = 200;
var MAX_ARCHIVAL = 1e3;
var MAX_PROJECT_CONTEXT = 500;
var MAX_USER_PREFERENCES = 300;
var MAX_KEY_FACTS = 10;
var MAX_KEY_FACT_LEN = 100;
var SAVE_DEBOUNCE_MS = 2e3;
var RECALL_DAYS_CONSOLIDATE = 7;
var RECALL_AFTER_CONSOLIDATE = 100;
var DECAY_LAMBDA = 0.05;
var STOPWORDS2 = /* @__PURE__ */ new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with"
]);
function tokenize(text) {
  return text.toLowerCase().split(/\W+/).filter((t) => t.length > 1 && !STOPWORDS2.has(t));
}
function uuidLite() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function defaultData() {
  return {
    core: {
      projectContext: "",
      userPreferences: "",
      keyFacts: []
    },
    recall: [],
    archival: [],
    version: 1
  };
}
var MemoryStore = class {
  constructor(storageUri) {
    this._dirty = false;
    this._storagePath = path7.join(storageUri.fsPath, "memory.json");
    this._data = defaultData();
  }
  async init() {
    try {
      const dir = path7.dirname(this._storagePath);
      if (!fs4.existsSync(dir)) {
        fs4.mkdirSync(dir, { recursive: true });
      }
      if (fs4.existsSync(this._storagePath)) {
        const raw = fs4.readFileSync(this._storagePath, "utf8");
        const parsed = JSON.parse(raw);
        this._data = {
          core: {
            projectContext: String(parsed.core?.projectContext ?? "").slice(0, MAX_PROJECT_CONTEXT),
            userPreferences: String(parsed.core?.userPreferences ?? "").slice(0, MAX_USER_PREFERENCES),
            keyFacts: Array.isArray(parsed.core?.keyFacts) ? parsed.core.keyFacts.slice(0, MAX_KEY_FACTS).map((f) => String(f).slice(0, MAX_KEY_FACT_LEN)) : []
          },
          recall: Array.isArray(parsed.recall) ? parsed.recall.slice(0, MAX_RECALL) : [],
          archival: Array.isArray(parsed.archival) ? parsed.archival.slice(0, MAX_ARCHIVAL) : [],
          version: typeof parsed.version === "number" ? parsed.version : 1
        };
      }
      await this.consolidate();
    } catch {
      this._data = defaultData();
    }
  }
  _scheduleSave() {
    this._dirty = true;
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveTimer = void 0;
      this.save();
    }, SAVE_DEBOUNCE_MS);
  }
  async save() {
    if (!this._dirty) return;
    this._dirty = false;
    try {
      const dir = path7.dirname(this._storagePath);
      if (!fs4.existsSync(dir)) {
        fs4.mkdirSync(dir, { recursive: true });
      }
      fs4.writeFileSync(this._storagePath, JSON.stringify(this._data, null, 2), "utf8");
    } catch {
      this._dirty = true;
    }
  }
  getCoreMemory() {
    return { ...this._data.core };
  }
  async updateCoreMemory(patch) {
    if (patch.projectContext !== void 0) {
      this._data.core.projectContext = String(patch.projectContext).slice(0, MAX_PROJECT_CONTEXT);
    }
    if (patch.userPreferences !== void 0) {
      this._data.core.userPreferences = String(patch.userPreferences).slice(0, MAX_USER_PREFERENCES);
    }
    if (patch.keyFacts !== void 0) {
      this._data.core.keyFacts = patch.keyFacts.slice(0, MAX_KEY_FACTS).map((f) => String(f).slice(0, MAX_KEY_FACT_LEN));
    }
    this._scheduleSave();
  }
  async addRecall(content, source, tags = []) {
    const entry = {
      id: uuidLite(),
      content,
      source,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      tags: Array.isArray(tags) ? tags : []
    };
    this._data.recall.unshift(entry);
    if (this._data.recall.length > MAX_RECALL) {
      this._data.recall = this._data.recall.slice(0, MAX_RECALL);
    }
    this._scheduleSave();
  }
  searchRecall(query, topK = 5) {
    const tokens = tokenize(query);
    const now = Date.now();
    if (tokens.length === 0) {
      return this._data.recall.slice(0, topK);
    }
    const scored = this._data.recall.map((entry) => {
      const entryTokens = new Set(tokenize(entry.content));
      let bm25Score = 0;
      for (const t of tokens) {
        if (entryTokens.has(t)) bm25Score++;
      }
      const lastAccess = entry.lastAccessedAt ?? entry.createdAt ?? now;
      const daysSinceAccess = (now - lastAccess) / (1e3 * 60 * 60 * 24);
      const decayFactor = Math.exp(-DECAY_LAMBDA * daysSinceAccess);
      const accessBoost = (entry.accessCount ?? 0) * 0.1;
      const finalScore = bm25Score * decayFactor + accessBoost;
      return { entry, score: finalScore };
    });
    scored.sort((a, b) => b.score - a.score);
    const result = scored.slice(0, topK).filter((x) => x.score > 0).map((x) => x.entry);
    if (result.length === 0) {
      result.push(...this._data.recall.slice(0, topK));
    }
    for (const e of result) {
      e.lastAccessedAt = now;
      e.accessCount = (e.accessCount || 0) + 1;
    }
    this._scheduleSave();
    return result;
  }
  async addArchival(content, source, tags = []) {
    const entry = {
      id: uuidLite(),
      content,
      source,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      tags: Array.isArray(tags) ? tags : []
    };
    this._data.archival.push(entry);
    if (this._data.archival.length > MAX_ARCHIVAL) {
      this._data.archival = this._data.archival.slice(-MAX_ARCHIVAL);
    }
    this._scheduleSave();
  }
  searchArchival(query, topK = 5) {
    const tokens = tokenize(query);
    const now = Date.now();
    if (tokens.length === 0) {
      return this._data.archival.slice(-topK).reverse();
    }
    const scored = this._data.archival.map((entry) => {
      const entryTokens = new Set(tokenize(entry.content));
      let bm25Score = 0;
      for (const t of tokens) {
        if (entryTokens.has(t)) bm25Score++;
      }
      const lastAccess = entry.lastAccessedAt ?? entry.createdAt ?? now;
      const daysSinceAccess = (now - lastAccess) / (1e3 * 60 * 60 * 24);
      const decayFactor = Math.exp(-DECAY_LAMBDA * daysSinceAccess);
      const accessBoost = (entry.accessCount ?? 0) * 0.1;
      const finalScore = bm25Score * decayFactor + accessBoost;
      return { entry, score: finalScore };
    });
    scored.sort((a, b) => b.score - a.score);
    const result = scored.slice(0, topK).filter((x) => x.score > 0).map((x) => x.entry);
    if (result.length === 0) {
      result.push(...this._data.archival.slice(-topK).reverse());
    }
    for (const e of result) {
      e.lastAccessedAt = now;
      e.accessCount = (e.accessCount || 0) + 1;
    }
    this._scheduleSave();
    return result;
  }
  getCoreContextBlock() {
    const c = this._data.core;
    const hasProject = c.projectContext.trim().length > 0;
    const hasPrefs = c.userPreferences.trim().length > 0;
    const hasFacts = c.keyFacts.length > 0;
    if (!hasProject && !hasPrefs && !hasFacts) return "";
    const lines = ["<memory_core>"];
    if (hasProject) lines.push(`Project: ${c.projectContext.trim()}`);
    if (hasPrefs) lines.push(`Preferences: ${c.userPreferences.trim()}`);
    if (hasFacts) lines.push(`Key facts: ${c.keyFacts.join(" | ")}`);
    lines.push("</memory_core>");
    return lines.join("\n");
  }
  getRecallContextBlock(query, topK = 3) {
    const entries = this.searchRecall(query, topK);
    if (entries.length === 0) return "";
    const lines = ["<memory_recall>", ...entries.map((e) => e.content), "</memory_recall>"];
    return lines.join("\n");
  }
  async consolidate() {
    const cutoff = Date.now() - RECALL_DAYS_CONSOLIDATE * 24 * 60 * 60 * 1e3;
    const toArchival = this._data.recall.filter((e) => e.createdAt < cutoff);
    const keepRecall = this._data.recall.filter((e) => e.createdAt >= cutoff).slice(0, RECALL_AFTER_CONSOLIDATE);
    for (const e of toArchival) {
      this._data.archival.push(e);
    }
    if (this._data.archival.length > MAX_ARCHIVAL) {
      this._data.archival = this._data.archival.slice(-MAX_ARCHIVAL);
    }
    this._data.recall = keepRecall;
    this._scheduleSave();
  }
  /** For tool: search both tiers */
  searchMemory(query, tier, topK = 5) {
    const k = Math.min(topK, 20);
    if (tier === "recall") return this.searchRecall(query, k);
    if (tier === "archival") return this.searchArchival(query, k);
    const recall = this.searchRecall(query, k);
    const archival = this.searchArchival(query, k);
    const seen = new Set(recall.map((e) => e.id));
    for (const e of archival) {
      if (!seen.has(e.id) && recall.length < k) {
        recall.push(e);
        seen.add(e.id);
      }
    }
    return recall.slice(0, k);
  }
  /** Reset all memory (for clearMemory command). */
  async clearAll() {
    this._data = defaultData();
    this._dirty = true;
    await this.save();
  }
  getRecallCount() {
    return this._data.recall.length;
  }
  getArchivalCount() {
    return this._data.archival.length;
  }
};

// src/memory/skillStore.ts
var path8 = __toESM(require("path"));
var fs5 = __toESM(require("fs"));

// src/skills/builtinSkills.ts
var BUILTIN_SKILLS = [
  {
    id: "builtin:explain-code",
    name: "Explain Code",
    tags: ["explain", "understand"],
    description: "Step-by-step explanation of code logic",
    content: "When asked to explain code: describe what it does in plain English, identify the algorithm or pattern used, note any edge cases or gotchas, and suggest improvements if obvious.",
    createdAt: 0,
    useCount: 0
  },
  {
    id: "builtin:write-tests",
    name: "Write Tests",
    tags: ["test", "jest", "vitest", "unit"],
    description: "Generate unit tests for a function or module",
    content: "When writing tests: use the existing test framework in the project. Cover happy path, edge cases, and error cases. Mock external dependencies. Name tests descriptively using 'should...' pattern.",
    createdAt: 0,
    useCount: 0
  },
  {
    id: "builtin:fix-bug",
    name: "Fix Bug",
    tags: ["fix", "debug", "error", "bug"],
    description: "Diagnose and fix a bug in code",
    content: "When fixing bugs: first read the file, identify the root cause, explain what was wrong, make the minimal surgical fix using edit_file, then verify with get_diagnostics.",
    createdAt: 0,
    useCount: 0
  },
  {
    id: "builtin:code-review",
    name: "Code Review",
    tags: ["review", "quality", "best-practices"],
    description: "Review code for quality, bugs, and improvements",
    content: "When reviewing code: check for correctness, edge cases, performance issues, security concerns, readability. Give structured feedback: critical issues first, then suggestions.",
    createdAt: 0,
    useCount: 0
  },
  {
    id: "builtin:add-types",
    name: "Add TypeScript Types",
    tags: ["types", "typescript", "ts"],
    description: "Add or improve TypeScript type annotations",
    content: "When adding types: infer from usage context, prefer specific types over 'any', use generics where appropriate, add return types to all functions.",
    createdAt: 0,
    useCount: 0
  },
  {
    id: "builtin:git-summary",
    name: "Git Summary",
    tags: ["git", "summary", "commit", "log"],
    description: "Summarize git status and recent changes",
    content: "When summarizing git state: run git_status, git_log (last 10), git_diff. Present modified files grouped by type, summarize what changed and why based on commit messages.",
    createdAt: 0,
    useCount: 0
  },
  {
    id: "builtin:optimize-code",
    name: "Optimize Code",
    tags: ["optimize", "performance", "refactor"],
    description: "Improve code performance and readability",
    content: "When optimizing: identify bottlenecks first (don't premature optimize), suggest algorithmic improvements, reduce unnecessary allocations, simplify complex logic.",
    createdAt: 0,
    useCount: 0
  },
  {
    id: "builtin:add-docs",
    name: "Add Documentation",
    tags: ["docs", "jsdoc", "comments"],
    description: "Add JSDoc/TSDoc comments to functions and classes",
    content: "When adding docs: write JSDoc for every exported function/class/type. Include @param, @returns, @throws. Keep descriptions concise and accurate to the actual implementation.",
    createdAt: 0,
    useCount: 0
  }
];

// src/memory/skillStore.ts
var MAX_CONTENT = 2e3;
var SAVE_DEBOUNCE_MS2 = 1e3;
var STOPWORDS3 = /* @__PURE__ */ new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with"
]);
function tokenize2(text) {
  return text.toLowerCase().split(/\W+/).filter((t) => t.length > 1 && !STOPWORDS3.has(t));
}
function uuidLite2() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
var SkillStore = class {
  constructor(storageUri) {
    this._skills = [];
    this._dirty = false;
    this._storagePath = path8.join(storageUri.fsPath, "skills.json");
  }
  async init() {
    try {
      const dir = path8.dirname(this._storagePath);
      if (!fs5.existsSync(dir)) {
        fs5.mkdirSync(dir, { recursive: true });
      }
      if (fs5.existsSync(this._storagePath)) {
        const raw = fs5.readFileSync(this._storagePath, "utf8");
        const parsed = JSON.parse(raw);
        this._skills = Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      this._skills = [];
    }
  }
  _scheduleSave() {
    this._dirty = true;
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveTimer = void 0;
      this.save();
    }, SAVE_DEBOUNCE_MS2);
  }
  async save() {
    if (!this._dirty) return;
    this._dirty = false;
    try {
      const dir = path8.dirname(this._storagePath);
      if (!fs5.existsSync(dir)) {
        fs5.mkdirSync(dir, { recursive: true });
      }
      fs5.writeFileSync(this._storagePath, JSON.stringify(this._skills, null, 2), "utf8");
    } catch {
      this._dirty = true;
    }
  }
  async addSkill(name, description, content, tags = []) {
    const skill = {
      id: uuidLite2(),
      name: name.trim(),
      description: description.trim().slice(0, 500),
      content: content.trim().slice(0, MAX_CONTENT),
      tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()) : [],
      createdAt: Date.now(),
      useCount: 0
    };
    this._skills.push(skill);
    this._scheduleSave();
    return { ...skill };
  }
  async updateSkill(id, patch) {
    const idx = this._skills.findIndex((s) => s.id === id);
    if (idx === -1) return;
    if (patch.name !== void 0) this._skills[idx].name = String(patch.name).trim();
    if (patch.description !== void 0) this._skills[idx].description = String(patch.description).slice(0, 500);
    if (patch.content !== void 0) this._skills[idx].content = String(patch.content).slice(0, MAX_CONTENT);
    if (patch.tags !== void 0) this._skills[idx].tags = patch.tags.map((t) => String(t).trim());
    this._scheduleSave();
  }
  async deleteSkill(id) {
    this._skills = this._skills.filter((s) => s.id !== id);
    this._scheduleSave();
  }
  listSkills() {
    const builtin = BUILTIN_SKILLS.map((s) => ({ ...s, isBuiltin: true }));
    return [...builtin, ...this._skills.map((s) => ({ ...s }))];
  }
  listBuiltinSkills() {
    return BUILTIN_SKILLS.map((s) => ({ ...s, isBuiltin: true }));
  }
  getSkill(id) {
    const builtin = BUILTIN_SKILLS.find((s2) => s2.id === id);
    if (builtin) return { ...builtin, isBuiltin: true };
    const s = this._skills.find((s2) => s2.id === id);
    return s ? { ...s } : void 0;
  }
  findRelevant(query, topK = 2) {
    const tokens = new Set(tokenize2(query));
    const builtinWithFlag = BUILTIN_SKILLS.map((s) => ({ ...s, isBuiltin: true }));
    const combined = [...builtinWithFlag, ...this._skills];
    if (tokens.size === 0) {
      const fallback = combined.slice(0, topK);
      for (const s of fallback) {
        if (!s.isBuiltin) s.useCount = (s.useCount || 0) + 1;
      }
      if (fallback.some((s) => !s.isBuiltin)) this._scheduleSave();
      return fallback.map((s) => ({ ...s }));
    }
    const scored = combined.map((skill) => {
      const text = `${skill.description} ${skill.tags.join(" ")}`;
      const skillTokens = new Set(tokenize2(text));
      let score = 0;
      for (const t of tokens) {
        if (skillTokens.has(t)) score++;
      }
      return { skill, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const result = scored.slice(0, topK).filter((x) => x.score > 0).map((x) => x.skill);
    if (result.length > 0) {
      for (const s of result) {
        if (!s.isBuiltin) s.useCount = (s.useCount || 0) + 1;
      }
      this._scheduleSave();
    }
    return result.map((s) => ({ ...s }));
  }
  getSkillContextBlock(query) {
    const skills = this.findRelevant(query, 2);
    if (skills.length === 0) return "";
    const lines = ["<skills>"];
    for (const s of skills) {
      lines.push(`## Skill: ${s.name}`);
      lines.push(s.content);
    }
    lines.push("</skills>");
    return lines.join("\n");
  }
};

// src/actions/selectionActions.ts
var path9 = __toESM(require("path"));
function buildActionPrompt(kind, ctx) {
  const block = `

\`\`\`${ctx.language}
${ctx.code}
\`\`\``;
  const loc = `from ${ctx.filePath} (lines ${ctx.lineStart}-${ctx.lineEnd})`;
  switch (kind) {
    case "explain":
      return `Explain the following ${ctx.language} code ${loc}:${block}

Provide a clear, concise explanation of what it does, key design choices, and any potential issues.`;
    case "refactor":
      return `Refactor the following ${ctx.language} code ${loc} for readability, performance, and best practices:${block}

Show the refactored version and explain the key changes.`;
    case "fix":
      return `Find and fix bugs in the following ${ctx.language} code ${loc}:${block}

Identify each bug, explain why it's a bug, and provide the corrected code.`;
    case "add_tests":
      return `Write comprehensive unit tests for the following ${ctx.language} code ${loc}:${block}

Cover happy paths, edge cases, and error cases.`;
    case "add_docs":
      return `Add documentation comments to the following ${ctx.language} code ${loc}:${block}

Use the appropriate doc format for the language (JSDoc, docstrings, etc).`;
    default:
      return `Review the following ${ctx.language} code ${loc}:${block}`;
  }
}
function getSelectionContext(editor, workspaceRoot) {
  if (editor.selection.isEmpty) return null;
  const doc = editor.document;
  const selection = editor.selection;
  const code = doc.getText(selection);
  const filePath = path9.relative(workspaceRoot, doc.uri.fsPath);
  const lineStart = selection.start.line + 1;
  const lineEnd = selection.end.line + 1;
  return {
    code,
    language: doc.languageId,
    filePath,
    lineStart,
    lineEnd
  };
}

// src/actions/codeLensProvider.ts
var vscode13 = __toESM(require("vscode"));
var CODE_LANGS = /* @__PURE__ */ new Set([
  "typescript",
  "javascript",
  "typescriptreact",
  "javascriptreact",
  "python",
  "go",
  "rust",
  "java",
  "c",
  "cpp",
  "csharp",
  "php",
  "ruby",
  "swift",
  "kotlin",
  "scala",
  "lua",
  "r",
  "dart"
]);
function getDeclRegex(languageId) {
  const lang = languageId.toLowerCase();
  if (lang === "typescript" || lang === "javascript" || lang === "ts" || lang === "js") {
    return /^\s*(export\s+)?(async\s+)?function\s+\w+|^\s*(export\s+)?class\s+\w+/;
  }
  if (lang === "python" || lang === "py") {
    return /^\s*def\s+\w+|^\s*class\s+\w+/;
  }
  if (lang === "go") {
    return /^\s*func\s+\w+/;
  }
  if (lang === "rust" || lang === "rs") {
    return /^\s*(pub\s+)?fn\s+\w+|^\s*(pub\s+)?struct\s+\w+/;
  }
  if (CODE_LANGS.has(lang)) {
    return /^\s*(function|class|def|func|fn)\s+\w+/;
  }
  return null;
}
var OllamaCodeLensProvider = class {
  provideCodeLenses(document, _token) {
    const enabled = vscode13.workspace.getConfiguration("clawpilot").get("codeLensEnabled", true);
    if (!enabled) return [];
    const regex = getDeclRegex(document.languageId);
    if (!regex) return [];
    const lenses = [];
    const lines = document.getText().split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i] ?? "")) {
        const range = new vscode13.Range(i, 0, i, (lines[i] ?? "").length);
        lenses.push(
          new vscode13.CodeLens(range, {
            title: "$(claw) ClawPilot",
            command: "clawpilot.codeLensAction",
            arguments: [document.uri, i]
          })
        );
      }
    }
    return lenses;
  }
  resolveCodeLens(lens, _token) {
    return lens;
  }
};

// src/diagnostics/diagnosticActionProvider.ts
var vscode14 = __toESM(require("vscode"));
var OllamaDiagnosticActionProvider = class {
  static {
    this.providedCodeActionKinds = [vscode14.CodeActionKind.QuickFix];
  }
  provideCodeActions(document, range, context, _token) {
    const relevant = context.diagnostics.filter(
      (d) => d.severity === vscode14.DiagnosticSeverity.Error || d.severity === vscode14.DiagnosticSeverity.Warning
    );
    if (!relevant.length) return [];
    return relevant.map((diag) => {
      const severity = diag.severity === vscode14.DiagnosticSeverity.Error ? "error" : "warning";
      const action = new vscode14.CodeAction(
        `Fix ${severity} with ClawPilot: ${diag.message.slice(0, 60)}${diag.message.length > 60 ? "\u2026" : ""}`,
        vscode14.CodeActionKind.QuickFix
      );
      action.diagnostics = [diag];
      action.isPreferred = false;
      action.command = {
        command: "clawpilot.fixDiagnostic",
        title: "Fix with ClawPilot",
        arguments: [document, diag]
      };
      return action;
    });
  }
};

// src/diagnostics/diagnosticStatusBar.ts
var vscode15 = __toESM(require("vscode"));
var DiagnosticStatusBar = class {
  constructor(context) {
    this._item = vscode15.window.createStatusBarItem(
      vscode15.StatusBarAlignment.Left,
      90
    );
    this._item.command = "workbench.actions.view.problems";
    context.subscriptions.push(this._item);
    this._update();
    context.subscriptions.push(
      vscode15.languages.onDidChangeDiagnostics(() => this._update())
    );
    this._item.show();
  }
  _update() {
    let errors = 0;
    let warnings = 0;
    for (const [, diags] of vscode15.languages.getDiagnostics()) {
      for (const d of diags) {
        if (d.severity === vscode15.DiagnosticSeverity.Error) errors++;
        if (d.severity === vscode15.DiagnosticSeverity.Warning) warnings++;
      }
    }
    this._item.text = `$(error) ${errors}  $(warning) ${warnings}`;
    this._item.tooltip = `${errors} error(s), ${warnings} warning(s) \u2014 click to open Problems`;
    this._item.color = errors > 0 ? new vscode15.ThemeColor("statusBarItem.errorForeground") : warnings > 0 ? new vscode15.ThemeColor("statusBarItem.warningForeground") : void 0;
  }
};

// src/diagnostics/diagnosticPromptBuilder.ts
var vscode16 = __toESM(require("vscode"));
var path10 = __toESM(require("path"));
var CONTEXT_LINES2 = 10;
function buildDiagnosticPrompt(document, diag, workspaceRoot) {
  const filePath = path10.relative(workspaceRoot, document.uri.fsPath);
  const severity = diag.severity === vscode16.DiagnosticSeverity.Error ? "Error" : "Warning";
  const errorLine = diag.range.start.line;
  const startLine = Math.max(0, errorLine - CONTEXT_LINES2);
  const endLine = Math.min(document.lineCount - 1, errorLine + CONTEXT_LINES2);
  const contextRange = new vscode16.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
  const code = document.getText(contextRange);
  const source = diag.source ? ` [${diag.source}]` : "";
  const diagCode = diag.code ? ` (${typeof diag.code === "object" ? diag.code.value : diag.code})` : "";
  return `Fix the following ${severity.toLowerCase()} in ${filePath} at line ${errorLine + 1}:

**${severity}${source}${diagCode}:** ${diag.message}

Here is the surrounding code (lines ${startLine + 1}-${endLine + 1}):

\`\`\`${document.languageId}
${code}
\`\`\`

Provide the corrected code and a brief explanation of the fix.`;
}

// src/history/historyStore.ts
var fs6 = __toESM(require("fs"));
var path11 = __toESM(require("path"));
var INDEX_FILE = "session-index.json";
var MAX_MESSAGES_PER_SESSION = 200;
var MAX_SESSIONS = 20;
var HistoryStore = class {
  constructor(context) {
    this._storageDir = context.globalStorageUri.fsPath;
    fs6.mkdirSync(this._storageDir, { recursive: true });
    this._index = this._loadIndex();
  }
  // ── Index ────────────────────────────────────────────────
  _indexPath() {
    return path11.join(this._storageDir, INDEX_FILE);
  }
  _loadIndex() {
    try {
      const raw = fs6.readFileSync(this._indexPath(), "utf8");
      return JSON.parse(raw);
    } catch {
      return { sessions: [], activeSessionId: null };
    }
  }
  _saveIndex() {
    fs6.writeFileSync(this._indexPath(), JSON.stringify(this._index, null, 2), "utf8");
  }
  // ── Session file path ────────────────────────────────────
  _sessionPath(id) {
    return path11.join(this._storageDir, `session-${id}.json`);
  }
  // ── CRUD ─────────────────────────────────────────────────
  createSession(name) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const now = Date.now();
    const defaultName = `Session ${new Date(now).toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    })}`;
    const session = {
      id,
      name: name ?? defaultName,
      createdAt: now,
      updatedAt: now,
      messages: []
    };
    this._writeSession(session);
    this._index.sessions.unshift({ id, name: session.name, updatedAt: now });
    if (this._index.sessions.length > MAX_SESSIONS) {
      const removed = this._index.sessions.splice(MAX_SESSIONS);
      for (const r of removed) {
        try {
          fs6.unlinkSync(this._sessionPath(r.id));
        } catch {
        }
      }
    }
    this._index.activeSessionId = id;
    this._saveIndex();
    return session;
  }
  loadSession(id) {
    try {
      const raw = fs6.readFileSync(this._sessionPath(id), "utf8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  _writeSession(session) {
    fs6.writeFileSync(this._sessionPath(session.id), JSON.stringify(session, null, 2), "utf8");
  }
  appendMessage(sessionId, msg) {
    try {
      const session = this.loadSession(sessionId);
      if (!session) return;
      session.messages.push(msg);
      if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
        session.messages = session.messages.slice(session.messages.length - MAX_MESSAGES_PER_SESSION);
      }
      session.updatedAt = Date.now();
      this._writeSession(session);
      const entry = this._index.sessions.find((s) => s.id === sessionId);
      if (entry) {
        entry.updatedAt = session.updatedAt;
      }
      this._saveIndex();
    } catch {
    }
  }
  deleteSession(id) {
    try {
      fs6.unlinkSync(this._sessionPath(id));
    } catch {
    }
    this._index.sessions = this._index.sessions.filter((s) => s.id !== id);
    if (this._index.activeSessionId === id) {
      this._index.activeSessionId = this._index.sessions[0]?.id ?? null;
    }
    this._saveIndex();
  }
  renameSession(id, newName) {
    const session = this.loadSession(id);
    if (!session) return;
    session.name = newName;
    this._writeSession(session);
    const entry = this._index.sessions.find((s) => s.id === id);
    if (entry) entry.name = newName;
    this._saveIndex();
  }
  clearMessages(id) {
    const session = this.loadSession(id);
    if (!session) return;
    session.messages = [];
    session.updatedAt = Date.now();
    this._writeSession(session);
  }
  getIndex() {
    return this._index;
  }
  getActiveSessionId() {
    return this._index.activeSessionId;
  }
  setActiveSession(id) {
    this._index.activeSessionId = id;
    this._saveIndex();
  }
  // Returns active session, creating one if none exists
  getOrCreateActiveSession() {
    const id = this._index.activeSessionId;
    if (id) {
      const s = this.loadSession(id);
      if (s) return s;
    }
    return this.createSession();
  }
  exportSession(id) {
    const session = this.loadSession(id);
    if (!session) return "";
    const lines = [`# ${session.name}
`];
    for (const msg of session.messages) {
      const ts = new Date(msg.timestamp).toLocaleTimeString();
      lines.push(`**${msg.role === "user" ? "You" : "ClawPilot"}** (${ts}):

${msg.content}
`);
    }
    return lines.join("\n---\n\n");
  }
};

// src/git/gitStatusBar.ts
var vscode17 = __toESM(require("vscode"));
var GitStatusBar = class {
  constructor(context) {
    this._item = vscode17.window.createStatusBarItem(
      vscode17.StatusBarAlignment.Left,
      85
    );
    this._item.command = "clawpilot.askGitStatus";
    context.subscriptions.push(this._item);
    this._update();
    this._timer = setInterval(() => this._update(), 3e4);
    context.subscriptions.push(
      vscode17.workspace.onDidSaveTextDocument(() => this._update())
    );
    context.subscriptions.push({ dispose: () => {
      if (this._timer) clearInterval(this._timer);
    } });
    this._item.show();
  }
  _update() {
    const status = gitStatusParsed();
    const dirty = status.dirtyCount > 0 ? ` $(pencil)${status.dirtyCount}` : "";
    this._item.text = `$(git-branch) ${status.branch}${dirty}`;
    this._item.tooltip = status.dirtyCount > 0 ? `${status.dirtyCount} uncommitted change(s) \u2014 click to ask ClawPilot` : `Branch: ${status.branch} \u2014 click to ask ClawPilot`;
  }
};

// src/context/contextRegistry.ts
var ContextRegistry = class {
  constructor() {
    this._providers = [];
  }
  register(provider) {
    this._providers.push(provider);
  }
  /** Assemble context from providers; returns text and the list of source names that contributed. */
  async assemble(query, totalBudget) {
    const sorted = [...this._providers].sort((a, b) => b.priority - a.priority);
    const parts = [];
    const sources = [];
    let used = 0;
    for (const provider of sorted) {
      if (used >= totalBudget) break;
      const remaining = totalBudget - used;
      const tagOverhead = `<context_source name="${provider.name}">

</context_source>`.length;
      const maxRaw = Math.min(provider.maxChars, Math.max(0, remaining - tagOverhead));
      if (maxRaw <= 0) continue;
      try {
        let raw = await provider.getContext(query);
        if (!raw || !raw.trim()) continue;
        if (raw.length > maxRaw) {
          raw = raw.slice(0, maxRaw) + "\n... (truncated)";
        }
        const wrapped = `<context_source name="${provider.name}">
${raw}
</context_source>`;
        parts.push(wrapped);
        sources.push(provider.name);
        used += wrapped.length;
      } catch {
      }
    }
    return { text: parts.join("\n\n"), sources };
  }
};

// src/context/providers/activeFileProvider.ts
var vscode18 = __toESM(require("vscode"));
var MAX_CHARS = 3e3;
var LINES_AROUND = 150;
function createActiveFileProvider() {
  return {
    name: "activeFile",
    priority: 90,
    maxChars: MAX_CHARS,
    async getContext() {
      const editor = vscode18.window.activeTextEditor;
      if (!editor) return "";
      const doc = editor.document;
      const pos = editor.selection.active;
      const startLine = Math.max(0, pos.line - LINES_AROUND);
      const endLine = Math.min(doc.lineCount - 1, pos.line + LINES_AROUND);
      const range = new vscode18.Range(startLine, 0, endLine, doc.lineAt(endLine).text.length);
      let content = doc.getText(range);
      if (content.length > MAX_CHARS) {
        content = content.slice(0, MAX_CHARS) + "\n... (truncated)";
      }
      const relPath = vscode18.workspace.asRelativePath(doc.uri);
      return `File: ${relPath}
Language: ${doc.languageId}

${content}`;
    }
  };
}

// src/context/providers/selectionProvider.ts
var vscode19 = __toESM(require("vscode"));
function createSelectionProvider() {
  return {
    name: "selection",
    priority: 95,
    maxChars: 1e4,
    async getContext() {
      const editor = vscode19.window.activeTextEditor;
      if (!editor || editor.selection.isEmpty) return "";
      const text = editor.document.getText(editor.selection);
      const lang = editor.document.languageId;
      return `Selected code (${lang}):
\`\`\`${lang}
${text}
\`\`\``;
    }
  };
}

// src/context/providers/diagnosticsProvider.ts
var vscode20 = __toESM(require("vscode"));
function createDiagnosticsProvider() {
  return {
    name: "diagnostics",
    priority: 80,
    maxChars: 2e3,
    async getContext() {
      const lines = [];
      for (const [uri, diags] of vscode20.languages.getDiagnostics()) {
        const rel = vscode20.workspace.asRelativePath(uri);
        for (const d of diags) {
          if (d.severity === vscode20.DiagnosticSeverity.Error || d.severity === vscode20.DiagnosticSeverity.Warning) {
            const severity = d.severity === vscode20.DiagnosticSeverity.Error ? "Error" : "Warning";
            const line = d.range.start.line + 1;
            lines.push(`${severity} at ${rel}:${line} - ${d.message}`);
          }
        }
      }
      return lines.length ? lines.join("\n") : "";
    }
  };
}

// src/context/providers/gitDiffProvider.ts
var MAX_CHARS2 = 2e3;
function createGitDiffProvider() {
  return {
    name: "gitDiff",
    priority: 70,
    maxChars: MAX_CHARS2,
    async getContext() {
      const out = gitDiff({ staged: false });
      if (!out || out.startsWith("Error:")) return "";
      return out.length > MAX_CHARS2 ? out.slice(0, MAX_CHARS2) + "\n... (truncated)" : out;
    }
  };
}

// src/context/providers/workspaceRagProvider.ts
function createWorkspaceRagProvider(workspaceIndex2) {
  return {
    name: "workspaceRag",
    priority: 60,
    maxChars: 4e3,
    async getContext(query) {
      const chunks = await workspaceIndex2.query(query, 5);
      if (chunks.length === 0) return "";
      const lines = ["Relevant code from workspace:", ""];
      for (const c of chunks) {
        lines.push(`--- ${c.filePath} | ${c.type}: ${c.name} | lines ${c.startLine}-${c.endLine} ---`);
        lines.push(c.content);
        lines.push("");
      }
      return lines.join("\n").trim();
    }
  };
}

// src/context/providers/memoryProvider.ts
function createMemoryProvider(memoryStore2) {
  return {
    name: "memory",
    priority: 50,
    maxChars: 1500,
    async getContext(query) {
      const entries = memoryStore2.searchRecall(query, 3);
      if (entries.length === 0) return "";
      const lines = ["<memory_recall>", ...entries.map((e) => e.content), "</memory_recall>"];
      return lines.join("\n");
    }
  };
}

// src/context/providers/skillProvider.ts
function createSkillProvider(skillStore2) {
  return {
    name: "skill",
    priority: 85,
    maxChars: 2e3,
    async getContext(query) {
      const skills = skillStore2.findRelevant(query, 2);
      if (skills.length === 0) return "";
      const lines = ["<skills>"];
      for (const s of skills) {
        lines.push(`## Skill: ${s.name}`);
        lines.push(s.content);
      }
      lines.push("</skills>");
      return lines.join("\n");
    }
  };
}

// src/proxy/clawProxy.ts
var http = __toESM(require("http"));
var vscode21 = __toESM(require("vscode"));
var ClawProxy = class {
  constructor(client2) {
    this.client = client2;
    this.server = null;
    this.currentPort = null;
  }
  async start() {
    if (this.server) {
      return this.currentPort ?? 0;
    }
    const config = vscode21.workspace.getConfiguration("clawpilot");
    const port = config.get("proxyPort", 11435);
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch((err) => {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
        }
        res.end(JSON.stringify({ error: { message: err instanceof Error ? err.message : String(err) } }));
      });
    });
    await new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(port, () => {
        this.server.off("error", reject);
        resolve();
      });
    });
    this.currentPort = port;
    vscode21.window.setStatusBarMessage(`ClawPilot Proxy: listening on :${port}`, 5e3);
    return port;
  }
  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.currentPort = null;
    }
  }
  async handleRequest(req, res) {
    const url = req.url || "";
    const method = req.method || "GET";
    if (method === "POST" && url === "/v1/chat/completions") {
      await this.handleChatCompletions(req, res);
      return;
    }
    if (method === "POST" && url === "/v1/completions") {
      await this.handleCompletions(req, res);
      return;
    }
    if (method === "GET" && url === "/v1/models") {
      await this.handleModels(req, res);
      return;
    }
    if (method === "POST" && url === "/v1/models") {
      await this.handleModels(req, res);
      return;
    }
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: { message: "Not found" } }));
  }
  async readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf8") || "{}";
    return JSON.parse(raw);
  }
  toOllamaMessagesFromChat(body) {
    const msgs = Array.isArray(body.messages) ? body.messages : [];
    return msgs.map((m) => ({
      role: m.role,
      content: m.content
    }));
  }
  toOllamaMessagesFromCompletion(body) {
    const prompt = typeof body.prompt === "string" ? body.prompt : Array.isArray(body.prompt) ? body.prompt.join("\n") : "";
    return [{ role: "user", content: prompt }];
  }
  getModelFromBody(body) {
    const cfg = vscode21.workspace.getConfiguration("clawpilot");
    const fallback = cfg.get("model", "llama3");
    return typeof body.model === "string" && body.model.trim() ? body.model.trim() : fallback;
  }
  async handleChatCompletions(req, res) {
    const body = await this.readJsonBody(req);
    const model = this.getModelFromBody(body);
    const messages = this.toOllamaMessagesFromChat(body);
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    try {
      for await (const chunk of this.client.streamChat(messages, model)) {
        const payload = {
          choices: [
            {
              delta: { content: chunk }
            }
          ]
        };
        res.write(`data: ${JSON.stringify(payload)}

`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const payload = {
        error: { message }
      };
      res.write(`data: ${JSON.stringify(payload)}

`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
  async handleCompletions(req, res) {
    const body = await this.readJsonBody(req);
    const model = this.getModelFromBody(body);
    const messages = this.toOllamaMessagesFromCompletion(body);
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    try {
      for await (const chunk of this.client.streamChat(messages, model)) {
        const payload = {
          choices: [
            {
              delta: { content: chunk }
            }
          ]
        };
        res.write(`data: ${JSON.stringify(payload)}

`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const payload = {
        error: { message }
      };
      res.write(`data: ${JSON.stringify(payload)}

`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
  async handleModels(_req, res) {
    try {
      const models = await this.client.listModels();
      const data = models.map((m) => ({
        id: m.name,
        object: "model",
        created: m.modified_at ? Math.floor(new Date(m.modified_at).getTime() / 1e3) : 0,
        owned_by: this.client.providerType
      }));
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ object: "list", data }));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        error: { message: err instanceof Error ? err.message : String(err) }
      }));
    }
  }
};

// src/system/setupWizard.ts
var vscode23 = __toESM(require("vscode"));

// src/system/systemScanner.ts
var os = __toESM(require("os"));
var path12 = __toESM(require("path"));
var fs7 = __toESM(require("fs"));
var import_child_process4 = require("child_process");
var FETCH_TIMEOUT_MS = 2e3;
function fetchWithTimeout(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { signal: controller.signal }).then(async (res) => {
    clearTimeout(t);
    try {
      const json = await res.json();
      return { ok: res.ok, json };
    } catch {
      return { ok: res.ok };
    }
  }).catch(() => {
    clearTimeout(t);
    return { ok: false };
  });
}
function getGpuInfo() {
  const platform3 = os.platform();
  let out = "";
  let vramGB = null;
  try {
    if (platform3 === "win32") {
      out = (0, import_child_process4.execSync)("wmic path win32_VideoController get name,AdapterRAM", {
        encoding: "utf8",
        timeout: 5e3,
        windowsHide: true
      });
      const lines = out.split("\n").map((l) => l.trim()).filter(Boolean);
      const vramMatch = out.match(/AdapterRAM\s+(\d+)/);
      if (vramMatch) {
        const bytes = parseInt(vramMatch[1], 10);
        if (!isNaN(bytes) && bytes > 0) vramGB = bytes / 1024 ** 3;
      }
      return { lines: lines.filter((l) => l && l !== "Name" && l !== "AdapterRAM"), vramGB };
    }
    if (platform3 === "darwin") {
      out = (0, import_child_process4.execSync)("system_profiler SPDisplaysDataType", {
        encoding: "utf8",
        timeout: 1e4,
        maxBuffer: 1024 * 1024
      });
      const lines = out.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("Chipset") || l.startsWith("VRAM") || l.includes("Memory"));
      const vramLine = lines.find((l) => /VRAM|vram|Video.*Memory/i.test(l));
      if (vramLine) {
        const m = vramLine.match(/(\d+)\s*([MG]B)/i);
        if (m) vramGB = m[2].toUpperCase() === "GB" ? parseFloat(m[1]) : parseFloat(m[1]) / 1024;
      }
      return { lines: lines.slice(0, 10), vramGB };
    }
    if (platform3 === "linux") {
      out = (0, import_child_process4.execSync)("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader", {
        encoding: "utf8",
        timeout: 5e3
      });
      const lines = out.trim().split("\n").map((l) => l.trim()).filter(Boolean);
      const m = out.match(/(\d+)\s*MiB/);
      if (m) vramGB = parseInt(m[1], 10) / 1024;
      return { lines, vramGB };
    }
  } catch {
  }
  return { lines: [], vramGB: null };
}
function checkOllamaInstalled() {
  const platform3 = os.platform();
  const pathsToCheck = [];
  if (platform3 === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path12.join(process.env.USERPROFILE || "", "AppData", "Local");
    pathsToCheck.push(path12.join(localAppData, "Programs", "Ollama", "ollama.exe"));
  }
  if (platform3 === "darwin") {
    pathsToCheck.push("/usr/local/bin/ollama", "/opt/homebrew/bin/ollama");
    const home = process.env.HOME || "";
    if (home) pathsToCheck.push(path12.join(home, ".ollama", "ollama"));
  }
  if (platform3 === "linux") {
    pathsToCheck.push("/usr/local/bin/ollama", "/usr/bin/ollama");
    const home = process.env.HOME || "";
    if (home) pathsToCheck.push(path12.join(home, ".ollama", "ollama"));
  }
  for (const p of pathsToCheck) {
    try {
      if (fs7.existsSync(p)) return true;
    } catch {
    }
  }
  try {
    const r = (0, import_child_process4.spawnSync)("ollama", ["--version"], {
      encoding: "utf8",
      timeout: 3e3,
      shell: true,
      windowsHide: true
    });
    if (r.status === 0 || r.stdout?.trim() || r.stderr?.trim()) return true;
  } catch {
  }
  return false;
}
function getDiskFreeGB() {
  const platform3 = os.platform();
  try {
    if (platform3 === "win32") {
      const out = (0, import_child_process4.execSync)("wmic logicaldisk get size,freespace", {
        encoding: "utf8",
        timeout: 5e3,
        windowsHide: true
      });
      const lines = out.split("\n").filter((l) => l.trim());
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length >= 2) {
          const free = parseInt(parts[0], 10);
          if (!isNaN(free)) return free / 1024 ** 3;
        }
      }
    } else {
      const out = (0, import_child_process4.execSync)("df -k /", { encoding: "utf8", timeout: 5e3 });
      const m = out.match(/\d+\s+(\d+)\s+\d+\s+\d+%\s+/);
      if (m) return parseInt(m[1], 10) / 1024 ** 2;
    }
  } catch {
  }
  return 50;
}
async function scanSystem() {
  const platform3 = os.platform();
  const totalRamGB = os.totalmem() / 1e9;
  const cpuCores = os.cpus().length;
  const { lines: gpuInfo, vramGB } = getGpuInfo();
  const ollamaInstalled = checkOllamaInstalled();
  const [ollamaStatus, lmstudioStatus] = await Promise.all([
    fetchWithTimeout("http://localhost:11434/api/tags"),
    fetchWithTimeout("http://localhost:1234/v1/models")
  ]);
  const ollamaRunning = ollamaStatus.ok;
  const lmstudioRunning = lmstudioStatus.ok;
  let installedOllamaModels = [];
  if (ollamaRunning && ollamaStatus.json && typeof ollamaStatus.json === "object" && "models" in ollamaStatus.json) {
    const models = ollamaStatus.json.models ?? [];
    installedOllamaModels = models.map((m) => (m.name ?? "").trim()).filter(Boolean);
  }
  const diskFreeGB = getDiskFreeGB();
  return {
    platform: platform3,
    arch: os.arch(),
    totalRamGB,
    gpuInfo,
    vramGB,
    cpuCores,
    ollamaInstalled,
    ollamaRunning,
    lmstudioRunning,
    installedOllamaModels,
    diskFreeGB
  };
}

// src/system/modelRecommender.ts
var RECOMMENDABLE_MODELS = [
  { name: "qwen2.5-coder:32b", label: "Qwen2.5 Coder 32B", category: "code", sizeGB: 22, minRamGB: 24, minVramGB: 24 },
  { name: "qwen2.5-coder:14b", label: "Qwen2.5 Coder 14B", category: "code", sizeGB: 10, minRamGB: 16, minVramGB: 16 },
  { name: "deepseek-coder-v2", label: "DeepSeek Coder v2", category: "code", sizeGB: 12, minRamGB: 16, minVramGB: 16 },
  { name: "qwen2.5-coder:7b", label: "Qwen2.5 Coder 7B", category: "code", sizeGB: 5, minRamGB: 8, minVramGB: 8 },
  { name: "qwen2.5-coder:3b", label: "Qwen2.5 Coder 3B", category: "code", sizeGB: 2, minRamGB: 6, minVramGB: null },
  { name: "phi4", label: "Phi 4", category: "general", sizeGB: 2.5, minRamGB: 8, minVramGB: null },
  { name: "smollm2:1.7b", label: "SmolLM2 1.7B", category: "small", sizeGB: 1.2, minRamGB: 4, minVramGB: null },
  { name: "tinyllama", label: "TinyLlama", category: "small", sizeGB: 0.6, minRamGB: 2, minVramGB: null }
];
function isModelInstalled(modelName, installedList) {
  return installedList.some((i) => i === modelName || i.startsWith(modelName + "-") || i.startsWith(modelName + ":"));
}
function recommendModels(info) {
  const installed = info.installedOllamaModels;
  const ram = info.totalRamGB;
  const vram = info.vramGB ?? 0;
  const hasGpu = vram >= 4;
  const out = [];
  const recommendedNames = /* @__PURE__ */ new Set();
  const nameToSpec = new Map(RECOMMENDABLE_MODELS.map((m) => [m.name, m]));
  for (const m of RECOMMENDABLE_MODELS) {
    if (isModelInstalled(m.name, installed)) {
      out.push({
        ...m,
        recommended: out.filter((r) => r.recommended).length < 2,
        reason: "Already installed",
        alreadyInstalled: true
      });
      if (out[out.length - 1].recommended) recommendedNames.add(m.name);
    }
  }
  for (const name of installed) {
    if (RECOMMENDABLE_MODELS.some((m) => isModelInstalled(m.name, [name]))) continue;
    out.unshift({
      name,
      label: name,
      category: "general",
      sizeGB: 0,
      minRamGB: 4,
      minVramGB: null,
      recommended: false,
      reason: "Already installed",
      alreadyInstalled: true
    });
  }
  if (vram >= 24 && !recommendedNames.has("qwen2.5-coder:32b")) {
    recommendedNames.add("qwen2.5-coder:32b");
  } else if (vram >= 16 && !recommendedNames.size) {
    recommendedNames.add("qwen2.5-coder:14b");
    recommendedNames.add("deepseek-coder-v2");
  } else if (vram >= 8 && !recommendedNames.size) {
    recommendedNames.add("qwen2.5-coder:7b");
  }
  if (ram >= 16 && !hasGpu && !recommendedNames.has("qwen2.5-coder:7b")) {
    recommendedNames.add("qwen2.5-coder:7b");
  }
  if (ram >= 8 && recommendedNames.size < 2) {
    if (!recommendedNames.has("qwen2.5-coder:3b")) recommendedNames.add("qwen2.5-coder:3b");
    if (!recommendedNames.has("phi4")) recommendedNames.add("phi4");
  }
  if (ram < 8) {
    recommendedNames.add("smollm2:1.7b");
    recommendedNames.add("tinyllama");
  }
  if (recommendedNames.size === 0) {
    recommendedNames.add(ram >= 8 ? "qwen2.5-coder:7b" : "smollm2:1.7b");
  }
  const reasons = {
    "qwen2.5-coder:32b": "Best code model for 24GB+ VRAM",
    "qwen2.5-coder:14b": "Best code model for your 16GB+ VRAM",
    "deepseek-coder-v2": "Strong code model for 16GB+ VRAM",
    "qwen2.5-coder:7b": hasGpu ? "Best code model for your 8GB+ VRAM" : "Best code model for your 16GB RAM (CPU)",
    "qwen2.5-coder:3b": "Good balance of size and quality for 8GB RAM",
    "phi4": "Small but capable for 8GB RAM",
    "smollm2:1.7b": "Ultra-light for low RAM",
    "tinyllama": "Smallest option for very limited RAM"
  };
  for (const m of RECOMMENDABLE_MODELS) {
    if (out.some((r) => r.name === m.name)) continue;
    const fitsVram = m.minVramGB === null || vram >= m.minVramGB;
    const fitsRam = ram >= m.minRamGB;
    if (!fitsRam) continue;
    if (m.minVramGB !== null && !fitsVram) continue;
    const recommended = recommendedNames.has(m.name) && out.filter((r) => r.recommended).length < 2;
    out.push({
      ...m,
      recommended,
      reason: reasons[m.name] ?? `Requires ${m.minRamGB}GB RAM${m.minVramGB ? `, ${m.minVramGB}GB VRAM` : ""}`,
      alreadyInstalled: false
    });
  }
  out.sort((a, b) => {
    if (a.alreadyInstalled !== b.alreadyInstalled) return a.alreadyInstalled ? -1 : 1;
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    return a.sizeGB - b.sizeGB;
  });
  return out;
}

// src/system/setupWizard.ts
init_ollamaInstaller();

// src/webviews/setupPanel.ts
var vscode22 = __toESM(require("vscode"));
init_ollamaInstaller();
function getNonce2() {
  let t = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) t += possible.charAt(Math.floor(Math.random() * possible.length));
  return t;
}
function getHtml(extensionUri, nonce) {
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
          '<p class="meta">' + (r.sizeGB ? r.sizeGB + ' GB' : '') + ' \xB7 Min RAM: ' + r.minRamGB + ' GB' + (r.minVramGB ? ', VRAM: ' + r.minVramGB + ' GB' : '') + '</p>' +
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
function openSetupPanel(extensionUri, context) {
  const column = vscode22.window.activeTextEditor?.viewColumn ?? vscode22.ViewColumn.One;
  const panel = vscode22.window.createWebviewPanel(
    "clawpilot.setup",
    "ClawPilot Setup",
    column,
    {
      enableScripts: true,
      localResourceRoots: [extensionUri],
      retainContextWhenHidden: true
    }
  );
  panel.webview.html = getHtml(extensionUri, getNonce2());
  panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg.command === "scanSystem") {
      try {
        const info = await scanSystem();
        if (info.ollamaRunning && info.installedOllamaModels?.length > 0) {
          await context.globalState.update("clawpilot.onboardingComplete", true);
        }
        panel.webview.postMessage({ command: "systemInfo", data: info });
        const recs = recommendModels(info);
        panel.webview.postMessage({ command: "recommendations", data: recs });
      } catch (e) {
        panel.webview.postMessage({ command: "progress", message: `Scan failed: ${e instanceof Error ? e.message : String(e)}` });
      }
    }
    if (msg.command === "installOllama") {
      const logEl = (m) => panel.webview.postMessage({ command: "progress", message: m, phase: "ollama" });
      try {
        const { installOllama: doInstall } = await Promise.resolve().then(() => (init_ollamaInstaller(), ollamaInstaller_exports));
        await doInstall(logEl);
        logEl("Starting Ollama server...");
        const started = await startOllamaServer(logEl);
        if (started) {
          logEl("Done! Refreshing...");
          const info = await scanSystem();
          panel.webview.postMessage({ command: "systemInfo", data: info });
          panel.webview.postMessage({ command: "recommendations", data: recommendModels(info) });
        }
      } catch (e) {
        logEl(`Install failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (msg.command === "installModel" && msg.model) {
      const model = msg.model;
      const { spawn: spawn3 } = await import("child_process");
      const send = (m, p) => panel.webview.postMessage({ command: "progress", message: m, percent: p, phase: "model" });
      send(`Pulling ${model}...`, 0);
      const proc = spawn3("ollama", ["pull", model], { shell: true, windowsHide: true });
      let lastPercent = 0;
      proc.stdout?.on("data", (d) => {
        const line = d.toString();
        send(line.trim());
        const m = line.match(/(\d+)%/);
        if (m) lastPercent = Math.min(100, parseInt(m[1], 10));
      });
      proc.stderr?.on("data", (d) => send(d.toString().trim()));
      proc.on("close", async (code) => {
        if (code === 0) {
          send("", 100);
          const cfg = vscode22.workspace.getConfiguration("clawpilot");
          await cfg.update("model", model, vscode22.ConfigurationTarget.Global);
          await context.globalState.update("clawpilot.onboardingComplete", true);
          panel.webview.postMessage({ command: "done", model });
        } else {
          send(`Pull exited with code ${code}`);
        }
      });
    }
  });
  context.subscriptions.push(panel);
}

// src/system/setupWizard.ts
var SetupWizard = class {
  async run(context) {
    const config = vscode23.workspace.getConfiguration("clawpilot");
    const modelSet = config.get("model", "").trim().length > 0;
    await vscode23.window.withProgress(
      { location: vscode23.ProgressLocation.Notification, title: "ClawPilot: Scanning your system...", cancellable: false },
      async () => {
        const info = await scanSystem();
        if (!info.ollamaRunning && !info.lmstudioRunning) {
          const installed = await isOllamaInstalled();
          if (!installed) {
            const choice = await vscode23.window.showInformationMessage(
              "ClawPilot: No local AI server is running. Set up Ollama to get started.",
              "Set up local AI (recommended)",
              "Use API key instead",
              "Skip"
            );
            if (choice === "Set up local AI (recommended)") {
              await openSetupPanel(context.extensionUri, context);
            }
            context.globalState.update("clawpilot.setupRanOnce", true);
            return;
          }
          await startOllamaServer(() => {
          });
        }
        if (info.ollamaRunning && info.installedOllamaModels.length === 0) {
          if (!modelSet) {
            await openSetupPanel(context.extensionUri, context);
          }
          context.globalState.update("clawpilot.setupRanOnce", true);
          return;
        }
        if (info.ollamaRunning && info.installedOllamaModels.length > 0 && !modelSet) {
          const recs = recommendModels(info);
          const best = recs.find((r) => r.alreadyInstalled && r.recommended) ?? recs.find((r) => r.alreadyInstalled);
          const modelName = best?.name ?? info.installedOllamaModels[0];
          await config.update("model", modelName, vscode23.ConfigurationTarget.Global);
        }
        context.globalState.update("clawpilot.setupRanOnce", true);
      }
    );
  }
};

// src/webviews/apiKeyPanel.ts
var vscode24 = __toESM(require("vscode"));

// src/providers/apiKeyTester.ts
async function testApiKey(apiType, apiKey) {
  const key = (apiKey ?? "").trim();
  if (!key) return { ok: false, error: "No API key provided." };
  try {
    if (apiType === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 1,
          messages: [{ role: "user", content: "Hi" }]
        })
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, error: `${res.status}: ${t.slice(0, 200)}` };
      }
      return { ok: true };
    }
    if (apiType === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { "Authorization": `Bearer ${key}` }
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, error: `${res.status}: ${t.slice(0, 200)}` };
      }
      return { ok: true };
    }
    if (apiType === "google") {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(key)
      );
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, error: `${res.status}: ${t.slice(0, 200)}` };
      }
      return { ok: true };
    }
    return { ok: false, error: "Unknown API type." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

// src/webviews/apiKeyPanel.ts
function getNonce3() {
  let t = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) t += possible.charAt(Math.floor(Math.random() * possible.length));
  return t;
}
function getHtml2(extensionUri, nonce) {
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
function openApiKeyPanel(extensionUri, context) {
  const column = vscode24.window.activeTextEditor?.viewColumn ?? vscode24.ViewColumn.One;
  const panel = vscode24.window.createWebviewPanel(
    "clawpilot.apiKeys",
    "ClawPilot: API Keys",
    column,
    {
      enableScripts: true,
      localResourceRoots: [extensionUri],
      retainContextWhenHidden: true
    }
  );
  panel.webview.html = getHtml2(extensionUri, getNonce3());
  panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg.command === "loadKeyStatus") {
      const anthropic = !!await context.secrets.get(SECRET_KEY_IDS.anthropic);
      const openai = !!await context.secrets.get(SECRET_KEY_IDS.openai);
      const google = !!await context.secrets.get(SECRET_KEY_IDS.google);
      panel.webview.postMessage({ command: "keyStatus", anthropic, openai, google });
    }
    if (msg.command === "testKey" && msg.apiType && msg.apiKey !== void 0) {
      const result = await testApiKey(msg.apiType, msg.apiKey);
      panel.webview.postMessage({
        command: "testResult",
        apiType: msg.apiType,
        ok: result.ok,
        error: result.error
      });
    }
    if (msg.command === "saveKeys" && msg.keys) {
      const k = msg.keys;
      for (const api of ["anthropic", "openai", "google"]) {
        const val = k[api];
        const id = SECRET_KEY_IDS[api];
        if (val) await context.secrets.store(id, val);
        else await context.secrets.delete(id);
      }
      const anthropic = !!(k.anthropic && k.anthropic.length);
      const openai = !!(k.openai && k.openai.length);
      const google = !!(k.google && k.google.length);
      panel.webview.postMessage({ command: "saved", anthropic, openai, google });
    }
  });
  context.subscriptions.push(panel);
}

// src/extension.ts
var statusBarItem;
var chatProvider;
var workspaceIndex;
var memoryStore;
var skillStore;
var proxy;
var client;
async function activate(context) {
  try {
    client = await createProvider(context);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("API key") && msg.includes("Manage API Keys")) {
      vscode25.window.showWarningMessage(msg, "Open API Keys").then((choice) => {
        if (choice === "Open API Keys") openApiKeyPanel(context.extensionUri, context);
      });
      client = new OllamaClient();
    } else {
      throw e;
    }
  }
  workspaceIndex = new WorkspaceIndex();
  workspaceIndex.startWatching();
  context.subscriptions.push({ dispose: () => workspaceIndex.dispose() });
  memoryStore = new MemoryStore(context.globalStorageUri);
  skillStore = new SkillStore(context.globalStorageUri);
  await memoryStore.init();
  await skillStore.init();
  context.subscriptions.push({ dispose: () => {
    memoryStore.save();
  } });
  statusBarItem = vscode25.window.createStatusBarItem(vscode25.StatusBarAlignment.Right, 100);
  void updateStatusBar(client);
  statusBarItem.command = "clawpilot.openChat";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
  chatProvider = new ChatViewProvider(context.extensionUri, client, workspaceIndex, memoryStore, skillStore);
  context.subscriptions.push(
    vscode25.window.registerWebviewViewProvider(
      ChatViewProvider.viewType,
      chatProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );
  const historyStore = new HistoryStore(context);
  chatProvider.setHistoryStore(historyStore);
  const initialConfig = vscode25.workspace.getConfiguration("clawpilot");
  if (initialConfig.get("proxyEnabled", false)) {
    proxy = new ClawProxy(client);
    try {
      await proxy.start();
      context.subscriptions.push({ dispose: () => proxy?.stop() });
    } catch (err) {
      vscode25.window.showErrorMessage(
        `ClawPilot proxy failed to start: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  const contextRegistry = new ContextRegistry();
  contextRegistry.register(createSelectionProvider());
  contextRegistry.register(createActiveFileProvider());
  contextRegistry.register(createDiagnosticsProvider());
  contextRegistry.register(createSkillProvider(skillStore));
  contextRegistry.register(createGitDiffProvider());
  contextRegistry.register(createWorkspaceRagProvider(workspaceIndex));
  contextRegistry.register(createMemoryProvider(memoryStore));
  chatProvider.setContextRegistry(contextRegistry);
  const initialModel = vscode25.workspace.getConfiguration("clawpilot").get("model", "llama3");
  const completionProvider = new OllamaCompletionProvider(client, initialModel);
  context.subscriptions.push(
    vscode25.languages.registerInlineCompletionItemProvider(
      { pattern: "**" },
      completionProvider
    )
  );
  new CompletionStatusBar(context);
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.toggleCompletions", async () => {
      const cfg = vscode25.workspace.getConfiguration("clawpilot");
      const current = cfg.get("inlineCompletionsEnabled", true);
      await cfg.update("inlineCompletionsEnabled", !current, vscode25.ConfigurationTarget.Global);
      vscode25.window.showInformationMessage(
        `ClawPilot inline completions ${!current ? "enabled" : "disabled"}.`
      );
    })
  );
  context.subscriptions.push(
    vscode25.languages.registerCodeActionsProvider(
      "*",
      new OllamaDiagnosticActionProvider(),
      { providedCodeActionKinds: OllamaDiagnosticActionProvider.providedCodeActionKinds }
    )
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand(
      "clawpilot.fixDiagnostic",
      async (document, diag) => {
        const root = vscode25.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
        const prompt = buildDiagnosticPrompt(document, diag, root);
        await chatProvider.sendQuickAction(prompt);
      }
    )
  );
  new DiagnosticStatusBar(context);
  new GitStatusBar(context);
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.askGitStatus", async () => {
      await chatProvider.sendQuickAction(
        "Run git_status and git_log to summarise the current state of the repo. List modified files and the last 5 commits. Be concise."
      );
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.newSession", async () => {
      const name = await vscode25.window.showInputBox({
        prompt: "Session name (leave blank for default)",
        placeHolder: "My debugging session"
      });
      if (name === void 0) return;
      const session = historyStore.createSession(name || void 0);
      chatProvider.switchSession(session);
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.switchSession", async () => {
      const index = historyStore.getIndex();
      if (!index.sessions.length) {
        vscode25.window.showInformationMessage("No saved sessions.");
        return;
      }
      const items = index.sessions.map((s) => ({
        label: s.name,
        description: new Date(s.updatedAt).toLocaleString(),
        id: s.id
      }));
      const pick = await vscode25.window.showQuickPick(items, { placeHolder: "Select a session" });
      if (!pick) return;
      const session = historyStore.loadSession(pick.id);
      if (session) {
        historyStore.setActiveSession(pick.id);
        chatProvider.switchSession(session);
      }
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.clearSession", async () => {
      const id = historyStore.getActiveSessionId();
      if (!id) return;
      const confirm = await vscode25.window.showWarningMessage(
        "Clear all messages in this session?",
        "Yes",
        "Cancel"
      );
      if (confirm !== "Yes") return;
      historyStore.clearMessages(id);
      chatProvider.clearWebviewMessages();
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.exportSession", async () => {
      const id = historyStore.getActiveSessionId();
      if (!id) return;
      const md = historyStore.exportSession(id);
      const doc = await vscode25.workspace.openTextDocument({
        content: md,
        language: "markdown"
      });
      await vscode25.window.showTextDocument(doc);
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.openChat", () => {
      const model = vscode25.workspace.getConfiguration("clawpilot").get("model", "");
      if (!model.trim()) {
        openSetupPanel(context.extensionUri, context);
        return;
      }
      vscode25.commands.executeCommand("clawpilot.chatView.focus");
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.setup", () => {
      openSetupPanel(context.extensionUri, context);
    })
  );
  context.subscriptions.push(
    vscode25.languages.registerCodeLensProvider("*", new OllamaCodeLensProvider())
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.explain", async () => {
      const editor = vscode25.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const root = vscode25.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
      const ctx = getSelectionContext(editor, root);
      if (!ctx) {
        vscode25.window.showInformationMessage("Select some code first.");
        return;
      }
      const prompt = buildActionPrompt("explain", ctx);
      await chatProvider.sendQuickAction(prompt);
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.refactor", async () => {
      const editor = vscode25.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const root = vscode25.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
      const ctx = getSelectionContext(editor, root);
      if (!ctx) {
        vscode25.window.showInformationMessage("Select some code first.");
        return;
      }
      const prompt = buildActionPrompt("refactor", ctx);
      await chatProvider.sendQuickAction(prompt);
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.fix", async () => {
      const editor = vscode25.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const root = vscode25.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
      const ctx = getSelectionContext(editor, root);
      if (!ctx) {
        vscode25.window.showInformationMessage("Select some code first.");
        return;
      }
      const prompt = buildActionPrompt("fix", ctx);
      await chatProvider.sendQuickAction(prompt);
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.add_tests", async () => {
      const editor = vscode25.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const root = vscode25.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
      const ctx = getSelectionContext(editor, root);
      if (!ctx) {
        vscode25.window.showInformationMessage("Select some code first.");
        return;
      }
      const prompt = buildActionPrompt("add_tests", ctx);
      await chatProvider.sendQuickAction(prompt);
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.add_docs", async () => {
      const editor = vscode25.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const root = vscode25.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
      const ctx = getSelectionContext(editor, root);
      if (!ctx) {
        vscode25.window.showInformationMessage("Select some code first.");
        return;
      }
      const prompt = buildActionPrompt("add_docs", ctx);
      await chatProvider.sendQuickAction(prompt);
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.codeLensAction", async (uri, lineIndex) => {
      const doc = await vscode25.workspace.openTextDocument(uri);
      const lines = doc.getText().split(/\r?\n/);
      const startIndent = (lines[lineIndex] ?? "").match(/^(\s*)/)?.[1]?.length ?? 0;
      let blockEnd = lineIndex;
      const maxLook = Math.min(lineIndex + 80, lines.length);
      for (let i = lineIndex + 1; i < maxLook; i++) {
        const line = lines[i] ?? "";
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
          if (indent <= startIndent) {
            blockEnd = i - 1;
            break;
          }
        }
        blockEnd = i;
      }
      const endLine = Math.min(blockEnd, lines.length - 1);
      const endCol = (lines[endLine] ?? "").length;
      const range = new vscode25.Range(lineIndex, 0, endLine, endCol);
      const editor = await vscode25.window.showTextDocument(doc, { selection: range, preserveFocus: false });
      editor.revealRange(range);
      const root = vscode25.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
      const ctx = getSelectionContext(editor, root);
      if (!ctx) {
        return;
      }
      const items = [
        { label: "$(symbol-misc) Explain", detail: "explain" },
        { label: "$(tools) Refactor", detail: "refactor" },
        { label: "$(bug) Fix Bug", detail: "fix" },
        { label: "$(beaker) Add Tests", detail: "add_tests" },
        { label: "$(book) Add Docs", detail: "add_docs" }
      ];
      const picked = await vscode25.window.showQuickPick(items, { placeHolder: "ClawPilot: Choose action" });
      if (picked?.detail) {
        const prompt = buildActionPrompt(picked.detail, ctx);
        await chatProvider.sendQuickAction(prompt);
      }
    })
  );
  const codeActions = [
    ["clawpilot.explainCode", "/explain"],
    ["clawpilot.refactorCode", "/refactor"],
    ["clawpilot.fixCode", "/fix"],
    ["clawpilot.generateDocs", "/docs"],
    ["clawpilot.reviewCode", "/review"],
    ["clawpilot.optimizeCode", "/optimize"],
    ["clawpilot.writeTests", "/test"],
    ["clawpilot.addTypes", "/types"]
  ];
  for (const [cmd, slash] of codeActions) {
    context.subscriptions.push(
      vscode25.commands.registerCommand(cmd, () => runSlashOnSelection(slash))
    );
  }
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.editFile", async () => {
      const editor = vscode25.window.activeTextEditor;
      const input = await vscode25.window.showInputBox({
        prompt: "Describe the changes to make to this file",
        placeHolder: "e.g. Add error handling to all async functions"
      });
      if (!input) {
        return;
      }
      const code = editor ? editor.document.getText() : "";
      chatProvider.sendToChat(`/edit ${input}`, code);
      vscode25.commands.executeCommand("clawpilot.chatView.focus");
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.planFeature", async () => {
      const input = await vscode25.window.showInputBox({
        prompt: "Describe the feature to plan",
        placeHolder: "e.g. Add user authentication with JWT"
      });
      if (!input) {
        return;
      }
      chatProvider.sendToChat(`/plan ${input}`);
      vscode25.commands.executeCommand("clawpilot.chatView.focus");
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.runCommand", async () => {
      const input = await vscode25.window.showInputBox({
        prompt: "Terminal command to run",
        placeHolder: "e.g. npm test"
      });
      if (!input) {
        return;
      }
      chatProvider.sendToChat(`/run ${input}`);
      vscode25.commands.executeCommand("clawpilot.chatView.focus");
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.selectProvider", async () => {
      const local = ["ollama", "lmstudio", "llamafile", "vllm", "localai", "jan", "textgen-webui", "openai-compatible"];
      const items = [];
      local.forEach((type) => {
        items.push({ label: PROVIDER_DISPLAY_NAMES[type], detail: type });
      });
      items.push({ label: "Premium (API)", kind: vscode25.QuickPickItemKind.Separator });
      API_PROVIDER_TYPES.forEach((type) => {
        items.push({ label: PROVIDER_DISPLAY_NAMES[type], detail: type });
      });
      const picked = await vscode25.window.showQuickPick(items, {
        matchOnDescription: true,
        placeHolder: "Select LLM provider"
      });
      if (!picked?.detail) return;
      const chosen = picked.detail;
      const cfg = vscode25.workspace.getConfiguration("clawpilot");
      const previous = cfg.get("provider", "ollama");
      await cfg.update("provider", chosen, vscode25.ConfigurationTarget.Global);
      try {
        client = await createProvider(context);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("API key") && msg.includes("Manage API Keys")) {
          await cfg.update("provider", previous, vscode25.ConfigurationTarget.Global);
          vscode25.window.showWarningMessage(msg, "Open API Keys").then((choice) => {
            if (choice === "Open API Keys") openApiKeyPanel(context.extensionUri, context);
          });
          return;
        }
        await cfg.update("provider", previous, vscode25.ConfigurationTarget.Global);
        throw e;
      }
      chatProvider.setClient(client);
      completionProvider.setClient(client);
      await updateStatusBar(client);
      vscode25.window.showInformationMessage(`ClawPilot: Using ${client.displayName}.`);
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.manageApiKeys", () => {
      openApiKeyPanel(context.extensionUri, context);
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.doctor", async () => {
      await openDoctorPanel(context.extensionUri, client, workspaceIndex, memoryStore);
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.selectModel", async () => {
      client.refreshConfig();
      let installed = [];
      try {
        const models = await client.listModels();
        installed = models.map((m) => ({ name: m.name }));
      } catch {
      }
      const installedSet = new Set(installed.map((m) => m.name));
      const items = [
        ...installed.map((m) => ({
          label: `$(check) ${m.name}`,
          description: "Installed",
          detail: m.name
        }))
      ];
      if (client.pullModel) {
        items.push({
          label: "$(package) Available to pull",
          kind: vscode25.QuickPickItemKind.Separator
        });
        items.push(...KNOWN_MODELS.filter((m) => !installedSet.has(m.name)).map((m) => ({
          label: m.label,
          description: m.category,
          detail: m.name
        })));
      }
      const picked = await vscode25.window.showQuickPick(items, {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: client.pullModel ? "Select or pull a model" : "Select model"
      });
      if (picked?.detail) {
        const name = picked.detail;
        if (client.pullModel && !installedSet.has(name)) {
          await pullModelWithProgress(client, name);
        }
        await vscode25.workspace.getConfiguration("clawpilot").update("model", name, vscode25.ConfigurationTarget.Global);
        await updateStatusBar(client, name);
      }
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.clearMemory", async () => {
      const confirm = await vscode25.window.showWarningMessage(
        "Clear all agent memory (core, recall, archival)? This cannot be undone.",
        "Clear",
        "Cancel"
      );
      if (confirm === "Clear") {
        await memoryStore.clearAll();
        vscode25.window.showInformationMessage("ClawPilot: Memory cleared.");
      }
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.viewMemory", () => {
      vscode25.commands.executeCommand("clawpilot.chatView.focus");
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.reindexWorkspace", async () => {
      try {
        await vscode25.window.withProgress(
          {
            location: vscode25.ProgressLocation.Notification,
            title: "ClawPilot: Indexing workspace",
            cancellable: false
          },
          async (progress) => {
            await workspaceIndex.indexAll((message, fileCount) => {
              progress.report({ message: fileCount != null ? `${message} (${fileCount} files)` : message });
            });
          }
        );
        const st = workspaceIndex.status;
        vscode25.window.showInformationMessage(`ClawPilot: ${st.chunkCount} chunks indexed.`);
      } catch (err) {
        vscode25.window.showErrorMessage(`Re-index failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.pullModel", async () => {
      if (!client.pullModel) {
        vscode25.window.showInformationMessage("Pull model is only available for the Ollama provider.");
        return;
      }
      const items = KNOWN_MODELS.map((m) => ({
        label: m.label,
        description: m.category,
        detail: m.name
      }));
      const picked = await vscode25.window.showQuickPick(items, {
        matchOnDescription: true,
        placeHolder: "Select model to pull from registry"
      });
      if (!picked?.detail) {
        return;
      }
      const name = picked.detail;
      await pullModelWithProgress(client, name);
      await vscode25.workspace.getConfiguration("clawpilot").update("model", name, vscode25.ConfigurationTarget.Global);
      updateStatusBar(client, name);
    })
  );
  context.subscriptions.push(
    vscode25.commands.registerCommand("clawpilot.toggleProxy", async () => {
      const cfg = vscode25.workspace.getConfiguration("clawpilot");
      const enabled = cfg.get("proxyEnabled", false);
      if (enabled) {
        await cfg.update("proxyEnabled", false, vscode25.ConfigurationTarget.Global);
        proxy?.stop();
        proxy = void 0;
        vscode25.window.showInformationMessage("ClawPilot proxy disabled.");
        return;
      }
      await cfg.update("proxyEnabled", true, vscode25.ConfigurationTarget.Global);
      proxy?.stop();
      proxy = new ClawProxy(client);
      try {
        await proxy.start();
        context.subscriptions.push({ dispose: () => proxy?.stop() });
        vscode25.window.showInformationMessage("ClawPilot proxy enabled.");
      } catch (err) {
        vscode25.window.showErrorMessage(
          `Failed to start ClawPilot proxy: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );
  const ragEnabled = vscode25.workspace.getConfiguration("clawpilot").get("ragEnabled", true);
  if (ragEnabled && vscode25.workspace.workspaceFolders?.length) {
    void vscode25.window.withProgress(
      {
        location: vscode25.ProgressLocation.Window,
        title: "ClawPilot: Indexing workspace",
        cancellable: false
      },
      async (progress) => {
        try {
          await workspaceIndex.indexAll((message, fileCount) => {
            progress.report({ message: fileCount != null ? `Indexing... (${fileCount} files)` : message });
          });
        } catch {
        }
      }
    );
  }
  const autoDetect = initialConfig.get("autoDetectProvider", false);
  if (autoDetect) {
    const available = await client.isAvailable();
    if (!available) {
      const detected = await autoDetectProvider();
      if (detected) {
        client = detected;
        chatProvider.setClient(client);
        completionProvider.setClient(client);
        await updateStatusBar(client);
        vscode25.window.setStatusBarMessage(`ClawPilot: Auto-detected ${client.displayName}. Using it for this session.`, 8e3);
      }
    }
  }
  client.isAvailable().then(async (available) => {
    if (!available) {
      if (client.providerType === "ollama") {
        vscode25.window.showWarningMessage(
          "ClawPilot: Server not found. Install Ollama and run `ollama serve`.",
          "Get Ollama"
        ).then((choice) => {
          if (choice === "Get Ollama") {
            vscode25.env.openExternal(vscode25.Uri.parse("https://ollama.com"));
          }
        });
      } else {
        vscode25.window.showWarningMessage(
          `ClawPilot: ${client.displayName} not found at ${client.baseEndpoint}.`
        );
      }
    }
    const model = vscode25.workspace.getConfiguration("clawpilot").get("model", "");
    await updateStatusBar(client, model);
  });
  context.subscriptions.push(
    vscode25.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("clawpilot.model")) {
        const model = vscode25.workspace.getConfiguration("clawpilot").get("model", "");
        void updateStatusBar(client, model);
        completionProvider.updateModel(model || "llama3");
      }
      if (e.affectsConfiguration("clawpilot.provider")) {
        createProvider(context).then(async (p) => {
          client = p;
          chatProvider.setClient(client);
          completionProvider.setClient(client);
          await updateStatusBar(client);
        }).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("API key")) {
            vscode25.window.showWarningMessage(msg, "Open API Keys").then((choice) => {
              if (choice === "Open API Keys") openApiKeyPanel(context.extensionUri, context);
            });
          }
        });
      }
    })
  );
  void new SetupWizard().run(context);
}
function runSlashOnSelection(slash) {
  const editor = vscode25.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode25.window.showWarningMessage("Select some code first, then use this command.");
    return;
  }
  const code = editor.document.getText(editor.selection);
  chatProvider.sendToChat(slash, code);
  vscode25.commands.executeCommand("clawpilot.chatView.focus");
}
async function pullModelWithProgress(client2, name) {
  if (!client2.pullModel) return;
  try {
    await vscode25.window.withProgress(
      {
        location: vscode25.ProgressLocation.Notification,
        title: `Pulling ${name}`,
        cancellable: false
      },
      async (progress) => {
        await client2.pullModel(name, (status) => progress.report({ message: status }));
      }
    );
    vscode25.window.showInformationMessage(`ClawPilot: ${name} ready!`);
  } catch (err) {
    vscode25.window.showErrorMessage(`Pull failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
async function openDoctorPanel(extensionUri, client2, workspaceIndex2, memoryStore2) {
  const panel = vscode25.window.createWebviewPanel(
    "clawpilot.doctor",
    "ClawPilot: System Diagnostics",
    vscode25.ViewColumn.One,
    { enableScripts: false }
  );
  const cfg = vscode25.workspace.getConfiguration("clawpilot");
  const provider = cfg.get("provider", "ollama");
  const model = cfg.get("model", "");
  let sys;
  try {
    sys = await scanSystem();
  } catch (e) {
    sys = {
      platform: "win32",
      arch: "unknown",
      totalRamGB: 0,
      gpuInfo: [],
      vramGB: null,
      cpuCores: 0,
      ollamaInstalled: false,
      ollamaRunning: false,
      lmstudioRunning: false,
      installedOllamaModels: [],
      diskFreeGB: 0
    };
  }
  const providerOk = await client2.isAvailable();
  const idxStatus = workspaceIndex2.status;
  const recallCount = memoryStore2.getRecallCount();
  const archivalCount = memoryStore2.getArchivalCount();
  const suggestions = [];
  if (!providerOk) {
    if (provider === "ollama") {
      suggestions.push("Start Ollama: run `ollama serve` in a terminal, or use **ClawPilot: Setup** to install and start.");
    } else {
      suggestions.push(`Ensure ${client2.displayName} is running at ${client2.baseEndpoint}.`);
    }
  }
  if (providerOk && !model) {
    suggestions.push("Select a model via the chat header (provider badge) or **ClawPilot: Select Model**.");
  }
  if (provider === "ollama" && !sys.ollamaInstalled) {
    suggestions.push("Install Ollama: use **ClawPilot: Setup** or visit https://ollama.com");
  }
  if (idxStatus.chunkCount === 0 && !idxStatus.isIndexing) {
    suggestions.push("Index the workspace for better RAG: run **ClawPilot: Re-index Workspace**.");
  }
  function fmtSuggestion(s) {
    return escapeHtml3(s).replace(/\*\*(.*?)\*\*/g, (_, x) => "<strong>" + escapeHtml3(x) + "</strong>").replace(/`(.*?)`/g, (_, x) => "<code>" + escapeHtml3(x) + "</code>");
  }
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>ClawPilot Diagnostics</title></head>
<body style="font-family: var(--vscode-font-family); font-size: 13px; padding: 16px; color: var(--vscode-foreground);">
<h1 style="font-size: 18px;">ClawPilot System Diagnostics</h1>
<h2 style="font-size: 14px; margin-top: 16px;">Provider</h2>
<p><strong>Current:</strong> ${escapeHtml3(client2.displayName)}</p>
<p><strong>Status:</strong> ${providerOk ? "\u2713 Running" : "\u2717 Not available"}</p>
<p><strong>Model:</strong> ${escapeHtml3(model || "\u2014 not set")}</p>
<h2 style="font-size: 14px; margin-top: 16px;">System</h2>
<p><strong>Platform:</strong> ${escapeHtml3(sys.platform)} / ${escapeHtml3(sys.arch)}</p>
<p><strong>RAM:</strong> ${sys.totalRamGB.toFixed(1)} GB</p>
<p><strong>CPU cores:</strong> ${sys.cpuCores}</p>
${sys.vramGB != null ? `<p><strong>VRAM:</strong> ${sys.vramGB.toFixed(1)} GB</p>` : ""}
${sys.gpuInfo.length ? `<p><strong>GPU:</strong> ${escapeHtml3(sys.gpuInfo.slice(0, 3).join("; "))}</p>` : ""}
<p><strong>Disk free:</strong> ${sys.diskFreeGB.toFixed(0)} GB</p>
<h2 style="font-size: 14px; margin-top: 16px;">Ollama</h2>
<p><strong>Installed:</strong> ${sys.ollamaInstalled ? "Yes" : "No"}</p>
<p><strong>Running:</strong> ${sys.ollamaRunning ? "Yes" : "No"}</p>
${sys.installedOllamaModels.length ? `<p><strong>Models:</strong> ${escapeHtml3(sys.installedOllamaModels.join(", "))}</p>` : ""}
<h2 style="font-size: 14px; margin-top: 16px;">Workspace index</h2>
<p><strong>Chunks indexed:</strong> ${idxStatus.chunkCount}</p>
<p><strong>Status:</strong> ${idxStatus.isIndexing ? "Indexing\u2026" : idxStatus.chunkCount > 0 ? "Ready" : "Not indexed"}</p>
<h2 style="font-size: 14px; margin-top: 16px;">Memory store</h2>
<p><strong>Recall entries:</strong> ${recallCount}</p>
<p><strong>Archival entries:</strong> ${archivalCount}</p>
${suggestions.length ? `<h2 style="font-size: 14px; margin-top: 16px;">Suggestions</h2><ul>${suggestions.map((s) => `<li>${fmtSuggestion(s)}</li>`).join("")}</ul>` : ""}
</body>
</html>`;
  panel.webview.html = html;
}
function escapeHtml3(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
async function updateStatusBar(client2, model) {
  const cfg = vscode25.workspace.getConfiguration("clawpilot");
  const m = model ?? cfg.get("model", "");
  const isApi = API_PROVIDER_TYPES.includes(client2.providerType);
  const providerLabel = isApi ? `${client2.displayName} (API)` : client2.displayName;
  let icon = "$(primitive-dot)";
  let tooltip = "ClawPilot \u2014 click to open chat";
  try {
    const available = await client2.isAvailable();
    if (isApi) {
      icon = "$(cloud)";
      tooltip = available ? `ClawPilot \xB7 ${providerLabel} \xB7 ${m || "no model"}` : `ClawPilot \xB7 ${providerLabel} \xB7 not available`;
    } else {
      if (available && m) {
        icon = "$(pass)";
        tooltip = `ClawPilot \xB7 ${providerLabel} \xB7 ${m} \xB7 ready`;
      } else if (available) {
        icon = "$(warning)";
        tooltip = `ClawPilot \xB7 ${providerLabel} \xB7 no model selected`;
      } else {
        icon = "$(error)";
        tooltip = `ClawPilot \xB7 ${providerLabel} \xB7 not available`;
      }
    }
  } catch {
    icon = "$(error)";
    tooltip = `ClawPilot \xB7 ${providerLabel} \xB7 error`;
  }
  statusBarItem.text = m ? `$(claw) ${icon} [${providerLabel}]: ${m}` : `$(claw) ${icon} [${providerLabel}]`;
  statusBarItem.tooltip = tooltip;
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
