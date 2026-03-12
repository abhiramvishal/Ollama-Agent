export interface ContextProvider {
  name: string;
  priority: number;
  maxChars: number;
  getContext(query: string): Promise<string>;
}

export class ContextRegistry {
  private _providers: ContextProvider[] = [];

  register(provider: ContextProvider): void {
    this._providers.push(provider);
  }

  async assemble(query: string, totalBudget: number): Promise<string> {
    const sorted = [...this._providers].sort((a, b) => b.priority - a.priority);
    const parts: string[] = [];
    let used = 0;

    for (const provider of sorted) {
      if (used >= totalBudget) break;
      const remaining = totalBudget - used;
      const tagOverhead = `<context_source name="${provider.name}">\n\n</context_source>`.length;
      const maxRaw = Math.min(provider.maxChars, Math.max(0, remaining - tagOverhead));
      if (maxRaw <= 0) continue;
      try {
        let raw = await provider.getContext(query);
        if (!raw || !raw.trim()) continue;
        if (raw.length > maxRaw) {
          raw = raw.slice(0, maxRaw) + '\n... (truncated)';
        }
        const wrapped = `<context_source name="${provider.name}">\n${raw}\n</context_source>`;
        parts.push(wrapped);
        used += wrapped.length;
      } catch {
        // Skip failed provider
      }
    }

    return parts.join('\n\n');
  }
}
