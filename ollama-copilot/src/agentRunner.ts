import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { OllamaClient, ChatMessage } from './ollamaClient';
import { AgentTools, ToolResult } from './tools/agentTools';
import { ReflectionEngine } from './reflexion/reflectionEngine';

export interface AgentStep {
    type: 'thinking' | 'tool_call' | 'tool_result' | 'response' | 'plan' | 'done' | 'error' | 'reflection';
    content: string;
    toolName?: string;
    toolArgs?: Record<string, string>;
    success?: boolean;
    attempt?: number;
}

export type AgentStepCallback = (step: AgentStep) => void;

export interface AgentRunOptions {
    messages: ChatMessage[];
    model: string;
    onStep: AgentStepCallback;
    maxIterations?: number;
    maxReflections?: number;
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

export class AgentRunner {
    private tools: AgentTools;
    private client: OllamaClient;
    private _maxReflections: number;

    constructor(client: OllamaClient, tools?: AgentTools, maxReflections?: number) {
        this.client = client;
        this.tools = tools ?? new AgentTools();
        this._maxReflections = maxReflections ?? 3;
    }

    async run(options: AgentRunOptions): Promise<void> {
        const { messages, model, onStep, maxIterations = 15 } = options;
        const maxReflections = options.maxReflections ?? this._maxReflections;

        const history: ChatMessage[] = [...messages];
        const reflectionEngine = new ReflectionEngine(maxReflections);
        const filesTouched = new Set<string>();
        let iteration = 0;

        while (iteration < maxIterations) {
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
                continue;
            }

            if (isDone(fullResponse) || !toolCall) {
                if (filesTouched.size > 0 && maxReflections > 0) {
                    const tscError = await this.runPostTaskTscCheck();
                    if (tscError) {
                        const attempt = reflectionEngine.getReflectionCount() + 1;
                        reflectionEngine.reflect(
                            tscError,
                            'post_task_tsc',
                            {},
                            attempt
                        );
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
        if (!folders?.length) return null;
        const root = folders[0].uri.fsPath;
        const tsconfigPath = path.join(root, 'tsconfig.json');
        if (!fs.existsSync(tsconfigPath)) return null;
        try {
            const result = await this.tools.executeTool('run_terminal', {
                command: 'npx tsc --noEmit 2>&1 || true'
            });
            if (!result.success || !result.output) return null;
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
