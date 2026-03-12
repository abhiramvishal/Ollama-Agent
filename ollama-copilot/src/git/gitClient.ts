import { execSync } from 'child_process';
import * as vscode from 'vscode';

const MAX_OUTPUT = 8000;

function getRoot(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

function run(cmd: string, cwd: string): string {
  try {
    const out = execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return out.length > MAX_OUTPUT ? out.slice(0, MAX_OUTPUT) + '\n... (truncated)' : out;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return `Error: ${msg.slice(0, 500)}`;
  }
}

export interface GitStatus {
  branch: string;
  dirtyCount: number;
  raw: string;
}

export function gitStatus(): string {
  const root = getRoot();
  if (!root) return 'Error: No workspace open.';
  return run('git status --short', root);
}

export function gitStatusParsed(): GitStatus {
  const root = getRoot();
  if (!root) return { branch: 'unknown', dirtyCount: 0, raw: '' };
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    const raw = execSync('git status --short', {
      cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    });
    const lines = raw.split('\n').filter(l => l.trim());
    return { branch, dirtyCount: lines.length, raw };
  } catch {
    return { branch: 'unknown', dirtyCount: 0, raw: '' };
  }
}

export function gitDiff(args: { staged?: boolean; file?: string }): string {
  const root = getRoot();
  if (!root) return 'Error: No workspace open.';
  const staged = args.staged ? '--staged' : '';
  const file = args.file ? `-- "${args.file}"` : '';
  return run(`git diff ${staged} ${file}`.trim(), root);
}

export function gitLog(args: { count?: number }): string {
  const root = getRoot();
  if (!root) return 'Error: No workspace open.';
  const n = Math.min(args.count ?? 10, 50);
  return run(`git log --oneline -${n}`, root);
}

export function gitCommit(args: { message: string; addAll?: boolean }): string {
  const root = getRoot();
  if (!root) return 'Error: No workspace open.';
  if (!args.message?.trim()) return 'Error: Commit message is required.';
  const msg = args.message.replace(/[`"$\\]/g, ' ').trim();
  if (args.addAll) {
    const addResult = run('git add -A', root);
    if (addResult.startsWith('Error:')) return addResult;
  }
  return run(`git commit -m "${msg}"`, root);
}

export function gitBranch(args: { create?: string }): string {
  const root = getRoot();
  if (!root) return 'Error: No workspace open.';
  if (args.create) {
    const name = args.create.replace(/[^a-zA-Z0-9/_.-]/g, '-');
    return run(`git checkout -b "${name}"`, root);
  }
  return run('git branch -a', root);
}

export function gitCheckout(args: { branch: string }): string {
  const root = getRoot();
  if (!root) return 'Error: No workspace open.';
  const name = args.branch.replace(/[^a-zA-Z0-9/_.-]/g, '-');
  return run(`git checkout "${name}"`, root);
}
