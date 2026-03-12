import * as vscode from 'vscode';
import type {
  LLMProvider,
  ProviderType,
  ChatMessage,
  ModelInfo,
} from './llmProvider';
import { PROVIDER_DEFAULT_PORTS, PROVIDER_DISPLAY_NAMES } from './llmProvider';

const TIMEOUT_MS = 3000;

/** OpenAI-style /v1/models response. */
interface OpenAIModelItem {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

interface OpenAIModelsResponse {
  object?: string;
  data?: OpenAIModelItem[];
}

/** OpenAI chat completions SSE: choices[0].delta.content */
interface OpenAIChatChunk {
  choices?: Array<{ delta?: { content?: string }; index?: number }>;
}

/** OpenAI completions SSE: choices[0].text (some servers use .delta.content for compatibility). */
interface OpenAICompletionChunk {
  choices?: Array<{ text?: string; delta?: { content?: string }; index?: number }>;
}

const ENDPOINT_CONFIG_KEYS: Partial<Record<ProviderType, string>> = {
  lmstudio: 'lmstudioEndpoint',
  llamafile: 'llamafileEndpoint',
  vllm: 'vllmEndpoint',
  localai: 'localaiEndpoint',
  jan: 'janEndpoint',
  'textgen-webui': 'textgenEndpoint',
  'openai-compatible': 'endpoint',
};

export class OpenAICompatibleProvider implements LLMProvider {
  readonly providerType: ProviderType;
  readonly displayName: string;
  private _config: vscode.WorkspaceConfiguration;

  constructor(providerType: ProviderType) {
    this.providerType = providerType;
    this.displayName = PROVIDER_DISPLAY_NAMES[providerType];
    this._config = vscode.workspace.getConfiguration('clawpilot');
  }

  get baseEndpoint(): string {
    this._config = vscode.workspace.getConfiguration('clawpilot');
    const key = ENDPOINT_CONFIG_KEYS[this.providerType] ?? 'endpoint';
    let base = this._config.get<string>(key, '');
    if (!base && key !== 'endpoint') {
      base = this._config.get<string>('endpoint', '');
    }
    if (!base) {
      const port = PROVIDER_DEFAULT_PORTS[this.providerType];
      base = `http://localhost:${port}`;
    }
    return base.replace(/\/$/, '');
  }

  refreshConfig(): void {
    this._config = vscode.workspace.getConfiguration('clawpilot');
  }

  async isAvailable(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseEndpoint}/v1/models`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      clearTimeout(timeout);
      return false;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    this.refreshConfig();
    const res = await fetch(`${this.baseEndpoint}/v1/models`);
    if (!res.ok) {
      throw new Error(`Models API error: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as OpenAIModelsResponse;
    const list = data.data ?? [];
    return list.map((m: OpenAIModelItem) => ({
      name: m.id,
      modified_at: m.created != null ? new Date(m.created * 1000).toISOString() : undefined,
    }));
  }

  async getBestAvailableModel(preferred: string): Promise<string> {
    try {
      const models = await this.listModels();
      if (models.some(m => m.name === preferred)) {
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

  async *streamChat(
    messages: ChatMessage[],
    model: string,
    maxTokens?: number
  ): AsyncGenerator<string> {
    const tokens = maxTokens ?? this._config.get<number>('maxTokens', 2048);
    this.refreshConfig();
    const body = {
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      max_tokens: tokens,
    };
    const res = await fetch(`${this.baseEndpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Chat error: ${res.status} ${text}`);
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
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const obj = JSON.parse(trimmed.slice(6)) as OpenAIChatChunk;
              const content = obj.choices?.[0]?.delta?.content;
              if (typeof content === 'string') yield content;
            } catch {
              // skip malformed
            }
          }
        }
      }
      if (buffer.trim() && buffer.trim() !== 'data: [DONE]' && buffer.startsWith('data: ')) {
        try {
          const obj = JSON.parse(buffer.trim().slice(6)) as OpenAIChatChunk;
          const content = obj.choices?.[0]?.delta?.content;
          if (typeof content === 'string') yield content;
        } catch {
          // skip
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async *streamChatWithFallback(
    messages: ChatMessage[],
    primaryModel: string,
    fallbackModels: string[],
    maxTokens?: number
  ): AsyncGenerator<string> {
    const tried: string[] = [];
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
    throw new Error(`All models failed. Tried: ${tried.join(', ')}`);
  }

  async *streamGenerate(
    prompt: string,
    model: string,
    maxTokens: number,
    stopTokens?: string[]
  ): AsyncGenerator<string> {
    this.refreshConfig();
    const body = {
      model,
      prompt,
      stream: true,
      max_tokens: maxTokens,
    };
    let res = await fetch(`${this.baseEndpoint}/v1/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 404) {
      // Fallback to chat completions
      const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
      yield* this.streamChat(messages, model, maxTokens);
      return;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Completions error: ${res.status} ${text}`);
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
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const obj = JSON.parse(trimmed.slice(6)) as OpenAICompletionChunk;
              const choice = obj.choices?.[0];
              const chunk = choice?.text ?? choice?.delta?.content;
              if (typeof chunk === 'string') {
                let out = chunk;
                for (const stop of stops) {
                  const idx = out.indexOf(stop);
                  if (idx !== -1) out = out.slice(0, idx);
                }
                if (out) yield out;
              }
            } catch {
              // skip
            }
          }
        }
      }
      if (buffer.trim() && buffer.trim() !== 'data: [DONE]' && buffer.startsWith('data: ')) {
        try {
          const obj = JSON.parse(buffer.trim().slice(6)) as OpenAICompletionChunk;
          const choice = obj.choices?.[0];
          const chunk = choice?.text ?? choice?.delta?.content;
          if (typeof chunk === 'string') yield chunk;
        } catch {
          // skip
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
