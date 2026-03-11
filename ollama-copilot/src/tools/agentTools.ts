import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, { type: string; description: string; required?: boolean }>;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
    {
        name: 'read_file',
        description: 'Read the contents of a file in the workspace',
        parameters: {
            path: { type: 'string', description: 'Relative path to the file from workspace root', required: true }
        }
    },
    {
        name: 'write_file',
        description: 'Write or overwrite a file with new content',
        parameters: {
            path: { type: 'string', description: 'Relative path to the file from workspace root', required: true },
            content: { type: 'string', description: 'Full content to write to the file', required: true }
        }
    },
    {
        name: 'edit_file',
        description: 'Replace a specific block of text in a file with new content (surgical edit)',
        parameters: {
            path: { type: 'string', description: 'Relative path to the file', required: true },
            old_text: { type: 'string', description: 'Exact text block to find and replace', required: true },
            new_text: { type: 'string', description: 'New text to replace the old block with', required: true }
        }
    },
    {
        name: 'create_file',
        description: 'Create a new file with content (fails if file already exists)',
        parameters: {
            path: { type: 'string', description: 'Relative path to the new file', required: true },
            content: { type: 'string', description: 'Content to write to the new file', required: true }
        }
    },
    {
        name: 'delete_file',
        description: 'Delete a file from the workspace',
        parameters: {
            path: { type: 'string', description: 'Relative path to the file to delete', required: true }
        }
    },
    {
        name: 'list_files',
        description: 'List files and directories in a directory',
        parameters: {
            path: { type: 'string', description: 'Relative directory path (default: workspace root)', required: false },
            pattern: { type: 'string', description: 'Glob pattern to filter files (e.g. "**/*.ts")', required: false }
        }
    },
    {
        name: 'search_in_files',
        description: 'Search for text or regex pattern across workspace files',
        parameters: {
            query: { type: 'string', description: 'Text or regex pattern to search for', required: true },
            file_pattern: { type: 'string', description: 'Glob pattern for files to search in (e.g. "**/*.ts")', required: false }
        }
    },
    {
        name: 'run_terminal',
        description: 'Run a shell command in the workspace directory and return its output',
        parameters: {
            command: { type: 'string', description: 'Shell command to execute', required: true }
        }
    },
    {
        name: 'get_diagnostics',
        description: 'Get current errors and warnings from VS Code diagnostics (linting, type errors)',
        parameters: {
            path: { type: 'string', description: 'File path to get diagnostics for (optional, all files if omitted)', required: false }
        }
    }
];

export class AgentTools {
    private workspaceRoot: string;

    constructor() {
        const folders = vscode.workspace.workspaceFolders;
        this.workspaceRoot = folders ? folders[0].uri.fsPath : '';
    }

    private resolvePath(relativePath: string): string {
        if (path.isAbsolute(relativePath)) {
            return relativePath;
        }
        return path.join(this.workspaceRoot, relativePath);
    }

    async executeTool(name: string, args: Record<string, string>): Promise<ToolResult> {
        try {
            switch (name) {
                case 'read_file': return await this.readFile(args.path);
                case 'write_file': return await this.writeFile(args.path, args.content);
                case 'edit_file': return await this.editFile(args.path, args.old_text, args.new_text);
                case 'create_file': return await this.createFile(args.path, args.content);
                case 'delete_file': return await this.deleteFile(args.path);
                case 'list_files': return await this.listFiles(args.path, args.pattern);
                case 'search_in_files': return await this.searchInFiles(args.query, args.file_pattern);
                case 'run_terminal': return await this.runTerminal(args.command);
                case 'get_diagnostics': return await this.getDiagnostics(args.path);
                default: return { success: false, output: '', error: `Unknown tool: ${name}` };
            }
        } catch (err: any) {
            return { success: false, output: '', error: err.message || String(err) };
        }
    }

