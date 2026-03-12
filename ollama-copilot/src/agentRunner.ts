import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { OllamaClient, ChatMessage } from './ollamaClient';
import { AgentTools, ToolResult } from './tools/agentTools';
import type { FileDiff } from './diff/diffEngine';
import { ReflectionEngine } from './reflexion/reflectionEngine';

export interface AgentStep {
    type: 'thinking' | 'tool_call' | 'tool_result' | 'response' | 'plan' | 'done' | 'error' | 'reflection' | 'diff_preview';
    content: string;
    toolName?: string;
    toolArgs?: Record<string, string>;
    success?: boolean;
    attempt?: number;
    diff?: FileDiff;
    stepId?: string;
}

export type AgentStepCallback = (step: AgentStep) => void;

export interface AgentRunOptions {
    messages: ChatMessage[];
    model: string;
    onStep: AgentStepCallback;
    maxIterations?: number;
    maxReflections?: number;
    diffPreviewEnabled?: boolean;
}

/**
 * Parses tool calls from model output.
 * Expects format: <tool_call>{"tool": "...", "args": {...}}</tool_call>
 */
function parseToolCall(text: string): { tool: string; args: Record<string, string> } | null {
    const match = text.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/);
    if (!match) { return null; }
    try {
        const parsed = JSON.parse(match[1]);
        if (parsed.tool && typeof parsed.tool === 'string') {
            return { tool: parsed.tool, args: parsed.args || {} };
        }
    } catch { /* malformed JSON */ }
    return null;
}

/**
 * Parses a plan block from model output.
 */
function parsePlan(text: string): string | null {
    const match = text.match(/<plan>([\s\S]*?)<\/plan>/);
    return match ? match[1].trim() : null;
}

/**
 * Checks if the model signals completion.
 */
function isDone(text: string): boolean {
    return text.includes('<agent_done>') || text.includes('</agent_done>');
}

const FILE_EDIT_TOOLS = new Set(['write_file', 'edit_file', 'create_file']);

const DIFF_TIMEOUT_MS = 5 * 60 * 1000;

export class AgentRunner {
    private tools: AgentTools;
    private client: OllamaClient;
    private _maxReflections: number;
    private _pendingDiffs = new Map<string, (approved: boolean) => void>();
    private _stopRequested = false;

    constructor(client: OllamaClient, tools?: AgentTools, maxReflections?: number) {
        this.client = client;
        this.tools = tools ?? new AgentTools();
        this._maxReflections = maxReflections ?? 3;
    }

    private async _revertFile(path: string, content: string): Promise<void> {
        await this.tools.executeTool('write_file', { path, content });
    }

    private async _deleteFile(path: string): Promise<void> {
        await this.tools.executeTool('delete_file', { path });
    }

    stop(): void {
        this._stopRequested = true;
    }

    resolveDiff(stepId: string, approved: boolean): void {
        const resolve = this._pendingDiffs.get(stepId);
        if (resolve) {
            this._pendingDiffs.delete(stepId);
            resolve(approved);
        }
    }

