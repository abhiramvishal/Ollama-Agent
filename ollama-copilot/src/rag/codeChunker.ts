import * as path from 'path';

export type ChunkType = 'function' | 'class' | 'method' | 'block' | 'file';

export interface CodeChunk {
  id: string;
  filePath: string;
  language: string;
  startLine: number;
  endLine: number;
  name: string;
  content: string;
  type: ChunkType;
}

const MIN_CHUNK_LINES = 5;
const MAX_CHUNK_LINES = 80;
const FALLBACK_WINDOW = 40;
const FALLBACK_OVERLAP = 10;

/** Languages we do semantic (regex) chunking for */
const SEMANTIC_LANGS = new Set([
  'typescript', 'javascript', 'ts', 'js', 'python', 'py', 'go', 'rust', 'rs',
  'java', 'c', 'cpp', 'csharp', 'cs', 'css', 'html', 'htm'
]);

/** Skip indexing these path segments */
const SKIP_DIRS = ['node_modules', '.git', 'dist', 'out', 'build', '.next'];
const SKIP_FILES = /\.min\.(js|css)$/i;

export function shouldIndexFile(relativePath: string): boolean {
  const parts = relativePath.split(/[/\\]/);
  if (parts.some(p => SKIP_DIRS.includes(p))) return false;
  if (SKIP_FILES.test(relativePath)) return false;
  return true;
}

/**
 * Regex-based AST-lite: find start line of declarations.
 * Returns [{ type, name, startLine }]. Caller must resolve endLine from next start or EOF.
 */
