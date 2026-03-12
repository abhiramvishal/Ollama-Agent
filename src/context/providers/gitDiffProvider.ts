import { gitDiff } from '../../git/gitClient';
import type { ContextProvider } from '../contextRegistry';

const MAX_CHARS = 2000;

export function createGitDiffProvider(): ContextProvider {
  return {
    name: 'gitDiff',
    priority: 70,
    maxChars: MAX_CHARS,
    async getContext(): Promise<string> {
      const out = gitDiff({ staged: false });
      if (!out || out.startsWith('Error:')) return '';
      return out.length > MAX_CHARS ? out.slice(0, MAX_CHARS) + '\n... (truncated)' : out;
    },
  };
}
