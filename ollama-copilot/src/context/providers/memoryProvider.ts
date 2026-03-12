import type { MemoryStore } from '../../memory/memoryStore';
import type { ContextProvider } from '../contextRegistry';

export function createMemoryProvider(memoryStore: MemoryStore): ContextProvider {
  return {
    name: 'memory',
    priority: 50,
    maxChars: 1500,
    async getContext(query: string): Promise<string> {
      const entries = memoryStore.searchRecall(query, 3);
      if (entries.length === 0) return '';
      const lines = ['<memory_recall>', ...entries.map(e => e.content), '</memory_recall>'];
      return lines.join('\n');
    },
  };
}
