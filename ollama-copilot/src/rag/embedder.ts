import * as vscode from 'vscode';

const BATCH_SIZE = 10;
const TIMEOUT_MS = 15000;

interface EmbedResponse {
  embeddings?: number[][];
  embedding?: number[];
}

/**
 * Generate embeddings via Ollama /api/embed.
 * Cache by chunk id. Vectors are normalized so similarity = dot product.
 */
export class Embedder {
  private _config: vscode.WorkspaceConfiguration;
  private _cache = new Map<string, number[]>();
  private _available: boolean | null = null;

  constructor() {
    this._config = vscode.workspace.getConfiguration('ollamaCopilot');
  }

  private get endpoint(): string {
    const base = this._config.get<string>('endpoint', 'http://localhost:11434');
    return base.replace(/\/$/, '');
  }

  private get model(): string {
    return this._config.get<string>('embeddingModel', 'nomic-embed-text');
  }

  refreshConfig(): void {
    this._config = vscode.workspace.getConfiguration('ollamaCopilot');
  }

  /** Check if embedding model is available (one-time probe, then cached). */
  async isAvailable(): Promise<boolean> {
    if (this._available !== null) return this._available;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${this.endpoint}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, input: 'test' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      this._available = res.ok;
      return this._available;
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this.endpoint}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, input: text }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Embed failed: ${res.status} ${t}`);
      }
      const data = (await res.json()) as EmbedResponse;
      const vec = data.embedding ?? data.embeddings?.[0];
      if (!Array.isArray(vec)) throw new Error('Invalid embed response');
      const normalized = Embedder.normalize(vec);
      if (cacheKey) this._cache.set(cacheKey, normalized);
      return normalized;
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
    for (let b = 0; b < toFetch.length; b += BATCH_SIZE) {
      const batch = toFetch.slice(b, b + BATCH_SIZE);
      const inputs = batch.map(x => x.text);
      this.refreshConfig();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS * 2);
      try {
        const res = await fetch(`${this.endpoint}/api/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: this.model, input: inputs }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`Embed batch failed: ${res.status} ${t}`);
        }
        const data = (await res.json()) as EmbedResponse;
        const vectors = data.embeddings ?? (data.embedding ? [data.embedding] : []);
        for (let j = 0; j < batch.length; j++) {
          const vec = vectors[j];
          if (!Array.isArray(vec)) throw new Error('Invalid embed batch response');
          const normalized = Embedder.normalize(vec);
          const id = batch[j].id;
          this._cache.set(id, normalized);
          results[batch[j].index] = normalized;
        }
      } finally {
        clearTimeout(timeout);
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
