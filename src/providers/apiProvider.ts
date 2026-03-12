import type { LLMProvider, ProviderType, ChatMessage, ModelInfo } from './llmProvider';
import { PROVIDER_DISPLAY_NAMES } from './llmProvider';

export type ApiType = 'anthropic' | 'openai' | 'google';

const ANTHROPIC_MODELS: ModelInfo[] = [
  { name: 'claude-sonnet-4-5', modified_at: undefined },
  { name: 'claude-haiku-4-5', modified_at: undefined },
];
const OPENAI_MODELS: ModelInfo[] = [
  { name: 'gpt-4o', modified_at: undefined },
  { name: 'gpt-4o-mini', modified_at: undefined },
];
const GOOGLE_MODELS: ModelInfo[] = [
  { name: 'gemini-1.5-pro', modified_at: undefined },
  { name: 'gemini-1.5-flash', modified_at: undefined },
];

function apiTypeToProviderType(apiType: ApiType): ProviderType {
  return apiType;
}

export class ApiProvider implements LLMProvider {
  readonly providerType: ProviderType;
  readonly displayName: string;
  readonly baseEndpoint: string;
  private _apiType: ApiType;
  private _apiKey: string;

  constructor(apiType: ApiType, apiKey: string) {
    this._apiType = apiType;
    this._apiKey = apiKey;
    this.providerType = apiTypeToProviderType(apiType);
    this.displayName = PROVIDER_DISPLAY_NAMES[this.providerType];
    this.baseEndpoint = this._baseUrl();
  }

  private _baseUrl(): string {
    switch (this._apiType) {
      case 'anthropic': return 'https://api.anthropic.com';
      case 'openai': return 'https://api.openai.com';
      case 'google': return 'https://generativelanguage.googleapis.com';
      default: return '';
    }
  }

  refreshConfig(): void {
    // Key is passed at construction; no config refresh for key
  }

  async isAvailable(): Promise<boolean> {
    return !!this._apiKey?.trim();
  }

  async listModels(): Promise<ModelInfo[]> {
    switch (this._apiType) {
      case 'anthropic': return [...ANTHROPIC_MODELS];
      case 'openai': return [...OPENAI_MODELS];
      case 'google': return [...GOOGLE_MODELS];
      default: return [];
    }
  }

  async getBestAvailableModel(preferred: string): Promise<string> {
    const models = await this.listModels();
    if (models.some(m => m.name === preferred)) return preferred;
    if (models.length > 0) return models[0].name;
    return preferred;
  }

  async *streamChat(
    messages: ChatMessage[],
    model: string,
    maxTokens?: number
  ): AsyncGenerator<string> {
    const tokens = maxTokens ?? 2048;
    if (this._apiType === 'anthropic') {
      yield* this._streamAnthropic(messages, model, tokens);
      return;
    }
    if (this._apiType === 'openai') {
      yield* this._streamOpenAI(messages, model, tokens);
      return;
    }
    if (this._apiType === 'google') {
      yield* this._streamGoogle(messages, model, tokens);
      return;
    }
    throw new Error(`Unsupported API type: ${this._apiType}`);
  }

  private async *_streamAnthropic(
    messages: ChatMessage[],
    model: string,
    maxTokens: number
  ): AsyncGenerator<string> {
    const system = messages.find(m => m.role === 'system')?.content;
    const apiMessages = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages: apiMessages,
      stream: true,
    };
    if (system) body.system = system;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this._apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Anthropic error: ${res.status} ${t}`);
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const obj = JSON.parse(data) as { type?: string; delta?: { type?: string; text?: string } };
              if (obj.type === 'content_block_delta' && obj.delta?.text) yield obj.delta.text;
            } catch {
              // skip
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async *_streamOpenAI(
    messages: ChatMessage[],
    model: string,
    maxTokens: number
  ): AsyncGenerator<string> {
    const body = {
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      max_tokens: maxTokens,
    };
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this._apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OpenAI error: ${res.status} ${t}`);
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
              const obj = JSON.parse(trimmed.slice(6)) as { choices?: Array<{ delta?: { content?: string } }> };
              const content = obj.choices?.[0]?.delta?.content;
              if (typeof content === 'string') yield content;
            } catch {
              // skip
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async *_streamGoogle(
    messages: ChatMessage[],
    model: string,
    maxTokens: number
  ): AsyncGenerator<string> {
    const parts = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const body = {
      contents: parts,
      generationConfig: { maxOutputTokens: maxTokens },
    };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${encodeURIComponent(this._apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Google Gemini error: ${res.status} ${t}`);
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
        const chunks = buffer.split('\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          const trimmed = chunk.trim();
          if (!trimmed) continue;
          try {
            const obj = JSON.parse(trimmed) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
            const text = obj.candidates?.[0]?.content?.parts?.[0]?.text;
            if (typeof text === 'string') yield text;
          } catch {
            // skip
          }
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
    throw new Error(`All models failed. Tried: ${models.join(', ')}`);
  }

  async *streamGenerate(
    prompt: string,
    model: string,
    maxTokens: number,
    _stopTokens?: string[]
  ): AsyncGenerator<string> {
    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
    yield* this.streamChat(messages, model, maxTokens);
  }
}
