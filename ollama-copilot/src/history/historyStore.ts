import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface PersistedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;   // Date.now()
}

export interface ChatSession {
  id: string;          // uuid-style: Date.now().toString(36)
  name: string;        // user-visible name, default "Session YYYY-MM-DD HH:mm"
  createdAt: number;
  updatedAt: number;
  messages: PersistedMessage[];
}

export interface SessionIndex {
  sessions: Array<{ id: string; name: string; updatedAt: number }>;
  activeSessionId: string | null;
}

const INDEX_FILE = 'session-index.json';
const MAX_MESSAGES_PER_SESSION = 200;  // trim oldest when exceeded
const MAX_SESSIONS = 20;               // trim oldest when exceeded

export class HistoryStore {
  private _storageDir: string;
  private _index: SessionIndex;

  constructor(context: vscode.ExtensionContext) {
    this._storageDir = context.globalStorageUri.fsPath;
    fs.mkdirSync(this._storageDir, { recursive: true });
    this._index = this._loadIndex();
  }

  // ── Index ────────────────────────────────────────────────
  private _indexPath(): string { return path.join(this._storageDir, INDEX_FILE); }

  private _loadIndex(): SessionIndex {
    try {
      const raw = fs.readFileSync(this._indexPath(), 'utf8');
      return JSON.parse(raw) as SessionIndex;
    } catch {
      return { sessions: [], activeSessionId: null };
    }
  }

  private _saveIndex(): void {
    fs.writeFileSync(this._indexPath(), JSON.stringify(this._index, null, 2), 'utf8');
  }

  // ── Session file path ────────────────────────────────────
  private _sessionPath(id: string): string {
    return path.join(this._storageDir, `session-${id}.json`);
  }

  // ── CRUD ─────────────────────────────────────────────────
  createSession(name?: string): ChatSession {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const now = Date.now();
    const defaultName = `Session ${new Date(now).toLocaleString('en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    })}`;
    const session: ChatSession = {
      id, name: name ?? defaultName,
      createdAt: now, updatedAt: now, messages: []
    };
    this._writeSession(session);
    this._index.sessions.unshift({ id, name: session.name, updatedAt: now });
    // Trim to MAX_SESSIONS (delete oldest)
    if (this._index.sessions.length > MAX_SESSIONS) {
      const removed = this._index.sessions.splice(MAX_SESSIONS);
      for (const r of removed) {
        try { fs.unlinkSync(this._sessionPath(r.id)); } catch { /* ignore */ }
      }
    }
    this._index.activeSessionId = id;
    this._saveIndex();
    return session;
  }

  loadSession(id: string): ChatSession | null {
    try {
      const raw = fs.readFileSync(this._sessionPath(id), 'utf8');
      return JSON.parse(raw) as ChatSession;
    } catch { return null; }
  }

  private _writeSession(session: ChatSession): void {
    fs.writeFileSync(this._sessionPath(session.id), JSON.stringify(session, null, 2), 'utf8');
  }

  appendMessage(sessionId: string, msg: PersistedMessage): void {
    try {
      const session = this.loadSession(sessionId);
      if (!session) return;
      session.messages.push(msg);
      // Trim oldest if over limit
      if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
        session.messages = session.messages.slice(session.messages.length - MAX_MESSAGES_PER_SESSION);
      }
      session.updatedAt = Date.now();
      this._writeSession(session);
      // Update index entry
      const entry = this._index.sessions.find(s => s.id === sessionId);
      if (entry) { entry.updatedAt = session.updatedAt; }
      this._saveIndex();
    } catch {
      // Never throw — persist is best-effort
    }
  }

  deleteSession(id: string): void {
    try { fs.unlinkSync(this._sessionPath(id)); } catch { /* ignore */ }
    this._index.sessions = this._index.sessions.filter(s => s.id !== id);
    if (this._index.activeSessionId === id) {
      this._index.activeSessionId = this._index.sessions[0]?.id ?? null;
    }
    this._saveIndex();
  }

  renameSession(id: string, newName: string): void {
    const session = this.loadSession(id);
    if (!session) return;
    session.name = newName;
    this._writeSession(session);
    const entry = this._index.sessions.find(s => s.id === id);
    if (entry) entry.name = newName;
    this._saveIndex();
  }

  clearMessages(id: string): void {
    const session = this.loadSession(id);
    if (!session) return;
    session.messages = [];
    session.updatedAt = Date.now();
    this._writeSession(session);
  }

  getIndex(): SessionIndex { return this._index; }

  getActiveSessionId(): string | null { return this._index.activeSessionId; }

  setActiveSession(id: string): void {
    this._index.activeSessionId = id;
    this._saveIndex();
  }

  // Returns active session, creating one if none exists
  getOrCreateActiveSession(): ChatSession {
    const id = this._index.activeSessionId;
    if (id) {
      const s = this.loadSession(id);
      if (s) return s;
    }
    return this.createSession();
  }

  exportSession(id: string): string {
    const session = this.loadSession(id);
    if (!session) return '';
    const lines: string[] = [`# ${session.name}\n`];
    for (const msg of session.messages) {
      const ts = new Date(msg.timestamp).toLocaleTimeString();
      lines.push(`**${msg.role === 'user' ? 'You' : 'Ollama'}** (${ts}):\n\n${msg.content}\n`);
    }
    return lines.join('\n---\n\n');
  }
}