    private _awaitDiffDecision(stepId: string): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            this._pendingDiffs.set(stepId, resolve);
            setTimeout(() => {
                if (this._pendingDiffs.has(stepId)) {
                    this._pendingDiffs.delete(stepId);
                    resolve(false);
                }
            }, DIFF_TIMEOUT_MS);
        });
    }

    async run(options: AgentRunOptions): Promise<void> {
        this._stopRequested = false;
        const { messages, model, onStep, maxIterations = 15 } = options;
        const maxReflections = options.maxReflections ?? this._maxReflections;
        const diffPreviewEnabled = options.diffPreviewEnabled !== false;

        const history: ChatMessage[] = [...messages];
        const reflectionEngine = new ReflectionEngine(maxReflections);
        const filesTouched = new Set<string>();
        let iteration = 0;

        while (iteration < maxIterations) {
            if (this._stopRequested) {
                this._stopRequested = false;
                onStep({ type: 'done', content: '[Stopped by user]' });
                return;
            }
            let fullResponse = '';

            onStep({ type: 'thinking', content: '' });

            try {
                for await (const chunk of this.client.streamChat(history, model)) {
                    fullResponse += chunk;
                    onStep({ type: 'response', content: chunk });
                }
            } catch (err: unknown) {
                onStep({ type: 'error', content: err instanceof Error ? err.message : 'Streaming failed' });
                return;
            }

            const plan = parsePlan(fullResponse);
            if (plan) {
                onStep({ type: 'plan', content: plan });
                history.push({ role: 'assistant', content: fullResponse });
                return;
            }

            const toolCall = parseToolCall(fullResponse);
            if (toolCall) {
                onStep({
                    type: 'tool_call',
                    content: `Calling ${toolCall.tool}`,
                    toolName: toolCall.tool,
                    toolArgs: toolCall.args
                });

                const result: ToolResult = await this.tools.executeTool(toolCall.tool, toolCall.args);

                if (FILE_EDIT_TOOLS.has(toolCall.tool) && result.success && toolCall.args.path) {
                    filesTouched.add(toolCall.args.path);
                }

                let treatAsFailure = !result.success;
                let failureError = result.error || result.output || 'Tool failed';

                if (result.success && toolCall.tool === 'run_terminal' && toolCall.args.command) {
                    if (!ReflectionEngine.isTerminalSuccess(result.output, toolCall.args.command)) {
                        treatAsFailure = true;
                        failureError = 'Command completed but output indicates failure: ' + result.output.slice(0, 300);
                    }
                }

                if (treatAsFailure) {
                    const attempt = reflectionEngine.getReflectionCount() + 1;
                    const entry = reflectionEngine.reflect(
                        failureError,
                        toolCall.tool,
                        toolCall.args,
                        attempt
                    );
                    onStep({
                        type: 'tool_result',
                        content: result.success ? result.output : (result.error || 'Tool failed'),
                        toolName: toolCall.tool,
                        success: false
                    });
                    onStep({ type: 'reflection', content: entry.reflection, attempt: entry.attempt });

                    if (!reflectionEngine.shouldRetry()) {
                        onStep({ type: 'error', content: 'Max reflections reached. Could not complete task.' });
                        return;
                    }

                    history.push({ role: 'assistant', content: fullResponse });
                    history.push({
                        role: 'user',
                        content: reflectionEngine.getReflectionBlock() +
                            '\n\nThe previous tool call failed. Review the reflection above and try again with a corrected approach.'
                    });
                    continue;
                }

                if (result.diff && diffPreviewEnabled) {
                    const stepId = `diff_${Date.now()}`;
                    onStep({ type: 'diff_preview', content: '', diff: result.diff, stepId });
                    const approved = await this._awaitDiffDecision(stepId);
                    if (!approved) {
                        const d = result.diff;
                        filesTouched.delete(d.path);
                        if (d.isNew) {
                            await this._deleteFile(d.path);
                        } else {
                            await this._revertFile(d.path, d.oldContent);
                        }
                        history.push({ role: 'assistant', content: fullResponse });
                        history.push({
                            role: 'user',
                            content: `The file change to ${d.path} was rejected by the user. Do NOT make this change. Try a different approach or ask what to do instead.`
                        });
                        onStep({ type: 'reflection', content: 'File change rejected by user.', attempt: 0 });
                        continue;
                    }
                }

                onStep({
                    type: 'tool_result',
                    content: result.output,
                    toolName: toolCall.tool,
                    success: true
                });

                history.push({ role: 'assistant', content: fullResponse });
                history.push({
                    role: 'user',
                    content: `<tool_result tool="${toolCall.tool}" success="true">\n${result.output}\n</tool_result>\n\nContinue with the task.`
                });
                iteration++;
                continue;
            }

            if (isDone(fullResponse) || !toolCall) {
                if (filesTouched.size > 0 && maxReflections > 0) {
                    const tscError = await this.runPostTaskTscCheck();
                    if (tscError) {
                        const attempt = reflectionEngine.getReflectionCount() + 1;
                        reflectionEngine.reflect(tscError, 'post_task_tsc', {}, attempt);
                        if (reflectionEngine.shouldRetry()) {
                            onStep({ type: 'reflection', content: tscError.slice(0, 400), attempt });
                            history.push({ role: 'assistant', content: fullResponse });
                            history.push({
                                role: 'user',
                                content: reflectionEngine.getReflectionBlock() +
                                    '\n\nTypeScript compilation failed after your changes. Fix the errors above and try again.'
                            });
                            continue;
                        }
                    }
                }

                onStep({ type: 'done', content: fullResponse });
                return;
            }

            iteration++;
        }

        onStep({ type: 'error', content: `Agent reached max iterations (${maxIterations}). Task may be incomplete.` });
    }

    private async runPostTaskTscCheck(): Promise<string | null> {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length) { return null; }
        const root = folders[0].uri.fsPath;
        const tsconfigPath = path.join(root, 'tsconfig.json');
        if (!fs.existsSync(tsconfigPath)) { return null; }
        try {
            const result = await this.tools.executeTool('run_terminal', {
                command: 'npx tsc --noEmit 2>&1 || true'
            });
            if (!result.success || !result.output) { return null; }
            const out = result.output;
            if (out.toLowerCase().includes('error ts') || out.includes('SyntaxError')) {
                return 'TypeScript compilation failed after changes. I need to fix these errors: ' + out.slice(0, 500);
            }
            return null;
        } catch {
            return null;
        }
    }

    /** Resume execution after user approves a plan */
    async resumeAfterPlan(messages: ChatMessage[], model: string, onStep: AgentStepCallback): Promise<void> {
        const history: ChatMessage[] = [
            ...messages,
            { role: 'user', content: 'Plan approved. Please proceed with execution now.' }
        ];
        await this.run({ messages: history, model, onStep });
    }

    getTools(): AgentTools {
        return this.tools;
    }
}
