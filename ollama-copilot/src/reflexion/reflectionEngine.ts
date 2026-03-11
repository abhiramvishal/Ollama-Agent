export interface ReflectionEntry {
  attempt: number;
  toolName?: string;
  error: string;
  reflection: string;
  timestamp: number;
}

export interface ReflectionContext {
  entries: ReflectionEntry[];
  totalAttempts: number;
  lastSuccessAt?: number;
}

export class ReflectionEngine {
  private _context: ReflectionContext = { entries: [], totalAttempts: 0 };
  private _maxReflections: number;

  constructor(maxReflections: number = 3) {
    this._maxReflections = maxReflections;
  }

  reset(): void {
    this._context = { entries: [], totalAttempts: 0 };
  }

  shouldRetry(): boolean {
    return this._context.totalAttempts < this._maxReflections;
  }

  getReflectionCount(): number {
    return this._context.entries.length;
  }

  reflect(
    error: string,
    toolName: string,
    _toolArgs: Record<string, string>,
    attempt: number
  ): ReflectionEntry {
    const err = error.toLowerCase();
    let reflection: string;

    if (
      err.includes('not found') ||
      err.includes('enoent') ||
      err.includes('file not found')
    ) {
      reflection =
        'The file path was wrong. I should use list_files first to confirm the exact path.';
    } else if (err.includes('text not found') || err.includes("could not be located")) {
      reflection =
        "The old_text didn't match exactly. I should read_file first to get the current content, then use the exact text from the file.";
    } else if (
      err.includes('command failed') ||
      err.includes('exit code') ||
      err.includes('command blocked')
    ) {
      reflection =
        'The command failed. I should check the error output and try a different approach or fix the issue before retrying.';
    } else if (err.includes('already exists')) {
      reflection =
        'The file already exists. I should use write_file instead of create_file, or read it first to decide if I should overwrite.';
    } else if (
      err.includes('error ts') ||
      err.includes('syntaxerror') ||
      err.includes('typescript')
    ) {
      reflection =
        'There is a compile error. I should read the file again, fix the syntax, and ensure types are correct before writing.';
    } else if (err.includes('no relevant code found') || err.includes('no matching')) {
      reflection =
        'Semantic search found nothing. I should try different search terms or use list_files to browse the structure directly.';
    } else {
      reflection = `The previous attempt failed with: ${error.slice(0, 200)}. I should try a different approach.`;
    }

    const entry: ReflectionEntry = {
      attempt,
      toolName,
      error,
      reflection,
      timestamp: Date.now(),
    };
    this._context.entries.push(entry);
    this._context.totalAttempts += 1;
    return entry;
  }

  getReflectionBlock(): string {
    if (this._context.entries.length === 0) return '';
    const lines: string[] = [
      '<reflexion>',
      ...this._context.entries.map(
        (e) => `Attempt ${e.attempt} failed. Reflection: ${e.reflection}`
      ),
      'Based on these failures, try a different approach.',
      '</reflexion>',
    ];
    return lines.join('\n');
  }

  static isTerminalSuccess(output: string, command: string): boolean {
    const out = output.toLowerCase();
    const cmd = command.toLowerCase();

    if (cmd.includes('test') || cmd.includes('jest') || cmd.includes('vitest') || cmd.includes('pytest')) {
      if (out.includes('failed') || out.includes('fail')) return false;
      return out.includes('passed') || out.includes('✓') || out.includes('ok');
    }

    if (
      cmd.includes('tsc') ||
      cmd.includes('npm run build') ||
      cmd.includes('cargo build') ||
      cmd.includes('go build')
    ) {
      if (out.includes('error')) return false;
      return out.length === 0 || out.includes('successfully compiled');
    }

    if (cmd.includes('npm install') || cmd.includes('pip install')) {
      return !out.includes('err!') && !out.includes('error');
    }

    return true;
  }
}
