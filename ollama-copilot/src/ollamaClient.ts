import * as vscode from 'vscode';

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest?: string;
  details?: { parent_model?: string; format?: string; family?: string; families?: string[]; parameter_size?: string; quant_level?: string };
}

export interface KnownModel {
  name: string;
  label: string;
  category: 'code' | 'general' | 'small';
}

export const KNOWN_MODELS: KnownModel[] = [
  // Code models
  { name: 'deepseek-coder:6.7b', label: 'DeepSeek Coder 6.7B', category: 'code' },
  { name: 'deepseek-coder:33b', label: 'DeepSeek Coder 33B', category: 'code' },
  { name: 'deepseek-coder-v2', label: 'DeepSeek Coder v2', category: 'code' },
  { name: 'codellama:7b', label: 'Code Llama 7B', category: 'code' },
  { name: 'codellama:13b', label: 'Code Llama 13B', category: 'code' },
  { name: 'codellama:34b', label: 'Code Llama 34B', category: 'code' },
  { name: 'starcoder2:3b', label: 'StarCoder2 3B', category: 'code' },
  { name: 'starcoder2:7b', label: 'StarCoder2 7B', category: 'code' },
  { name: 'qwen2.5-coder:7b', label: 'Qwen2.5 Coder 7B', category: 'code' },
  { name: 'qwen2.5-coder:14b', label: 'Qwen2.5 Coder 14B', category: 'code' },
  { name: 'qwen2.5-coder:32b', label: 'Qwen2.5 Coder 32B', category: 'code' },
  // General models
  { name: 'llama3.2:3b', label: 'Llama 3.2 3B', category: 'general' },
  { name: 'llama3.1:8b', label: 'Llama 3.1 8B', category: 'general' },
  { name: 'llama3.1:70b', label: 'Llama 3.1 70B', category: 'general' },
  { name: 'mistral:7b', label: 'Mistral 7B', category: 'general' },
  { name: 'mistral-nemo', label: 'Mistral Nemo', category: 'general' },
  { name: 'mixtral:8x7b', label: 'Mixtral 8x7B', category: 'general' },
  { name: 'gemma2:2b', label: 'Gemma 2 2B', category: 'general' },
  { name: 'gemma2:9b', label: 'Gemma 2 9B', category: 'general' },
  { name: 'phi3.5', label: 'Phi 3.5', category: 'general' },
  { name: 'phi4', label: 'Phi 4', category: 'general' },
  { name: 'qwen2.5:7b', label: 'Qwen2.5 7B', category: 'general' },
  { name: 'qwen2.5:14b', label: 'Qwen2.5 14B', category: 'general' },
  { name: 'qwen2.5:32b', label: 'Qwen2.5 32B', category: 'general' },
  // Small/fast models
  { name: 'tinyllama', label: 'TinyLlama', category: 'small' },
  { name: 'smollm2:135m', label: 'SmolLM2 135M', category: 'small' },
  { name: 'smollm2:360m', label: 'SmolLM2 360M', category: 'small' },
  { name: 'smollm2:1.7b', label: 'SmolLM2 1.7B', category: 'small' },
];

interface TagsResponse {
  models: OllamaModel[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  options?: { num_predict?: number };
}

interface GenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: { num_predict?: number };
}

interface PullRequest {
  name: string;
  stream: boolean;
}

const TIMEOUT_MS = 3000;

export class OllamaClient {
  private _config: vscode.WorkspaceConfiguration;

  constructor() {
    this._config = vscode.workspace.getConfiguration('ollamaCopilot');
  }

  private get endpoint(): string {
    const base = this._config.get<string>('endpoint', 'http://localhost:11434');
    return base.replace(/\/$/, '');
  }

  refreshConfig(): void {
    this._config = vscode.workspace.getConfiguration('ollamaCopilot');
  }

  async isAvailable(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this.endpoint}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      clearTimeout(timeout);
      return false;
    }
  }

  async listModels(): Promise<OllamaModel[]> {
    this.refreshConfig();
    const res = await fetch(`${this.endpoint}/api/tags`);
    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as TagsResponse;
    return data.models ?? [];
  }

  /** Models that support native Ollama tool calling via /api/chat tools field */
  static TOOL_CAPABLE_MODELS = [
    'llama3.1', 'llama3.2', 'llama3.3',
    'qwen2.5', 'qwen2.5-coder',
    'mistral-nemo', 'mistral-small',
    'command-r', 'command-r-plus',
    'firefunction-v2'
  ];

  static supportsNativeTools(modelName: string): boolean {
    const base = modelName.split(':')[0].toLowerCase();
    return OllamaClient.TOOL_CAPABLE_MODELS.some(m => base.includes(m));
  }

  async *streamChat(
    messages: ChatMessage[],
    model: string,
    maxTokens?: number
  ): AsyncGenerator<string> {
    const tokens = maxTokens ?? this._config.get<number>('maxTokens', 2048);
    this.refreshConfig();
    const body: ChatRequest = {
      model,
      messages,
      stream: true,
      options: { num_predict: tokens },
    };
    const res = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama chat error: ${res.status} ${text}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            const chunk = obj.message?.content;
            if (typeof chunk === 'string') yield chunk;
          } catch {
            // skip malformed lines
          }
        }
      }
      if (buffer.trim()) {
        try {
          const obj = JSON.parse(buffer);
          const chunk = obj.message?.content;
          if (typeof chunk === 'string') yield chunk;
        } catch {
          // skip
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async *streamGenerate(
    prompt: string,
    model: string,
    maxTokens: number,
    stopTokens?: string[]
  ): AsyncGenerator<string> {
    this.refreshConfig();
    const body: GenerateRequest = {
      model,
      prompt,
      stream: true,
      options: { num_predict: maxTokens },
    };
    const res = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama generate error: ${res.status} ${text}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let buffer = '';
    const stops = stopTokens?.length ? stopTokens : [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            const chunk = obj.response;
            if (typeof chunk === 'string') {
              let out = chunk;
              for (const stop of stops) {
                const idx = out.indexOf(stop);
                if (idx !== -1) out = out.slice(0, idx);
              }
              if (out) yield out;
            }
            if (obj.done) return;
          } catch {
            // skip
          }
        }
      }
      if (buffer.trim()) {
        try {
          const obj = JSON.parse(buffer);
          const chunk = obj.response;
          if (typeof chunk === 'string') yield chunk;
        } catch {
          // skip
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async pullModel(
    name: string,
    onProgress: (status: string) => void
  ): Promise<void> {
    this.refreshConfig();
    const body: PullRequest = { name, stream: true };
    const res = await fetch(`${this.endpoint}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama pull error: ${res.status} ${text}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.status) onProgress(obj.status);
          } catch {
            // skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
