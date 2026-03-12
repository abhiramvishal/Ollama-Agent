import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { BUILTIN_SKILLS } from '../skills/builtinSkills';

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
  createdAt: number;
  useCount: number;
  isBuiltin?: boolean;
}

const MAX_CONTENT = 2000;
const SAVE_DEBOUNCE_MS = 1000;

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

export class SkillStore {
  private _storagePath: string;
  private _skills: Skill[] = [];
  private _dirty = false;
  private _saveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(storageUri: vscode.Uri) {
    this._storagePath = path.join(storageUri.fsPath, 'skills.json');
  }

  async init(): Promise<void> {
    try {
      const dir = path.dirname(this._storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this._storagePath)) {
        const raw = fs.readFileSync(this._storagePath, 'utf8');
        const parsed = JSON.parse(raw);
        this._skills = Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      this._skills = [];
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
      fs.writeFileSync(this._storagePath, JSON.stringify(this._skills, null, 2), 'utf8');
    } catch {
      this._dirty = true;
    }
  }

  async addSkill(name: string, description: string, content: string, tags: string[] = []): Promise<Skill> {
    const skill: Skill = {
      id: uuidLite(),
      name: name.trim(),
      description: description.trim().slice(0, 500),
      content: content.trim().slice(0, MAX_CONTENT),
      tags: Array.isArray(tags) ? tags.map(t => String(t).trim()) : [],
      createdAt: Date.now(),
      useCount: 0,
    };
    this._skills.push(skill);
    this._scheduleSave();
    return { ...skill };
  }

  async updateSkill(id: string, patch: Partial<Skill>): Promise<void> {
    const idx = this._skills.findIndex(s => s.id === id);
    if (idx === -1) return;
    if (patch.name !== undefined) this._skills[idx].name = String(patch.name).trim();
    if (patch.description !== undefined) this._skills[idx].description = String(patch.description).slice(0, 500);
    if (patch.content !== undefined) this._skills[idx].content = String(patch.content).slice(0, MAX_CONTENT);
    if (patch.tags !== undefined) this._skills[idx].tags = patch.tags.map(t => String(t).trim());
    this._scheduleSave();
  }

  async deleteSkill(id: string): Promise<void> {
    this._skills = this._skills.filter(s => s.id !== id);
    this._scheduleSave();
  }

  listSkills(): Skill[] {
    const builtin = BUILTIN_SKILLS.map(s => ({ ...s, isBuiltin: true as boolean }));
    return [...builtin, ...this._skills.map(s => ({ ...s }))];
  }

  listBuiltinSkills(): Skill[] {
    return BUILTIN_SKILLS.map(s => ({ ...s, isBuiltin: true as boolean }));
  }

  getSkill(id: string): Skill | undefined {
    const builtin = BUILTIN_SKILLS.find(s => s.id === id);
    if (builtin) return { ...builtin, isBuiltin: true };
    const s = this._skills.find(s => s.id === id);
    return s ? { ...s } : undefined;
  }

  findRelevant(query: string, topK: number = 2): Skill[] {
    const tokens = new Set(tokenize(query));
    const builtinWithFlag = BUILTIN_SKILLS.map(s => ({ ...s, isBuiltin: true as boolean }));
    const combined = [...builtinWithFlag, ...this._skills];
    if (tokens.size === 0) {
      const fallback = combined.slice(0, topK);
      for (const s of fallback) {
        if (!s.isBuiltin) (s as { useCount: number }).useCount = ((s as { useCount: number }).useCount || 0) + 1;
      }
      if (fallback.some(s => !s.isBuiltin)) this._scheduleSave();
      return fallback.map(s => ({ ...s }));
    }
    const scored = combined.map(skill => {
      const text = `${skill.description} ${skill.tags.join(' ')}`;
      const skillTokens = new Set(tokenize(text));
      let score = 0;
      for (const t of tokens) {
        if (skillTokens.has(t)) score++;
      }
      return { skill, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const result = scored.slice(0, topK).filter(x => x.score > 0).map(x => x.skill);
    if (result.length > 0) {
      for (const s of result) {
        if (!s.isBuiltin) (s as { useCount: number }).useCount = ((s as { useCount: number }).useCount || 0) + 1;
      }
      this._scheduleSave();
    }
    return result.map(s => ({ ...s }));
  }

  getSkillContextBlock(query: string): string {
    // findRelevant now only returns genuine matches (score > 0), so empty = no injection
    const skills = this.findRelevant(query, 2);
    if (skills.length === 0) return '';
    const lines: string[] = ['<skills>'];
    for (const s of skills) {
      lines.push(`## Skill: ${s.name}`);
      lines.push(s.content);
    }
    lines.push('</skills>');
    return lines.join('\n');
  }
}
