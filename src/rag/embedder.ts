import * as vscode from 'vscode';
import type { ProviderType } from '../providers/llmProvider';
import { API_PROVIDER_TYPES, PROVIDER_DEFAULT_PORTS } from '../providers/llmProvider';

const BATCH_SIZE = 10;
const TIMEOUT_MS = 15000;

interface EmbedResponse {
  embeddings?: number[][];
  embedding?: number[];
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

/**
 * Generate embeddings via Ollama /api/embed or OpenAI-compatible /v1/embeddings.
 * Cache by chunk id. Vectors are normalized so similarity = dot product.
 */
export class Embedder {
  private _config: vscode.WorkspaceConfiguration;
  private _cache = new Map<string, number[]>();
  private _available: boolean | null = null;

  constructor() {
    this._config = vscode.workspace.getConfiguration('clawpilot');
  }

  private get _provider(): ProviderType {
    return this._config.get<string>('provider', 'ollama') as ProviderType;
  }

  /** Cloud API providers (anthropic, openai, google) do not expose local /v1/embeddings; use Ollama endpoint. */
  private get _useOllamaForEmbedding(): boolean {
    const provider = this._provider;
    return provider === 'ollama' || API_PROVIDER_TYPES.includes(provider);
  }

  private get _endpoint(): string {
    const provider = this._provider;
    if (provider === 'ollama' || API_PROVIDER_TYPES.includes(provider)) {
      const base = this._config.get<string>('endpoint', 'http://localhost:11434');
      return base.replace(/\/$/, '');
    }
    const key = ENDPOINT_CONFIG_KEYS[provider] ?? 'endpoint';
    let base = this._config.get<string>(key, '');
    if (!base && key !== 'endpoint') base = this._config.get<string>('endpoint', '');
    if (!base) base = `http://localhost:${PROVIDER_DEFAULT_PORTS[provider]}`;
    return base.replace(/\/$/, '');
  }

  private get model(): string {
    return this._config.get<string>('embeddingModel', 'nomic-embed-text');
  }

  refreshConfig(): void {
    this._config = vscode.workspace.getConfiguration('clawpilot');
  }

  /** Check if embedding model is available (one-time probe, then cached). Tries Ollama and OpenAI formats. */
  async isAvailable(): Promise<boolean> {
    if (this._available !== null) return this._available;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const endpoint = this._endpoint;
    const useOpenAI = !this._useOllamaForEmbedding;
    try {
      if (useOpenAI) {
        const res = await fetch(`${endpoint}/v1/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: this.model, input: 'test' }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        this._available = res.ok;
      } else {
        const res = await fetch(`${endpoint}/api/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: this.model, input: 'test' }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        this._available = res.ok;
      }
      return this._available!;
    } catch {
      clearTimeout(timeout);
      this._available = false;
      return false;
    }
  }

  /** Reset availability cache (e.g. after pulling a model). */
  resetAvailability(): void {
    this._available = null;
  }

  /** Normalize vector to unit length. */
  private static normalize(v: number[]): number[] {
    let sum = 0;
    for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
    const norm = Math.sqrt(sum) || 1;
    return v.map(x => x / norm);
  }

  /** Dot product (assumes vectors are already normalized => cosine similarity). */
  static dot(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  /** Embed a single text. Returns normalized vector. Caches by optional cacheKey. */
  async embed(text: string, cacheKey?: string): Promise<number[]> {
    if (cacheKey && this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey)!;
    }
    this.refreshConfig();
    const useOpenAI = !this._useOllamaForEmbedding;
    const vec = useOpenAI
      ? await this._embedOpenAI([text], this.model).then(r => r[0])
      : await this._embedOllama([text], this.model).then(r => r[0]);
    const normalized = Embedder.normalize(vec);
    if (cacheKey) this._cache.set(cacheKey, normalized);
    return normalized;
  }

  private async _embedOllama(texts: string[], model: string): Promise<number[][]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this._endpoint}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: texts.length === 1 ? texts[0] : texts }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Embed failed: ${res.status} ${t}`);
      }
      const data = (await res.json()) as EmbedResponse;
      const vectors = data.embeddings ?? (data.embedding ? [data.embedding] : []);
      if (vectors.length !== texts.length) throw new Error('Invalid embed response');
      return vectors;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async _embedOpenAI(texts: string[], model: string): Promise<number[][]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this._endpoint}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: texts.length === 1 ? texts[0] : texts }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Embed failed: ${res.status} ${t}`);
      }
      const data = (await res.json()) as { data?: Array<{ embedding: number[] }> };
      const list = data.data ?? [];
      if (list.length !== texts.length) throw new Error('Invalid embed response');
      return list.map(d => d.embedding);
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Embed multiple texts in batches of BATCH_SIZE. Fills cache with chunkIds[i] -> vector. */
  async embedBatch(
    texts: string[],
    chunkIds: string[]
  ): Promise<number[][]> {
    const results: number[][] = [];
    const toFetch: { text: string; id: string; index: number }[] = [];
    for (let i = 0; i < texts.length; i++) {
      if (this._cache.has(chunkIds[i])) {
        results[i] = this._cache.get(chunkIds[i])!;
      } else {
        toFetch.push({ text: texts[i], id: chunkIds[i], index: i });
      }
    }
    this.refreshConfig();
    const useOpenAI = !this._useOllamaForEmbedding;
    const model = this.model;
    for (let b = 0; b < toFetch.length; b += BATCH_SIZE) {
      const batch = toFetch.slice(b, b + BATCH_SIZE);
      const inputs = batch.map(x => x.text);
      const vectors = useOpenAI
        ? await this._embedOpenAI(inputs, model)
        : await this._embedOllama(inputs, model);
      for (let j = 0; j < batch.length; j++) {
        const normalized = Embedder.normalize(vectors[j]);
        this._cache.set(batch[j].id, normalized);
        results[batch[j].index] = normalized;
      }
    }
    return results;
  }

  getCached(chunkId: string): number[] | undefined {
    return this._cache.get(chunkId);
  }

  clearCache(): void {
    this._cache.clear();
  }
}
