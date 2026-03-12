import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface MemoryEntry {
  id: string;
  content: string;
  source: 'user' | 'agent' | 'auto';
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  tags: string[];
}

export interface CoreMemory {
  projectContext: string;
  userPreferences: string;
  keyFacts: string[];
}

export interface MemoryStoreData {
  core: CoreMemory;
  recall: MemoryEntry[];
  archival: MemoryEntry[];
  version: number;
}

const MAX_RECALL = 200;
const MAX_ARCHIVAL = 1000;
const MAX_PROJECT_CONTEXT = 500;
const MAX_USER_PREFERENCES = 300;
const MAX_KEY_FACTS = 10;
const MAX_KEY_FACT_LEN = 100;
const SAVE_DEBOUNCE_MS = 2000;
const RECALL_DAYS_CONSOLIDATE = 7;
const RECALL_AFTER_CONSOLIDATE = 100;
const DECAY_LAMBDA = 0.05;  // decay rate per day

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

function uuidLite(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function defaultData(): MemoryStoreData {
  return {
    core: {
      projectContext: '',
      userPreferences: '',
      keyFacts: [],
    },
    recall: [],
    archival: [],
    version: 1,
  };
}

export class MemoryStore {
  private _storagePath: string;
  private _data: MemoryStoreData;
  private _dirty = false;
  private _saveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(storageUri: vscode.Uri) {
    this._storagePath = path.join(storageUri.fsPath, 'memory.json');
    this._data = defaultData();
  }

  async init(): Promise<void> {
    try {
      const dir = path.dirname(this._storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this._storagePath)) {
        const raw = fs.readFileSync(this._storagePath, 'utf8');
        const parsed = JSON.parse(raw) as MemoryStoreData;
        this._data = {
          core: {
            projectContext: String(parsed.core?.projectContext ?? '').slice(0, MAX_PROJECT_CONTEXT),
            userPreferences: String(parsed.core?.userPreferences ?? '').slice(0, MAX_USER_PREFERENCES),
            keyFacts: Array.isArray(parsed.core?.keyFacts)
              ? parsed.core.keyFacts.slice(0, MAX_KEY_FACTS).map((f: unknown) => String(f).slice(0, MAX_KEY_FACT_LEN))
              : [],
          },
          recall: Array.isArray(parsed.recall) ? parsed.recall.slice(0, MAX_RECALL) : [],
          archival: Array.isArray(parsed.archival) ? parsed.archival.slice(0, MAX_ARCHIVAL) : [],
          version: typeof parsed.version === 'number' ? parsed.version : 1,
        };
      }
      // Run consolidation once per session to move stale recall → archival
      await this.consolidate();
    } catch {
      this._data = defaultData();
    }
  }

  private _scheduleSave(): void {
    this._dirty = true;
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveTimer = undefined;
      this.save();
    }, SAVE_DEBOUNCE_MS);
  }

  async save(): Promise<void> {
    if (!this._dirty) return;
    this._dirty = false;
    try {
      const dir = path.dirname(this._storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this._storagePath, JSON.stringify(this._data, null, 2), 'utf8');
    } catch {
      this._dirty = true;
    }
  }

  getCoreMemory(): CoreMemory {
    return { ...this._data.core };
  }

  async updateCoreMemory(patch: Partial<CoreMemory>): Promise<void> {
    if (patch.projectContext !== undefined) {
      this._data.core.projectContext = String(patch.projectContext).slice(0, MAX_PROJECT_CONTEXT);
    }
    if (patch.userPreferences !== undefined) {
      this._data.core.userPreferences = String(patch.userPreferences).slice(0, MAX_USER_PREFERENCES);
    }
    if (patch.keyFacts !== undefined) {
      this._data.core.keyFacts = patch.keyFacts
        .slice(0, MAX_KEY_FACTS)
        .map(f => String(f).slice(0, MAX_KEY_FACT_LEN));
    }
    this._scheduleSave();
  }

  async addRecall(content: string, source: MemoryEntry['source'], tags: string[] = []): Promise<void> {
    const entry: MemoryEntry = {
      id: uuidLite(),
      content,
      source,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      tags: Array.isArray(tags) ? tags : [],
    };
    this._data.recall.unshift(entry);
    if (this._data.recall.length > MAX_RECALL) {
      this._data.recall = this._data.recall.slice(0, MAX_RECALL);
    }
    this._scheduleSave();
  }

  searchRecall(query: string, topK: number = 5): MemoryEntry[] {
    const tokens = tokenize(query);
    const now = Date.now();
    if (tokens.length === 0) {
      return this._data.recall.slice(0, topK);
    }
    const scored = this._data.recall.map(entry => {
      const entryTokens = new Set(tokenize(entry.content));
      let bm25Score = 0;
      for (const t of tokens) {
        if (entryTokens.has(t)) bm25Score++;
      }
      const lastAccess = entry.lastAccessedAt ?? entry.createdAt ?? now;
      const daysSinceAccess = (now - lastAccess) / (1000 * 60 * 60 * 24);
      const decayFactor = Math.exp(-DECAY_LAMBDA * daysSinceAccess);
      const accessBoost = (entry.accessCount ?? 0) * 0.1;
      const finalScore = bm25Score * decayFactor + accessBoost;
      return { entry, score: finalScore };
    });
    scored.sort((a, b) => b.score - a.score);
    const result = scored.slice(0, topK).filter(x => x.score > 0).map(x => x.entry);
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

  async addArchival(content: string, source: MemoryEntry['source'], tags: string[] = []): Promise<void> {
    const entry: MemoryEntry = {
      id: uuidLite(),
      content,
      source,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      tags: Array.isArray(tags) ? tags : [],
    };
    this._data.archival.push(entry);
    if (this._data.archival.length > MAX_ARCHIVAL) {
      this._data.archival = this._data.archival.slice(-MAX_ARCHIVAL);
    }
    this._scheduleSave();
  }

  searchArchival(query: string, topK: number = 5): MemoryEntry[] {
    const tokens = tokenize(query);
    const now = Date.now();
    if (tokens.length === 0) {
      return this._data.archival.slice(-topK).reverse();
    }
    const scored = this._data.archival.map(entry => {
      const entryTokens = new Set(tokenize(entry.content));
      let bm25Score = 0;
      for (const t of tokens) {
        if (entryTokens.has(t)) bm25Score++;
      }
      const lastAccess = entry.lastAccessedAt ?? entry.createdAt ?? now;
      const daysSinceAccess = (now - lastAccess) / (1000 * 60 * 60 * 24);
      const decayFactor = Math.exp(-DECAY_LAMBDA * daysSinceAccess);
      const accessBoost = (entry.accessCount ?? 0) * 0.1;
      const finalScore = bm25Score * decayFactor + accessBoost;
      return { entry, score: finalScore };
    });
    scored.sort((a, b) => b.score - a.score);
    const result = scored.slice(0, topK).filter(x => x.score > 0).map(x => x.entry);
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

  getCoreContextBlock(): string {
    const c = this._data.core;
    const hasProject = c.projectContext.trim().length > 0;
    const hasPrefs = c.userPreferences.trim().length > 0;
    const hasFacts = c.keyFacts.length > 0;
    if (!hasProject && !hasPrefs && !hasFacts) return '';
    const lines: string[] = ['<memory_core>'];
    if (hasProject) lines.push(`Project: ${c.projectContext.trim()}`);
    if (hasPrefs) lines.push(`Preferences: ${c.userPreferences.trim()}`);
    if (hasFacts) lines.push(`Key facts: ${c.keyFacts.join(' | ')}`);
    lines.push('</memory_core>');
    return lines.join('\n');
  }

  getRecallContextBlock(query: string, topK: number = 3): string {
    const entries = this.searchRecall(query, topK);
    if (entries.length === 0) return '';
    const lines = ['<memory_recall>', ...entries.map(e => e.content), '</memory_recall>'];
    return lines.join('\n');
  }

  async consolidate(): Promise<void> {
    const cutoff = Date.now() - RECALL_DAYS_CONSOLIDATE * 24 * 60 * 60 * 1000;
    const toArchival = this._data.recall.filter(e => e.createdAt < cutoff);
    const keepRecall = this._data.recall.filter(e => e.createdAt >= cutoff).slice(0, RECALL_AFTER_CONSOLIDATE);
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
  searchMemory(query: string, tier: 'recall' | 'archival' | 'both', topK: number = 5): MemoryEntry[] {
    const k = Math.min(topK, 20);
    if (tier === 'recall') return this.searchRecall(query, k);
    if (tier === 'archival') return this.searchArchival(query, k);
    const recall = this.searchRecall(query, k);
    const archival = this.searchArchival(query, k);
    const seen = new Set(recall.map(e => e.id));
    for (const e of archival) {
      if (!seen.has(e.id) && recall.length < k) {
        recall.push(e);
        seen.add(e.id);
      }
    }
    return recall.slice(0, k);
  }

  /** Reset all memory (for clearMemory command). */
  async clearAll(): Promise<void> {
    this._data = defaultData();
    this._dirty = true;
    await this.save();
  }

  getRecallCount(): number {
    return this._data.recall.length;
  }

  getArchivalCount(): number {
    return this._data.archival.length;
  }
}