    private async readFile(filePath: string): Promise<ToolResult> {
        const fullPath = this.resolvePath(filePath);
        if (!fs.existsSync(fullPath)) {
            return { success: false, output: '', error: `File not found: ${filePath}` };
        }
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        // Add line numbers for easier reference
        const numbered = lines.map((line, i) => `${String(i + 1).padStart(4, ' ')} | ${line}`).join('\n');
        return { success: true, output: `File: ${filePath}\n${'─'.repeat(60)}\n${numbered}` };
    }

    private async writeFile(filePath: string, content: string): Promise<ToolResult> {
        const fullPath = this.resolvePath(filePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const existed = fs.existsSync(fullPath);
        fs.writeFileSync(fullPath, content, 'utf8');
        // Open file in editor to show changes
        const uri = vscode.Uri.file(fullPath);
        await vscode.workspace.openTextDocument(uri);
        return { success: true, output: `${existed ? 'Updated' : 'Created'} file: ${filePath} (${content.split('\n').length} lines)` };
    }

    private async editFile(filePath: string, oldText: string, newText: string): Promise<ToolResult> {
        const fullPath = this.resolvePath(filePath);
        if (!fs.existsSync(fullPath)) {
            return { success: false, output: '', error: `File not found: ${filePath}` };
        }
        const content = fs.readFileSync(fullPath, 'utf8');
        if (!content.includes(oldText)) {
            return { success: false, output: '', error: `Text not found in ${filePath}. The exact text block could not be located.` };
        }
        const updated = content.replace(oldText, newText);
        fs.writeFileSync(fullPath, updated, 'utf8');

        // Show diff in editor
        const uri = vscode.Uri.file(fullPath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: true });

        const removedLines = oldText.split('\n').length;
        const addedLines = newText.split('\n').length;
        return { success: true, output: `Edited ${filePath}: replaced ${removedLines} lines with ${addedLines} lines` };
    }

    private async createFile(filePath: string, content: string): Promise<ToolResult> {
        const fullPath = this.resolvePath(filePath);
        if (fs.existsSync(fullPath)) {
            return { success: false, output: '', error: `File already exists: ${filePath}. Use write_file to overwrite.` };
        }
        return this.writeFile(filePath, content);
    }

    private async deleteFile(filePath: string): Promise<ToolResult> {
        const fullPath = this.resolvePath(filePath);
        if (!fs.existsSync(fullPath)) {
            return { success: false, output: '', error: `File not found: ${filePath}` };
        }
        fs.unlinkSync(fullPath);
        return { success: true, output: `Deleted file: ${filePath}` };
    }

    private async listFiles(dirPath?: string, pattern?: string): Promise<ToolResult> {
        const searchDir = dirPath ? this.resolvePath(dirPath) : this.workspaceRoot;
        if (!this.workspaceRoot) {
            return { success: false, output: '', error: 'No workspace folder open' };
        }

        const glob = pattern || '**/*';
        const uris = await vscode.workspace.findFiles(
            new vscode.RelativePattern(this.workspaceRoot, glob),
            '**/node_modules/**',
            500
        );

        if (dirPath) {
            const filtered = uris.filter(u => u.fsPath.startsWith(searchDir));
            const relative = filtered.map(u => path.relative(this.workspaceRoot, u.fsPath)).sort();
            return { success: true, output: relative.length ? relative.join('\n') : 'No files found' };
        }

        const relative = uris.map(u => path.relative(this.workspaceRoot, u.fsPath)).sort();
        return { success: true, output: relative.length ? relative.join('\n') : 'No files found' };
    }

    private async searchInFiles(query: string, filePattern?: string): Promise<ToolResult> {
        if (!this.workspaceRoot) {
            return { success: false, output: '', error: 'No workspace folder open' };
        }

        const glob = filePattern || '**/*';
        const uris = await vscode.workspace.findFiles(
            new vscode.RelativePattern(this.workspaceRoot, glob),
            '**/node_modules/**',
            200
        );

        const results: string[] = [];
        let regex: RegExp;
        try {
            regex = new RegExp(query, 'gi');
        } catch {
            regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        }

        for (const uri of uris) {
            try {
                const content = fs.readFileSync(uri.fsPath, 'utf8');
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    if (regex.test(lines[i])) {
                        const rel = path.relative(this.workspaceRoot, uri.fsPath);
                        results.push(`${rel}:${i + 1}: ${lines[i].trim()}`);
                    }
                    regex.lastIndex = 0;
                }
            } catch { /* skip binary files */ }
            if (results.length > 100) { break; }
        }

