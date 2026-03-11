import * as vscode from 'vscode';
import { OllamaClient, ChatMessage } from './ollamaClient';
import { AgentTools, ToolResult } from './tools/agentTools';

export interface AgentStep {
    type: 'thinking' | 'tool_call' | 'tool_result' | 'response' | 'plan' | 'done' | 'error';
    content: string;
    toolName?: string;
    toolArgs?: Record<string, string>;
    success?: boolean;
}

export type AgentStepCallback = (step: AgentStep) => void;

export interface AgentRunOptions {
    messages: ChatMessage[];
    model: string;
    onStep: AgentStepCallback;
    maxIterations?: number;
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

export class AgentRunner {
    private tools: AgentTools;
    private client: OllamaClient;

    constructor(client: OllamaClient) {
        this.client = client;
        this.tools = new AgentTools();
    }

    async run(options: AgentRunOptions): Promise<void> {
        const { messages, model, onStep, maxIterations = 15 } = options;

        // Build working message history (mutable copy for tool loop)
        const history: ChatMessage[] = [...messages];

        for (let iteration = 0; iteration < maxIterations; iteration++) {
            // Stream the model's response
            let fullResponse = '';

            onStep({ type: 'thinking', content: '' });

            try {
                for await (const chunk of this.client.streamChat(history, model)) {
                    fullResponse += chunk;
                    onStep({ type: 'response', content: chunk });
                }
            } catch (err: any) {
                onStep({ type: 'error', content: err.message || 'Streaming failed' });
                return;
            }

            // Check for plan
            const plan = parsePlan(fullResponse);
            if (plan) {
                onStep({ type: 'plan', content: plan });
                // Add assistant message to history
                history.push({ role: 'assistant', content: fullResponse });
                return; // Pause for user confirmation
            }

            // Check for tool call
            const toolCall = parseToolCall(fullResponse);
            if (toolCall) {
                // Notify about tool call
                onStep({
                    type: 'tool_call',
                    content: `Calling ${toolCall.tool}`,
                    toolName: toolCall.tool,
                    toolArgs: toolCall.args
                });

                // Execute the tool
                const result: ToolResult = await this.tools.executeTool(toolCall.tool, toolCall.args);

                // Notify about result
                onStep({
                    type: 'tool_result',
                    content: result.success ? result.output : (result.error || 'Tool failed'),
                    toolName: toolCall.tool,
                    success: result.success
                });

                // Add to history and continue
                history.push({ role: 'assistant', content: fullResponse });
                history.push({
                    role: 'user',
                    content: `<tool_result tool="${toolCall.tool}" success="${result.success}">\n${result.success ? result.output : result.error}\n</tool_result>\n\nContinue with the task.`
                });

                continue; // Next iteration
            }

            // Check if done
            if (isDone(fullResponse) || !toolCall) {
                onStep({ type: 'done', content: fullResponse });
                return;
            }
        }

        onStep({ type: 'error', content: `Agent reached max iterations (${maxIterations}). Task may be incomplete.` });
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