function findDeclarations(content: string, language: string): Array<{ type: ChunkType; name: string; startLine: number }> {
  const lines = content.split('\n');
  const decls: Array<{ type: ChunkType; name: string; startLine: number }> = [];
  const lang = language.toLowerCase();

  // Class: class Name ... { (TS/JS/Java/C++/C#)
  const classRe = /^\s*((?:export\s+)?(?:abstract\s+)?(?:public\s+)?(?:private\s+)?)?class\s+(\w+)/;
  // Function: function name( or name = function( or ) => { at line start (arrow at column 0 is rare, so focus on function keyword)
  const fnRe = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/;
  const fnExprRe = /^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\()/;
  // Method-like: at line start "  name(" or "  name<T>(" (simplified)
  const methodRe = /^\s{2,}(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{?\s*$/;
  // Python: def name(, class Name(:
  const pyDefRe = /^\s*def\s+(\w+)\s*\(/;
  const pyClassRe = /^\s*class\s+(\w+)\s*[(:]/;
  // Go: func (r *T) Name( or func Name(
  const goFuncRe = /^\s*func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/;
  // Rust: fn name( or fn name<T>(
  const rustFnRe = /^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*[<(]/;
  // C/C++: return_type name( or #include etc. Skip preprocessor; catch function defs.
  const cFuncRe = /^\s*(?:\w+(?:\s*\*+)?\s+)+\s*(\w+)\s*\([^)]*\)\s*\{?\s*$/;
  // HTML: <script>, <style>, id="..."> (block start)
  // CSS: @media, .selector, #id (we treat as block)
  const htmlBlockRe = /^\s*<(script|style|div|section|main|article)\b/;
  const cssBlockRe = /^\s*(@\w+|\.[\w-]+|#[\w-]+)\s*\{/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (lang === 'python' || lang === 'py') {
      const m = line.match(pyClassRe) || line.match(pyDefRe);
      if (m) decls.push({ type: m[0].trim().startsWith('class') ? 'class' : 'function', name: m[1], startLine: lineNum });
      continue;
    }
    if (lang === 'go') {
      const m = line.match(goFuncRe);
      if (m) decls.push({ type: 'function', name: m[1], startLine: lineNum });
      continue;
    }
    if (lang === 'rust' || lang === 'rs') {
      const m = line.match(rustFnRe);
      if (m) decls.push({ type: 'function', name: m[1], startLine: lineNum });
      continue;
    }
    if (lang === 'html' || lang === 'htm') {
      const m = line.match(htmlBlockRe);
      if (m) decls.push({ type: 'block', name: m[1], startLine: lineNum });
      continue;
    }
    if (lang === 'css') {
      const m = line.match(cssBlockRe);
      if (m) decls.push({ type: 'block', name: m[1].replace(/^[.#]/, ''), startLine: lineNum });
      continue;
    }
    if (lang === 'c' || lang === 'cpp' || lang === 'csharp' || lang === 'cs') {
      const cm = line.match(classRe);
      if (cm) decls.push({ type: 'class', name: cm[2], startLine: lineNum });
      else {
        const fm = line.match(cFuncRe);
        if (fm) decls.push({ type: 'function', name: fm[1], startLine: lineNum });
      }
      continue;
    }
    // TypeScript / JavaScript
    if (classRe.test(line)) {
      const m = line.match(classRe);
      if (m) decls.push({ type: 'class', name: m[2], startLine: lineNum });
    } else if (fnRe.test(line) || fnExprRe.test(line)) {
      const m = line.match(fnRe) || line.match(fnExprRe);
      if (m) decls.push({ type: 'function', name: m[1], startLine: lineNum });
    } else if (methodRe.test(line) && line.trim().length > 3) {
      const m = line.match(methodRe);
      if (m) decls.push({ type: 'method', name: m[1], startLine: lineNum });
    }
  }

  return decls;
}

/** Resolve end line by matching braces (for JS/TS/C-style). For Python/Go use next decl or indent. */
function resolveEndLine(lines: string[], startLine: number, language: string): number {
  const lang = language.toLowerCase();
  const start = startLine - 1;
  if (lang === 'python' || lang === 'py' || lang === 'go') {
    const indent = (lines[start] ?? '').match(/^(\s*)/)?.[1]?.length ?? 0;
    for (let i = start + 1; i < Math.min(start + MAX_CHUNK_LINES + 1, lines.length); i++) {
      const t = lines[i] ?? '';
      const curIndent = t.match(/^(\s*)/)?.[1]?.length ?? 0;
      if (t.trim() === '' && i > start + 1) continue;
      if (curIndent <= indent && t.trim() !== '') return Math.min(i, start + MAX_CHUNK_LINES);
    }
    return Math.min(lines.length, start + MAX_CHUNK_LINES);
  }
  // Brace matching
  let depth = 0;
  let inBlock = false;
  for (let i = start; i < Math.min(start + MAX_CHUNK_LINES, lines.length); i++) {
    const line = lines[i] ?? '';
    for (const c of line) {
      if (c === '{') { depth++; inBlock = true; }
      else if (c === '}') depth--;
    }
    if (inBlock && depth === 0) return i + 1;
  }
  return Math.min(lines.length, start + MAX_CHUNK_LINES);
}

function extractChunk(lines: string[], startLine: number, endLine: number): string {
  const start = Math.max(0, startLine - 1);
  const end = Math.min(lines.length, endLine);
  return lines.slice(start, end).join('\n');
}

/** Sliding window fallback for unknown or non-semantic files */
function chunkBySlidingWindow(lines: string[], filePath: string, language: string): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  let start = 0;
  let index = 0;
  while (start < lines.length) {
    const end = Math.min(start + FALLBACK_WINDOW, lines.length);
    const content = lines.slice(start, end).join('\n');
    if (content.trim().length > 0 && (end - start) >= MIN_CHUNK_LINES) {
      const id = `${filePath}:${start + 1}-${end}`;
      chunks.push({
        id,
        filePath,
        language,
        startLine: start + 1,
        endLine: end,
        name: `lines ${start + 1}-${end}`,
        content,
        type: 'block',
      });
      index++;
    }
    start += FALLBACK_WINDOW - FALLBACK_OVERLAP;
    if (start >= lines.length) break;
  }
  return chunks;
}

/**
 * Parse a file into semantic chunks (function/class/method/block/file level).
 * Fallback: 40-line sliding window with 10-line overlap. Max 80 lines, min 5 per chunk.
 */
export function chunkFile(filePath: string, content: string, language: string): CodeChunk[] {
  const lines = content.split('\n');
  const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');
  const lang = language || ext;
  const useSemantic = SEMANTIC_LANGS.has(lang);

  if (!useSemantic || lines.length < MIN_CHUNK_LINES) {
    return chunkBySlidingWindow(lines, filePath, lang);
  }

  const decls = findDeclarations(content, lang);
  const chunks: CodeChunk[] = [];

  for (let d = 0; d < decls.length; d++) {
    const decl = decls[d];
    const nextStart = d + 1 < decls.length ? decls[d + 1].startLine - 1 : lines.length;
    let endLine = resolveEndLine(lines, decl.startLine, lang);
    endLine = Math.min(endLine, decl.startLine + MAX_CHUNK_LINES - 1, nextStart + 1);
    const lineCount = endLine - decl.startLine + 1;
    if (lineCount < MIN_CHUNK_LINES) continue;
    const slice = lines.slice(decl.startLine - 1, endLine);
    const contentSlice = slice.join('\n');
    const id = `${filePath}:${decl.startLine}-${endLine}`;
    chunks.push({
      id,
      filePath,
      language: lang,
      startLine: decl.startLine,
      endLine,
      name: decl.name,
      content: contentSlice,
      type: decl.type,
    });
  }

  if (chunks.length === 0) {
    return chunkBySlidingWindow(lines, filePath, lang);
  }
  return chunks;
}