        return {
            success: true,
            output: results.length ? results.join('\n') : `No matches found for: ${query}`
        };
    }

    private async runTerminal(command: string): Promise<ToolResult> {
        if (!this.workspaceRoot) {
            return { success: false, output: '', error: 'No workspace folder open' };
        }

        // Safety: block destructive commands
        const dangerous = /\b(rm\s+-rf|format|mkfs|dd\s+if=|shutdown|reboot|:(){ :|:& };:)\b/i;
        if (dangerous.test(command)) {
            return { success: false, output: '', error: `Command blocked for safety: ${command}` };
        }

        try {
            const output = execSync(command, {
                cwd: this.workspaceRoot,
                encoding: 'utf8',
                timeout: 30000,
                maxBuffer: 1024 * 1024 * 5 // 5MB
            });
            return { success: true, output: output || '(no output)' };
        } catch (err: any) {
            const stderr = err.stderr || '';
            const stdout = err.stdout || '';
            return {
                success: false,
                output: stdout,
                error: stderr || err.message || 'Command failed'
            };
        }
    }

    private async getDiagnostics(filePath?: string): Promise<ToolResult> {
        let diagnostics: [vscode.Uri, vscode.Diagnostic[]][];

        if (filePath) {
            const fullPath = this.resolvePath(filePath);
            const uri = vscode.Uri.file(fullPath);
            const diags = vscode.languages.getDiagnostics(uri);
            diagnostics = [[uri, diags]];
        } else {
            diagnostics = vscode.languages.getDiagnostics();
        }

        const lines: string[] = [];
        for (const [uri, diags] of diagnostics) {
            if (diags.length === 0) { continue; }
            const rel = this.workspaceRoot ? path.relative(this.workspaceRoot, uri.fsPath) : uri.fsPath;
            for (const d of diags) {
                const severity = ['Error', 'Warning', 'Info', 'Hint'][d.severity];
                const line = d.range.start.line + 1;
                const col = d.range.start.character + 1;
                lines.push(`[${severity}] ${rel}:${line}:${col} - ${d.message}`);
            }
        }

        return {
            success: true,
            output: lines.length ? lines.join('\n') : 'No diagnostics found (no errors or warnings)'
        };
    }

    /** Generate the system prompt block describing all tools */
    static getToolsSystemPrompt(): string {
        return `You are a powerful local coding assistant with access to tools that let you read, write, and modify files, search the codebase, and run terminal commands — just like Claude Code.

## TOOLS AVAILABLE

You can use the following tools by outputting JSON in this exact format:
<tool_call>
{"tool": "tool_name", "args": {"param1": "value1", "param2": "value2"}}
</tool_call>

Available tools:

${TOOL_DEFINITIONS.map(t => {
    const params = Object.entries(t.parameters)
        .map(([k, v]) => `  - ${k} (${v.type}${v.required ? ', required' : ', optional'}): ${v.description}`)
        .join('\n');
    return `### ${t.name}\n${t.description}\nParameters:\n${params}`;
}).join('\n\n')}

## RULES

1. Think step-by-step before taking action
2. Read files before editing them
3. Use edit_file for small surgical changes; use write_file for full rewrites
4. Always show your reasoning before making tool calls
5. After all tool calls are done, output: <agent_done>
6. If you need user confirmation before destructive actions, ask first

## PLAN MODE

When the user asks for a plan, output:
<plan>
## Plan: [Task Name]

**Steps:**
1. [Step description]
2. [Step description]
...

**Files to modify:** [list]
**Commands to run:** [list]
</plan>

Then wait for user to confirm before executing.`;
    }
}
