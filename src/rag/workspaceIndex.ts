import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CodeChunk, chunkFile, shouldIndexFile } from './codeChunker';
import { Embedder } from './embedder';

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with'
]);

export type IndexProgress = (message: string, fileCount?: number) => void;

export interface WorkspaceIndexStatus {
  isIndexed: boolean;
  isIndexing: boolean;
  chunkCount: number;
  lastIndexed: number;
}

/**
 * Orchestrates workspace indexing and RAG querying.
 * Index on first activation; watch file saves; query via embeddings or BM25 fallback.
 */
export class WorkspaceIndex {
  private _embedder: Embedder;
  private _chunks: CodeChunk[] = [];
  private _chunkById = new Map<string, CodeChunk>();
  private _lastIndexed = 0;
  private _indexing = false;
  private _tokenFreq: Map<string, Map<string, number>> = new Map(); // chunkId -> token -> count
  private _docFreq: Map<string, number> = new Map(); // token -> number of chunks containing it
  private _disposables: vscode.Disposable[] = [];

  constructor() {
    this._embedder = new Embedder();
  }

  get status(): WorkspaceIndexStatus {
    return {
      isIndexed: this._chunks.length > 0 && !this._indexing,
      isIndexing: this._indexing,
      chunkCount: this._chunks.length,
      lastIndexed: this._lastIndexed,
    };
  }

  /** Tokenize for BM25: split on non-alphanumeric, lowercase, drop stopwords. */
  private static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(t => t.length > 1 && !STOPWORDS.has(t));
  }

  private updateTokenStats(chunk: CodeChunk): void {
    const tokens = WorkspaceIndex.tokenize(chunk.content);
    const freq = new Map<string, number>();
    for (const t of tokens) {
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
    this._tokenFreq.set(chunk.id, freq);
    for (const t of freq.keys()) {
      this._docFreq.set(t, (this._docFreq.get(t) ?? 0) + 1);
    }
  }

  private removeTokenStats(chunkId: string): void {
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
  private bm25Score(chunk: CodeChunk, queryTokens: string[]): number {
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
  private async indexFile(
    filePath: string,
    content: string,
    language: string,
    embed: boolean
  ): Promise<void> {
    const normPath = path.normalize(filePath);
    const oldChunks = this._chunks.filter(c => path.normalize(c.filePath) === normPath);
    for (const c of oldChunks) {
      this.removeTokenStats(c.id);
      this._chunkById.delete(c.id);
    }
    this._chunks = this._chunks.filter(c => path.normalize(c.filePath) !== normPath);

    const chunks = chunkFile(filePath, content, language);
    for (const c of chunks) {
      this._chunks.push(c);
      this._chunkById.set(c.id, c);
      this.updateTokenStats(c);
    }
    if (embed) {
      try {
        await this._embedder.embedBatch(
          chunks.map(c => c.content),
          chunks.map(c => c.id)
        );
      } catch {
        // Fallback to BM25 only; no cache for this file
      }
    }
  }

  /** Index entire workspace (skip node_modules, .git, dist, out, *.min.js). */
  async indexAll(progress?: IndexProgress): Promise<void> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) {
      progress?.('No workspace folder open');
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
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(root, '**/*'),
        '{**/node_modules/**,**/.git/**,**/dist/**,**/out/**,**/*.min.js,**/build/**,**/.next/**}',
        5000
      );
      let indexed = 0;
      for (let i = 0; i < files.length; i++) {
        const uri = files[i];
        const rel = path.relative(root, uri.fsPath);
        if (!shouldIndexFile(rel)) continue;
        try {
          const content = fs.readFileSync(uri.fsPath, 'utf8');
          const ext = path.extname(uri.fsPath).replace(/^\./, '') || 'plaintext';
          const lang = ext;
          await this.indexFile(rel, content, lang, useEmbeddings);
          indexed++;
          if (progress && indexed % 10 === 0) {
            progress(`Indexing workspace... (${indexed} files)`, indexed);
          }
        } catch {
          // Skip binary or unreadable
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
  async indexFileOnSave(doc: vscode.TextDocument): Promise<void> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) return;
    const root = folders[0].uri.fsPath;
    const rel = path.relative(root, doc.uri.fsPath);
    if (!shouldIndexFile(rel)) return;
    const useEmbeddings = await this._embedder.isAvailable();
    try {
      await this.indexFile(rel, doc.getText(), doc.languageId, useEmbeddings);
    } catch {
      // Ignore
    }
  }

  /** Query: return top-K chunks by hybrid score (vector + BM25) or BM25 only. */
  async query(text: string, topK: number = 5): Promise<CodeChunk[]> {
    const k = Math.min(topK, this._chunks.length);
    if (k === 0) return [];

    const queryTokens = WorkspaceIndex.tokenize(text);
    const useEmbeddings = await this._embedder.isAvailable();
    const config = vscode.workspace.getConfiguration('clawpilot');
    const alpha = config.get<number>('ragHybridAlpha', 0.6);

    if (useEmbeddings) {
      try {
        const queryVec = await this._embedder.embed(text);
        const withBm25 = this._chunks.map(chunk => {
          const vec = this._embedder.getCached(chunk.id);
          const vectorScore = vec ? Embedder.dot(queryVec, vec) : 0;
          const bm25 = this.bm25Score(chunk, queryTokens);
          return { chunk, vectorScore, bm25Score: bm25 };
        });
        const maxBm25 = Math.max(1, ...withBm25.map(x => x.bm25Score));
        const scored = withBm25.map(({ chunk, vectorScore, bm25Score }) => {
          const normalizedBm25 = bm25Score / maxBm25;
          const hybridScore = alpha * vectorScore + (1 - alpha) * normalizedBm25;
          return { chunk, score: hybridScore };
        });
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, k).map(x => x.chunk);
      } catch {
        // Fallback to BM25 only
      }
    }

    const scored = this._chunks.map(chunk => ({
      chunk,
      score: this.bm25Score(chunk, queryTokens),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).filter(x => x.score > 0).map(x => x.chunk);
  }

  /** Formatted context string for prompt injection. */
  async getContext(query: string): Promise<string> {
    const config = vscode.workspace.getConfiguration('clawpilot');
    const topK = config.get<number>('ragTopK', 5);
    const enabled = config.get<boolean>('ragEnabled', true);
    if (!enabled || this._chunks.length === 0) return '';

    const chunks = await this.query(query, topK);
    if (chunks.length === 0) return '';

    const lines: string[] = [
      '<workspace_context>',
      'Relevant code from your workspace (retrieved by semantic search):',
      '',
    ];
    for (const c of chunks) {
      lines.push(`--- ${c.filePath} | ${c.type}: ${c.name} | lines ${c.startLine}-${c.endLine} ---`);
      lines.push(c.content);
      lines.push('');
    }
    lines.push('</workspace_context>');
    return lines.join('\n');
  }

  /** Register file watcher for re-index on save. */
  startWatching(): void {
    const sub = vscode.workspace.onDidSaveTextDocument(doc => {
      this.indexFileOnSave(doc).catch(() => {});
    });
    this._disposables.push(sub);
  }

  dispose(): void {
    for (const d of this._disposables) d.dispose();
    this._disposables = [];
  }
}
