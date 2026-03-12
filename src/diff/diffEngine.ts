export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  lineNo?: number;
}

export interface FileDiff {
  path: string;
  oldContent: string;
  newContent: string;
  lines: DiffLine[];
  isNew: boolean;
}

const CONTEXT_LINES = 3;
const MAX_OUTPUT_LINES = 300;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Simple line-by-line diff with two pointers. Emit context for matches, remove for old-only, add for new-only.
 * Collapse unchanged runs to at most CONTEXT_LINES around changes.
 */
export function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);
  const n = oldLines.length;
  const m = newLines.length;
  const out: DiffLine[] = [];
  let i = 0, j = 0;
  let contextCount = 0;

  while (i < n || j < m) {
    if (i < n && j < m && oldLines[i] === newLines[j]) {
      if (contextCount < CONTEXT_LINES) {
        out.push({ type: 'context', content: oldLines[i] ?? '', lineNo: i + 1 });
        contextCount++;
      } else if (contextCount === CONTEXT_LINES) {
        out.push({ type: 'context', content: '...' });
        contextCount++;
      }
      i++;
      j++;
      continue;
    }

    contextCount = 0;
    if (i < n && j < m) {
      const nextOld = oldLines.indexOf(newLines[j]!, i + 1);
      const nextNew = newLines.indexOf(oldLines[i]!, j + 1);
      if (nextOld !== -1 && (nextNew === -1 || nextOld - i <= nextNew - j)) {
        while (i < nextOld) {
          out.push({ type: 'remove', content: oldLines[i] ?? '', lineNo: i + 1 });
          i++;
        }
        continue;
      }
      if (nextNew !== -1 && (nextOld === -1 || nextNew - j <= nextOld - i)) {
        while (j < nextNew) {
          out.push({ type: 'add', content: newLines[j] ?? '', lineNo: j + 1 });
          j++;
        }
        continue;
      }
    }

    if (i < n && j < m) {
      out.push({ type: 'remove', content: oldLines[i] ?? '', lineNo: i + 1 });
      out.push({ type: 'add', content: newLines[j] ?? '', lineNo: j + 1 });
      i++;
      j++;
    } else if (i < n) {
      out.push({ type: 'remove', content: oldLines[i] ?? '', lineNo: i + 1 });
      i++;
    } else {
      out.push({ type: 'add', content: newLines[j] ?? '', lineNo: j + 1 });
      j++;
    }
  }

  if (out.length > MAX_OUTPUT_LINES) {
    const truncated = out.slice(0, MAX_OUTPUT_LINES);
    truncated.push({ type: 'context', content: `... (${out.length - MAX_OUTPUT_LINES} more lines truncated)` });
    return truncated;
  }
  return out;
}

export function formatDiffHtml(diff: DiffLine[]): string {
  const maxLines = Math.min(diff.length, MAX_OUTPUT_LINES);
  const parts: string[] = [];
  for (let i = 0; i < maxLines; i++) {
    const line = diff[i]!;
    const cls = line.type === 'add' ? 'diff-add' : line.type === 'remove' ? 'diff-remove' : 'diff-context';
    const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
    parts.push(`<div class="diff-line ${cls}">${escapeHtml(prefix + ' ' + line.content)}</div>`);
  }
  if (diff.length > MAX_OUTPUT_LINES) {
    parts.push(`<div class="diff-line diff-context">... (${diff.length - MAX_OUTPUT_LINES} more lines)</div>`);
  }
  return parts.join('');
}
