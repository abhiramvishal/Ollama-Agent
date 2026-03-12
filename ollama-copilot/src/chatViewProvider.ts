import * as vscode from 'vscode';
import * as path from 'path';
import { OllamaClient, ChatMessage } from './ollamaClient';
import { AgentRunner, AgentStep } from './agentRunner';
import { AgentTools } from './tools/agentTools';
import { renderMarkdownToHtml } from './utils';
import type { WorkspaceIndex } from './rag/workspaceIndex';
import type { MemoryStore } from './memory/memoryStore';
import type { SkillStore } from './memory/skillStore';
import { formatDiffHtml } from './diff/diffEngine';
import type { HistoryStore } from './history/historyStore';
import type { ChatSession } from './history/historyStore';
import { matchSlashCommand, SLASH_COMMANDS } from './slash/slashCommands';
import type { ContextRegistry } from './context/contextRegistry';
import { resolveMention } from './mentions/mentionResolver';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'clawpilot.chatView';
    private _view?: vscode.WebviewView;
    private _client: OllamaClient;
    private _workspaceIndex: WorkspaceIndex;
    private _memoryStore: MemoryStore;
    private _skillStore: SkillStore;
    private _agentRunner: AgentRunner;
    private _chatHistory: ChatMessage[] = [];
    private _isAgentRunning = false;
    private _pendingPlanMessages: ChatMessage[] | null = null;
    private _historyStore: HistoryStore | undefined;
    private _activeSessionId: string | null = null;
    private _contextRegistry: ContextRegistry | undefined;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        client: OllamaClient,
        workspaceIndex: WorkspaceIndex,
        memoryStore: MemoryStore,
        skillStore: SkillStore
    ) {
        this._client = client;
        this._workspaceIndex = workspaceIndex;
        this._memoryStore = memoryStore;
        this._skillStore = skillStore;
        const maxRetries = vscode.workspace.getConfiguration('clawpilot').get<number>('reflexionMaxRetries', 3);
        this._agentRunner = new AgentRunner(client, new AgentTools(workspaceIndex, memoryStore, skillStore), maxRetries);
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtml();
        webviewView.webview.onDidReceiveMessage(msg => this._handleMessage(msg));
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this._refreshModels();
                this._checkConnection();
                this._sendIndexStatus();
            }
        });
        setTimeout(() => {
            this._refreshModels();
            this._checkConnection();
            this._sendIndexStatus();
            this._sendMemoryData();
        }, 500);
        if (this._historyStore) {
            const session = this._historyStore.getOrCreateActiveSession();
            this._activeSessionId = session.id;
            this._sendHistoryToWebview(session);
        }
        this._view?.webview.postMessage({
            type: 'slashCommands',
            commands: SLASH_COMMANDS.map(c => ({ name: c.name, usage: c.usage, description: c.description }))
        });
    }

    public sendToChat(userMessage: string, codeContext?: string) {
        if (!this._view) { return; }
        this._view.show(true);
        setTimeout(() => {
            this._view?.webview.postMessage({
                type: 'injectMessage',
                text: userMessage,
                codeContext
            });
        }, 300);
    }

    public async sendQuickAction(prompt: string): Promise<void> {
        await vscode.commands.executeCommand('clawpilot.openChat');
        await new Promise<void>(resolve => setTimeout(resolve, 150));
        this._view?.webview.postMessage({ type: 'injectPrompt', text: prompt });
        this._view?.webview.postMessage({ type: 'submitPrompt' });
    }

    public setHistoryStore(store: HistoryStore): void {
        this._historyStore = store;
        const session = store.getOrCreateActiveSession();
        this._activeSessionId = session.id;
        if (this._view) {
            this._sendHistoryToWebview(session);
        }
    }

    public switchSession(session: ChatSession): void {
        this._activeSessionId = session.id;
        this._historyStore?.setActiveSession(session.id);
        this._sendHistoryToWebview(session);
    }

    public setContextRegistry(registry: ContextRegistry): void {
        this._contextRegistry = registry;
    }

    public clearWebviewMessages(): void {
        this._chatHistory = [];
        this._view?.webview.postMessage({ type: 'clearMessages' });
    }

    private _sendHistoryToWebview(session: ChatSession): void {
        const messages = session.messages.map(m =>
            m.role === 'assistant'
                ? { role: m.role, content: m.content, html: renderMarkdownToHtml(m.content) }
                : m
        );
        this._view?.webview.postMessage({
            type: 'loadHistory',
            sessionName: session.name,
            messages
        });
        this._chatHistory = session.messages.slice(-40).map(m => ({ role: m.role, content: m.content }));
    }

    private async _handleMessage(msg: any) {
        switch (msg.type) {
            case 'sendMessage':
                await this._handleUserMessage(msg.text, msg.codeContext, msg.files, msg.agentMode);
                break;
            case 'changeModel':
                vscode.workspace.getConfiguration('clawpilot').update('model', msg.model, true);
                break;
            case 'clearChat':
                this._chatHistory = [];
                this._pendingPlanMessages = null;
                break;
            case 'insertCode':
                this._insertCodeToEditor(msg.code);
                break;
            case 'getModels':
                await this._refreshModels();
                break;
            case 'getConnectionStatus':
                await this._checkConnection();
                break;
            case 'getSelectionContext':
                this._sendSelectionContext();
                break;
            case 'getWorkspaceFiles':
                await this._sendWorkspaceFiles(msg.query);
                break;
            case 'confirmPlan':
                await this._executePlan();
                break;
            case 'rejectPlan':
                this._pendingPlanMessages = null;
                this._view?.webview.postMessage({ type: 'planRejected' });
                break;
            case 'stopAgent':
                this._agentRunner.stop();
                break;
            case 'cancelAgent':
                this._isAgentRunning = false;
                break;
            case 'reindexWorkspace':
                await this._reindexWorkspace();
                break;
            case 'getIndexStatus':
                this._sendIndexStatus();
                break;
            case 'getMemory':
                await this._sendMemoryData();
                break;
            case 'updateCore':
                if (msg.patch != null) {
                    await this._memoryStore.updateCoreMemory(msg.patch);
                    await this._sendMemoryData();
                }
                break;
            case 'addSkillFromChat':
                if (msg.name != null && msg.desc != null && msg.content != null) {
                    await this._skillStore.addSkill(msg.name, msg.desc, msg.content, msg.tags?.split(',').map((t: string) => t.trim()).filter(Boolean));
                    await this._sendMemoryData();
                }
                break;
            case 'deleteSkill':
                if (msg.id != null) {
                    await this._skillStore.deleteSkill(msg.id);
                    await this._sendMemoryData();
                }
                break;
            case 'approveDiff':
                this._agentRunner.resolveDiff(msg.stepId, true);
                break;
            case 'rejectDiff':
                this._agentRunner.resolveDiff(msg.stepId, false);
                break;
        }
    }

    private async _sendMemoryData() {
        if (!this._view) return;
        const core = this._memoryStore.getCoreMemory();
        const skills = this._skillStore.listSkills();
        this._view.webview.postMessage({
            type: 'memoryData',
            core: { projectContext: core.projectContext, userPreferences: core.userPreferences, keyFacts: core.keyFacts },
            recallCount: this._memoryStore.getRecallCount(),
            archivalCount: this._memoryStore.getArchivalCount(),
            skills: skills.map(s => ({ id: s.id, name: s.name, description: s.description })),
        });
    }

    private _sendIndexStatus() {
        if (!this._view) return;
        const st = this._workspaceIndex.status;
        const message = st.isIndexing
            ? 'Indexing workspace...'
            : st.chunkCount > 0
                ? `${st.chunkCount} chunks indexed`
                : 'Not indexed';
        this._view.webview.postMessage({
            type: 'indexStatus',
            indexing: st.isIndexing,
            message,
            chunkCount: st.chunkCount,
        });
    }

    private async _reindexWorkspace() {
        if (!this._view) return;
        this._view.webview.postMessage({ type: 'indexStatus', indexing: true, message: 'Indexing workspace...' });
        await this._workspaceIndex.indexAll((message, fileCount) => {
            this._view?.webview.postMessage({
                type: 'indexStatus',
                indexing: true,
                message,
                fileCount,
            });
        });
        const st = this._workspaceIndex.status;
        this._view.webview.postMessage({
            type: 'indexStatus',
            indexing: false,
            message: st.chunkCount > 0 ? `${st.chunkCount} chunks indexed` : 'Not indexed',
            chunkCount: st.chunkCount,
        });
    }

    private async _handleUserMessage(
        text: string,
        codeContext?: string,
        attachedFiles?: string[],
        agentModeOverride?: boolean
    ) {
        if (this._isAgentRunning) {
            this._view?.webview.postMessage({ type: 'error', message: 'Agent is already running. Wait or click Stop.' });
            return;
        }

        let processedText = text;
        const slashMatchNew = matchSlashCommand(text);
        if (slashMatchNew) {
            const { command, arg } = slashMatchNew;
            switch (command.name) {
                case 'help': {
                    const helpText = '**Available slash commands:**\n\n' +
                        SLASH_COMMANDS.map(c => `- \`${c.usage}\` — ${c.description}`).join('\n');
                    this._view?.webview.postMessage({
                        type: 'assistantMessage',
                        html: renderMarkdownToHtml(helpText)
                    });
                    return;
                }
                case 'clear':
                    if (this._historyStore && this._activeSessionId) {
                        this._historyStore.clearMessages(this._activeSessionId);
                    }
                    this.clearWebviewMessages();
                    return;
                case 'new': {
                    if (!this._historyStore) return;
                    const session = this._historyStore.createSession(arg || undefined);
                    this.switchSession(session);
                    return;
                }
                case 'commit': {
                    if (!arg.trim()) {
                        this._view?.webview.postMessage({
                            type: 'assistantMessage',
                            html: renderMarkdownToHtml('Usage: `/commit <message>`')
                        });
                        return;
                    }
                    processedText = `Use git_commit with addAll=true and message="${arg.trim()}". Then confirm the commit was successful.`;
                    break;
                }
                case 'search': {
                    if (!arg.trim()) {
                        this._view?.webview.postMessage({
                            type: 'assistantMessage',
                            html: renderMarkdownToHtml('Usage: `/search <query>`')
                        });
                        return;
                    }
                    processedText = `Search the workspace for: ${arg.trim()}. Use semantic_search to find relevant code and summarise the top results.`;
                    break;
                }
                case 'explain':
                    await vscode.commands.executeCommand('clawpilot.explain');
                    return;
                case 'fix':
                    await vscode.commands.executeCommand('clawpilot.fix');
                    return;
                case 'tests':
                    await vscode.commands.executeCommand('clawpilot.add_tests');
                    return;
                case 'status':
                    processedText = command.expandTo!;
                    break;
                case 'model': {
                    if (!arg.trim()) {
                        this._view?.webview.postMessage({
                            type: 'assistantMessage',
                            html: renderMarkdownToHtml('Usage: `/model <name>` — e.g. `/model codellama`')
                        });
                        return;
                    }
                    await vscode.workspace.getConfiguration('clawpilot').update('model', arg.trim(), vscode.ConfigurationTarget.Global);
                    this._view?.webview.postMessage({ type: 'setModel', model: arg.trim() });
                    this._view?.webview.postMessage({
                        type: 'assistantMessage',
                        html: renderMarkdownToHtml(`Switched model to \`${arg.trim()}\`.`)
                    });
                    return;
                }
                case 'skills': {
                    const skills = this._skillStore.listSkills();
                    const builtin = skills.filter(s => s.isBuiltin);
                    const user = skills.filter(s => !s.isBuiltin);
                    let body = '**Built-in skills**\n\n';
                    body += builtin.map(s => `- **${s.name}** — ${s.description}`).join('\n');
                    body += '\n\n**Your saved skills**\n\n';
                    body += user.length > 0 ? user.map(s => `- **${s.name}** — ${s.description}`).join('\n') : '_None yet. Save skills from the chat to reuse them._';
                    this._view?.webview.postMessage({
                        type: 'assistantMessage',
                        html: renderMarkdownToHtml(body)
                    });
                    return;
                }
                default:
                    break;
            }
        }

        const config = vscode.workspace.getConfiguration('clawpilot');
        const model = config.get<string>('model', 'llama3');
        const systemPrompt = config.get<string>('systemPrompt', '');

        // Parse slash command and determine if we should use agent mode
        const slashMatch = !slashMatchNew ? text.match(/^\/(\w+)\s*(.*)/s) : null;
        const agentSlashCmds = ['plan', 'edit', 'fix', 'run', 'test', 'refactor', 'build', 'review', 'optimize', 'types'];
        let isAgentTask = agentModeOverride ?? config.get<boolean>('agentMode', true);

        if (slashMatch) {
            processedText = this._expandSlashCommand(slashMatch[1], slashMatch[2], codeContext);
            if (agentSlashCmds.includes(slashMatch[1])) {
                isAgentTask = true;
            }
        }

        processedText = await this._resolveMentionsInMessage(processedText);

        let fullMessage = processedText;
        if (this._contextRegistry) {
            try {
                const ctx = await this._contextRegistry.assemble(processedText, 8000);
                if (ctx && ctx.trim()) {
                    fullMessage = ctx + '\n\n' + fullMessage;
                }
            } catch {
                // Non-blocking
            }
        }

        if (codeContext && !fullMessage.includes(codeContext)) {
            fullMessage = fullMessage + '\n\n**Selected code:**\n\`\`\`' + this._getEditorLang() + '\n' + codeContext + '\n\`\`\`';
        }

        // Attach @-mentioned files
        if (attachedFiles && attachedFiles.length > 0) {
            const folders = vscode.workspace.workspaceFolders;
            if (folders) {
                for (const f of attachedFiles) {
                    try {
                        const fullPath = path.join(folders[0].uri.fsPath, f);
                        const doc = await vscode.workspace.openTextDocument(fullPath);
                        const content = doc.getText().slice(0, 10000);
                        fullMessage += `\n\n**@${f}:**\n\`\`\`\n${content}\n\`\`\``;
                    } catch { /* skip unreadable */ }
                }
            }
        }

        // Build messages array
        const messages: ChatMessage[] = [];
        if (isAgentTask) {
            messages.push({ role: 'system', content: AgentTools.getToolsSystemPrompt() });
        } else {
            const sysContent = systemPrompt || 'You are an expert coding assistant. Be concise, accurate, and helpful.';
            messages.push({ role: 'system', content: sysContent });
        }
        messages.push(...this._chatHistory);
        messages.push({ role: 'user', content: fullMessage });

        if (this._historyStore && this._activeSessionId) {
            this._historyStore.appendMessage(this._activeSessionId, {
                role: 'user', content: text, timestamp: Date.now()
            });
        }

        if (isAgentTask) {
            await this._runAgent(messages, model, text, processedText);
        } else {
            await this._runChat(messages, model, text, processedText);
        }
    }

    private _getEditorLang(): string {
        return vscode.window.activeTextEditor?.document.languageId || '';
    }

    private async _runChat(messages: ChatMessage[], model: string, userMsg: string, processedText: string) {
        this._isAgentRunning = true;
        let fullResponse = '';
        this._view?.webview.postMessage({ type: 'startAssistantMessage' });
        try {
            for await (const chunk of this._client.streamChat(messages, model)) {
                fullResponse += chunk;
                this._view?.webview.postMessage({ type: 'streamChunk', chunk });
            }
            this._view?.webview.postMessage({
                type: 'finalizeAssistantMessage',
                html: renderMarkdownToHtml(fullResponse)
            });
            this._pushHistory(userMsg, fullResponse);
            if (this._historyStore && this._activeSessionId) {
                this._historyStore.appendMessage(this._activeSessionId, {
                    role: 'assistant', content: fullResponse, timestamp: Date.now()
                });
            }
            await this._autoSaveRecall(userMsg, fullResponse, model);
        } catch (err: unknown) {
            this._view?.webview.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
        } finally {
            this._isAgentRunning = false;
        }
    }

    private async _runAgent(messages: ChatMessage[], model: string, userMsg: string, processedText: string) {
        this._isAgentRunning = true;
        this._view?.webview.postMessage({ type: 'agentStart' });
        let fullTextResponse = '';
        let stepCount = 0;

        const onStep = (step: AgentStep) => {
            switch (step.type) {
                case 'thinking':
                    this._view?.webview.postMessage({ type: 'agentThinking' });
                    break;
                case 'response':
                    fullTextResponse += step.content;
                    this._view?.webview.postMessage({ type: 'streamChunk', chunk: step.content });
                    break;
                case 'tool_call':
                    stepCount++;
                    this._view?.webview.postMessage({
                        type: 'agentToolCall',
                        toolName: step.toolName,
                        toolArgs: step.toolArgs,
                        step: stepCount
                    });
                    fullTextResponse = '';
                    break;
                case 'tool_result':
                    this._view?.webview.postMessage({
                        type: 'agentToolResult',
                        toolName: step.toolName,
                        output: step.content,
                        success: step.success,
                        step: stepCount
                    });
                    break;
                case 'reflection':
                    this._view?.webview.postMessage({
                        type: 'agentReflection',
                        content: step.content,
                        attempt: step.attempt ?? 0
                    });
                    break;
                case 'diff_preview':
                    if (step.diff && step.stepId) {
                        this._view?.webview.postMessage({
                            type: 'agentDiffPreview',
                            stepId: step.stepId,
                            path: step.diff.path,
                            isNew: step.diff.isNew,
                            html: formatDiffHtml(step.diff.lines)
                        });
                    }
                    break;
                case 'plan':
                    this._pendingPlanMessages = messages;
                    this._view?.webview.postMessage({
                        type: 'agentPlan',
                        plan: step.content,
                        html: renderMarkdownToHtml(step.content)
                    });
                    break;
                case 'done':
                case 'error':
                    this._view?.webview.postMessage({
                        type: 'agentDone',
                        html: renderMarkdownToHtml(fullTextResponse || step.content),
                        error: step.type === 'error' ? step.content : undefined
                    });
                    break;
            }
        };

        try {
            const diffPreviewEnabled = vscode.workspace.getConfiguration('clawpilot').get<boolean>('diffPreviewEnabled', true);
            await this._agentRunner.run({ messages, model, onStep, diffPreviewEnabled });
            this._pushHistory(userMsg, fullTextResponse);
            if (this._historyStore && this._activeSessionId) {
                this._historyStore.appendMessage(this._activeSessionId, {
                    role: 'assistant', content: fullTextResponse, timestamp: Date.now()
                });
            }
            await this._autoSaveRecall(userMsg, fullTextResponse, model);
        } catch (err: unknown) {
            this._view?.webview.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
        } finally {
            this._isAgentRunning = false;
        }
    }

    private async _autoSaveRecall(userMsg: string, fullResponse: string, model: string) {
        const config = vscode.workspace.getConfiguration('clawpilot');
        if (!config.get<boolean>('autoSaveMemory', true)) return;
        try {
            const content = `User asked: ${userMsg.slice(0, 200)} | Response summary: ${fullResponse.slice(0, 300)}`;
            const lang = this._getEditorLang();
            const tags = [model, lang].filter(Boolean);
            await this._memoryStore.addRecall(content, 'auto', tags);
        } catch {
            // Non-blocking
        }
    }

    private async _executePlan() {
        if (!this._pendingPlanMessages) { return; }
        const config = vscode.workspace.getConfiguration('clawpilot');
        const model = config.get<string>('model', 'llama3');
        const messages = this._pendingPlanMessages;
        this._pendingPlanMessages = null;
        this._view?.webview.postMessage({ type: 'planExecuting' });
        await this._runAgent(
            [...messages, { role: 'user', content: 'Plan approved. Execute all steps now.' }],
            model,
            'Plan execution',
            'Plan approved. Execute all steps now.'
        );
    }

    private _pushHistory(userMsg: string, assistantMsg: string) {
        this._chatHistory.push({ role: 'user', content: userMsg });
        this._chatHistory.push({ role: 'assistant', content: assistantMsg });
        if (this._chatHistory.length > 40) {
            this._chatHistory = this._chatHistory.slice(-40);
        }
    }

    private static readonly MENTION_PATTERN = /@(\w+)(?::([^\s]*))?/g;

    private async _resolveMentionsInMessage(text: string): Promise<string> {
        const matches = [...text.matchAll(ChatViewProvider.MENTION_PATTERN)];
        if (matches.length === 0) return text;
        const replacements: { index: number; length: number; content: string }[] = [];
        for (const m of matches) {
            const full = m[0];
            const resolved = await resolveMention(full, this._workspaceIndex, this._memoryStore);
            replacements.push({
                index: m.index!,
                length: full.length,
                content: resolved ? resolved.content : `[mention not found: ${full}]`,
            });
        }
        replacements.sort((a, b) => b.index - a.index);
        let result = text;
        for (const r of replacements) {
            result = result.slice(0, r.index) + r.content + result.slice(r.index + r.length);
        }
        return result;
    }

    private _expandSlashCommand(cmd: string, rest: string, codeContext?: string): string {
        const code = codeContext ? `\n\nCode:\n\`\`\`\n${codeContext}\n\`\`\`` : '';
        switch (cmd) {
            case 'explain': return `Explain this code clearly.${code}${rest ? '\n\n' + rest : ''}`;
            case 'fix': return `Find and fix all bugs. Show corrected code with explanations.${code}${rest ? '\nContext: ' + rest : ''}`;
            case 'refactor': return `Refactor for better readability, performance, and maintainability.${code}${rest ? '\nFocus: ' + rest : ''}`;
            case 'test': return `Write comprehensive unit tests.${code}${rest ? '\nFramework: ' + rest : ''}`;
            case 'docs': return `Generate thorough documentation for this code.${code}`;
            case 'plan': return `Create a detailed step-by-step plan to: ${rest || 'implement this feature'}${code}\n\nOutput the plan inside a <plan>...</plan> block.`;
            case 'edit': return `Make the following changes: ${rest}${code}`;
            case 'build': return `Build this feature: ${rest}${code}. Read relevant files first, then implement.`;
            case 'run': return `Run this command and show me the output: ${rest}`;
            case 'review': return `Do a thorough code review. Check for bugs, security issues, performance, and style.${code}`;
            case 'optimize': return `Optimize for performance. Identify bottlenecks and improve them.${code}`;
            case 'types': return `Add proper TypeScript types and interfaces.${code}`;
            default: return `/${cmd} ${rest}`;
        }
    }

    private async _refreshModels() {
        try {
            const models = await this._client.listModels();
            const config = vscode.workspace.getConfiguration('clawpilot');
            const current = config.get<string>('model', 'llama3');
            this._view?.webview.postMessage({ type: 'models', models, current });
        } catch {
            this._view?.webview.postMessage({ type: 'models', models: [], current: '' });
        }
    }

    private async _checkConnection() {
        const ok = await this._client.isAvailable();
        this._view?.webview.postMessage({ type: 'connectionStatus', connected: ok });
    }

    private _sendSelectionContext() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            this._view?.webview.postMessage({ type: 'selectionContext', text: '', lang: '' });
            return;
        }
        const text = editor.document.getText(editor.selection);
        const lang = editor.document.languageId;
        this._view?.webview.postMessage({ type: 'selectionContext', text, lang });
    }

    private async _sendWorkspaceFiles(query: string) {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) {
            this._view?.webview.postMessage({ type: 'workspaceFiles', files: [] });
            return;
        }
        const pattern = query ? `**/*${query}*` : '**/*';
        const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 50);
        const files = uris.map(u => path.relative(folders[0].uri.fsPath, u.fsPath));
        this._view?.webview.postMessage({ type: 'workspaceFiles', files });
    }

    private _insertCodeToEditor(code: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor to insert code into');
            return;
        }
        editor.edit(eb => {
            if (editor.selection.isEmpty) {
                eb.insert(editor.selection.active, code);
            } else {
                eb.replace(editor.selection, code);
            }
        });
    }

    private _getHtml(): string {
        const nonce = getNonce();
        return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ClawPilot</title>
<style nonce="${nonce}">
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-foreground);
  background: var(--vscode-sideBar-background);
  display: flex; flex-direction: column; height: 100vh; overflow: hidden;
}
.header {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px; border-bottom: 1px solid var(--vscode-panel-border);
  flex-shrink: 0;
}
.header-title { font-weight: 600; font-size: 13px; flex: 1; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #888; flex-shrink: 0; }
.status-dot.connected { background: #4caf50; }
.btn-icon {
  background: none; border: none; cursor: pointer; padding: 3px 5px;
  color: var(--vscode-foreground); opacity: 0.7; font-size: 14px; border-radius: 4px;
}
.btn-icon:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }
.model-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-bottom: 1px solid var(--vscode-panel-border); flex-shrink: 0;
}
.model-bar select {
  flex: 1; background: var(--vscode-dropdown-background);
  color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border);
  padding: 3px 6px; border-radius: 4px; font-size: 12px; cursor: pointer;
}
.index-bar {
  display: flex; align-items: center; gap: 6px; padding: 3px 10px;
  border-bottom: 1px solid var(--vscode-panel-border); font-size: 11px; color: var(--vscode-descriptionForeground);
}
.index-status { flex: 1; }
.index-status.indexing::before { content: ''; display: inline-block; width: 12px; height: 12px; margin-right: 6px; vertical-align: middle;
  border: 2px solid var(--vscode-focusBorder); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.index-refresh { font-size: 11px; padding: 2px 6px; }
.memory-bar {
  display: flex; align-items: center; gap: 6px; padding: 3px 10px;
  border-bottom: 1px solid var(--vscode-panel-border); font-size: 11px; color: var(--vscode-descriptionForeground);
}
.memory-summary { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.memory-panel {
  display: none; padding: 10px; border-bottom: 1px solid var(--vscode-panel-border);
  background: var(--vscode-editor-inactiveSelectionBackground, rgba(0,0,0,0.05)); font-size: 12px;
}
.memory-panel.open { display: block; }
.memory-panel label { display: block; margin-top: 8px; margin-bottom: 2px; font-weight: 600; }
.memory-panel textarea { width: 100%; min-height: 50px; max-height: 80px; padding: 6px; font-size: 11px; resize: vertical;
  background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; }
.memory-panel .key-facts-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.memory-panel .key-fact-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 10px;
  background: var(--vscode-badge-background); font-size: 11px; }
.memory-panel .key-fact-tag button { background: none; border: none; cursor: pointer; padding: 0; opacity: 0.7; }
.memory-panel .skills-list { margin-top: 6px; }
.memory-panel .skill-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--vscode-panel-border); }
.memory-panel .skill-row button { font-size: 10px; padding: 2px 6px; }
.memory-panel .mem-save-btn { margin-top: 10px; padding: 5px 12px; font-size: 12px; }
.mode-badge {
  font-size: 10px; padding: 2px 7px; border-radius: 10px; font-weight: 600;
  background: var(--vscode-badge-background); color: var(--vscode-badge-foreground);
  cursor: pointer; user-select: none; white-space: nowrap;
}
.mode-badge.agent { background: #7c3aed; color: #fff; }
.messages { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 12px; }
.messages::-webkit-scrollbar { width: 4px; }
.messages::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 2px; }
.empty-state {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px; padding: 20px; opacity: 0.8;
}
.empty-icon { font-size: 32px; }
.empty-title { font-size: 14px; font-weight: 600; }
.empty-sub { font-size: 11px; text-align: center; opacity: 0.7; }
.quick-actions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 4px; }
.quick-btn {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: none; padding: 5px 10px; border-radius: 12px; cursor: pointer; font-size: 11px;
}
.quick-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
.message { display: flex; flex-direction: column; gap: 4px; max-width: 100%; }
.message.user { align-items: flex-end; }
.message.assistant { align-items: flex-start; }
.bubble {
  padding: 8px 12px; border-radius: 12px; max-width: 94%; word-break: break-word; line-height: 1.5; font-size: 13px;
}
.user .bubble { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-bottom-right-radius: 3px; }
.assistant .bubble { background: var(--vscode-editor-inactiveSelectionBackground, var(--vscode-list-hoverBackground)); border-bottom-left-radius: 3px; }
.agent-steps { display: flex; flex-direction: column; gap: 6px; width: 100%; margin-bottom: 6px; }
.agent-step {
  display: flex; align-items: flex-start; gap: 8px; padding: 6px 10px; border-radius: 8px; font-size: 12px;
  background: var(--vscode-list-hoverBackground); border-left: 3px solid #7c3aed;
}
.agent-step.success { border-left-color: #4caf50; }
.agent-step.failure { border-left-color: #f44336; }
.agent-step.reflection { border-left-color: #f59e0b; }
.diff-block { border:1px solid var(--vscode-panel-border); border-radius:8px;
  overflow:hidden; width:100%; margin:4px 0; font-family:monospace; font-size:11px; }
.diff-header { background:rgba(124,58,237,0.15); padding:6px 10px;
  font-size:11px; font-weight:600; color:#a78bfa; display:flex;
  justify-content:space-between; align-items:center; }
.diff-body { max-height:200px; overflow-y:auto; background:var(--vscode-editor-background); }
.diff-line { padding:1px 10px; white-space:pre; }
.diff-add { background:rgba(74,222,128,0.12); color:#4ade80; }
.diff-remove { background:rgba(248,113,113,0.12); color:#f87171; }
.diff-context { color:var(--vscode-descriptionForeground); }
.diff-actions { display:flex; gap:6px; padding:6px 10px;
  border-top:1px solid var(--vscode-panel-border); }
.btn-approve-diff { background:#4ade80; color:#000; border:none; padding:4px 12px;
  border-radius:5px; cursor:pointer; font-size:11px; font-weight:600; }
.btn-reject-diff { background:#f87171; color:#000; border:none; padding:4px 12px;
  border-radius:5px; cursor:pointer; font-size:11px; font-weight:600; }
.step-icon { font-size: 13px; flex-shrink: 0; margin-top: 1px; }
.step-body { flex: 1; min-width: 0; }
.step-title { font-weight: 600; }
.step-detail { color: var(--vscode-descriptionForeground); font-size: 11px; white-space: pre-wrap; word-break: break-all; margin-top: 2px; max-height: 2.4em; overflow: hidden; cursor: pointer; }
.step-detail.expanded { max-height: 120px; overflow-y: auto; }
.plan-block { border: 1px solid #7c3aed; border-radius: 10px; overflow: hidden; width: 100%; margin: 4px 0; }
.plan-header { background: rgba(124,58,237,0.15); padding: 8px 12px; font-size: 12px; font-weight: 600; color: #a78bfa; }
.plan-content { padding: 10px 12px; font-size: 12px; }
.plan-actions { display: flex; gap: 8px; padding: 8px 12px; border-top: 1px solid rgba(124,58,237,0.3); }
.btn-approve { background: #7c3aed; color: #fff; border: none; padding: 5px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
.btn-approve:hover { background: #6d28d9; }
.btn-reject { background: none; color: var(--vscode-foreground); border: 1px solid var(--vscode-panel-border); padding: 5px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; }
.code-block { position: relative; margin: 8px 0; }
.code-lang { font-size: 10px; color: var(--vscode-descriptionForeground); padding: 4px 10px 0; font-family: monospace; }
.code-block pre { background: var(--vscode-editor-background); padding: 10px; border-radius: 6px; overflow-x: auto; font-size: 12px; font-family: var(--vscode-editor-font-family, monospace); border: 1px solid var(--vscode-panel-border); white-space: pre; line-height: 1.5; }
.code-actions { position: absolute; top: 6px; right: 6px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
.code-block:hover .code-actions { opacity: 1; }
.code-actions button { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; }
.thinking { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; color: var(--vscode-descriptionForeground); }
.thinking-dots { display: flex; gap: 3px; }
.thinking-dots span { width: 5px; height: 5px; border-radius: 50%; background: currentColor; animation: bounce 1.2s infinite; }
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%,80%,100% { transform:scale(0.6);opacity:0.5; } 40% { transform:scale(1);opacity:1; } }
.sel-badge { display: none; align-items: center; gap: 4px; padding: 2px 10px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 10px; font-size: 10px; margin: 0 10px 4px; }
.sel-badge.visible { display: flex; }
.input-area { border-top: 1px solid var(--vscode-panel-border); padding: 8px 10px; flex-shrink: 0; }
.input-row { display: flex; align-items: flex-end; gap: 6px; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); border-radius: 8px; padding: 4px 6px; }
.input-row:focus-within { border-color: var(--vscode-focusBorder); }
textarea { flex: 1; background: none; border: none; outline: none; resize: none; color: var(--vscode-input-foreground); font-family: inherit; font-size: 13px; line-height: 1.5; max-height: 180px; min-height: 22px; padding: 3px 2px; }
.send-btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 14px; flex-shrink: 0; height: 30px; }
.send-btn:hover { background: var(--vscode-button-hoverBackground); }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.stop-btn { background: #f44336; color: #fff; border: none; border-radius: 6px; padding: 4px 12px; cursor: pointer; font-size: 11px; font-weight: 600; display: none; margin: 0 10px 4px; }
.stop-btn.visible { display: block; }
.slash-popup, .file-popup {
  display: none; position: absolute; bottom: 100%; left: 10px; right: 10px;
  background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
  border: 1px solid var(--vscode-panel-border); border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3); max-height: 200px; overflow-y: auto; z-index: 100;
}
.slash-popup.visible, .file-popup.visible { display: block; }
.slash-item, .file-item { display: flex; align-items: center; gap: 10px; padding: 7px 12px; cursor: pointer; }
.slash-item:hover, .slash-item.sel, .file-item:hover, .file-item.sel { background: var(--vscode-list-hoverBackground); }
.slash-cmd { font-weight: 700; color: #a78bfa; font-size: 13px; min-width: 80px; }
.slash-desc { color: var(--vscode-descriptionForeground); font-size: 11px; }
.mention-menu { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 10px; align-items: center; }
.mention-pill { padding: 4px 10px; border-radius: 14px; font-size: 12px; cursor: pointer; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border: 1px solid var(--vscode-panel-border); }
.mention-pill:hover { background: var(--vscode-list-hoverBackground); }
.hint { font-size: 10px; color: var(--vscode-descriptionForeground); padding: 0 10px 4px; }
p { margin: 4px 0; } h1,h2,h3 { margin: 8px 0 4px; } ul,ol { padding-left: 18px; } li { margin: 2px 0; }
code { background: var(--vscode-textCodeBlock-background); padding: 1px 4px; border-radius: 3px; font-size: 11px; }
strong { font-weight: 700; } em { font-style: italic; }
</style>
</head>
<body>
<div class="header">
  <div class="status-dot" id="statusDot"></div>
  <span class="header-title">ClawPilot</span>
  <button class="btn-icon" id="clearBtn" title="New chat">🗑</button>
  <button class="btn-icon" id="refreshBtn" title="Refresh">↻</button>
</div>
<div id="session-name" style="font-size:10px;color:var(--vscode-descriptionForeground);padding:2px 12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="Current session"></div>
<div class="model-bar">
  <select id="modelSelect"></select>
  <span class="mode-badge agent" id="modeBadge" title="Toggle agent/chat mode">⚡ Agent</span>
</div>
<div class="index-bar" id="indexBar">
  <span class="index-status" id="indexStatus"></span>
  <button class="btn-icon index-refresh" id="reindexBtn" title="Re-index workspace">Re-index</button>
</div>
<div class="memory-bar" id="memoryBar">
  <span class="memory-summary" id="memorySummary">Memory: —</span>
  <button class="btn-icon index-refresh" id="memoryBtn" title="View / Edit Memory">⚙ Memory</button>
</div>
<div class="memory-panel" id="memoryPanel">
  <label>Project context (max 500)</label>
  <textarea id="memProjectContext" maxlength="500" placeholder="What is this project? Tech stack, architecture..."></textarea>
  <label>User preferences (max 300)</label>
  <textarea id="memUserPreferences" maxlength="300" placeholder="Coding style, preferences..."></textarea>
  <label>Key facts</label>
  <div class="key-facts-list" id="keyFactsList"></div>
  <input type="text" id="newKeyFact" placeholder="Add fact (max 100 chars)" maxlength="100" style="width:100%;margin-top:4px;padding:4px;font-size:11px;">
  <label>Skills</label>
  <div class="skills-list" id="skillsList"></div>
  <button class="mem-save-btn btn-approve" id="memorySaveBtn">Save</button>
</div>
<div class="sel-badge" id="selBadge"><span>📎</span><span id="selLabel">Selection</span></div>
<div class="messages" id="messages">
  <div class="empty-state" id="emptyState">
    <div class="empty-icon">🤖</div>
    <div class="empty-title">ClawPilot</div>
    <div class="empty-sub">Local AI · No cloud · No API keys<br>Type <strong>/</strong> for commands, <strong>@</strong> to attach files</div>
    <div class="quick-actions">
      <button class="quick-btn" data-cmd="/explain">Explain</button>
      <button class="quick-btn" data-cmd="/fix">Fix bugs</button>
      <button class="quick-btn" data-cmd="/refactor">Refactor</button>
      <button class="quick-btn" data-cmd="/test">Write tests</button>
      <button class="quick-btn" data-cmd="/plan ">Plan feature</button>
      <button class="quick-btn" data-cmd="/review">Review</button>
    </div>
  </div>
</div>
<div style="position:relative">
  <div class="slash-popup" id="slashPopup"></div>
  <div class="file-popup" id="filePopup"></div>
</div>
<div class="hint">/ commands · @ attach files · Enter to send · Shift+Enter newline</div>
<div class="input-area" style="position:relative">
  <div id="slash-menu" style="display:none;position:absolute;bottom:100%;left:0;right:0;background:var(--vscode-editorWidget-background);border:1px solid var(--vscode-panel-border);border-radius:8px;overflow:hidden;z-index:100;max-height:220px;overflow-y:auto;box-shadow:0 -4px 12px rgba(0,0,0,0.3);"></div>
  <div id="mention-menu" class="mention-menu" style="display:none;position:absolute;bottom:100%;left:0;right:0;background:var(--vscode-editorWidget-background);border:1px solid var(--vscode-panel-border);border-radius:8px;z-index:100;box-shadow:0 -4px 12px rgba(0,0,0,0.3);"></div>
  <div class="input-row">
    <textarea id="input" placeholder="Ask anything... or type / for commands" rows="1"></textarea>
    <button id="stopBtn" title="Stop" style="display:none;background:#f87171;color:#000;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:13px;font-weight:600;flex-shrink:0;">&#9632; Stop</button>
    <button class="send-btn" id="sendBtn">➤</button>
  </div>
  <div id="char-counter" style="font-size:10px;color:var(--vscode-descriptionForeground);text-align:right;padding:0 4px 2px;">0</div>
</div>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
let agentMode = true, isRunning = false, selText = '', selLang = '';
let currentBubble = null, currentStepsEl = null, attachedFiles = [];
let slashIdx = -1, fileIdx = -1;

const SLASH = [
  {cmd:'/explain',desc:'Explain selected code'},
  {cmd:'/fix',desc:'Find and fix bugs'},
  {cmd:'/refactor',desc:'Refactor for quality'},
  {cmd:'/test',desc:'Write unit tests'},
  {cmd:'/docs',desc:'Generate documentation'},
  {cmd:'/review',desc:'Code review'},
  {cmd:'/optimize',desc:'Optimize performance'},
  {cmd:'/plan',desc:'Build step-by-step plan (agent)'},
  {cmd:'/edit',desc:'Describe changes to make (agent)'},
  {cmd:'/build',desc:'Build a new feature (agent)'},
  {cmd:'/run',desc:'Run terminal command (agent)'},
  {cmd:'/types',desc:'Add TypeScript types'},
];

const $=id=>document.getElementById(id);
const msgs=$('messages'), input=$('input'), sendBtn=$('sendBtn'), stopBtn=$('stopBtn');
const statusDot=$('statusDot'), modelSel=$('modelSelect'), modeBadge=$('modeBadge');
const selBadge=$('selBadge'), slashPopup=$('slashPopup'), filePopup=$('filePopup');
const emptyState=$('emptyState'), sessionNameEl=$('session-name');
const charCounter=$('char-counter'), slashMenu=$('slash-menu'), mentionMenu=$('mention-menu');
const MENTION_TYPES = [{ type:'file', label:'file' }, { type:'git', label:'git' }, { type:'symbol', label:'symbol' }, { type:'memory', label:'memory' }, { type:'workspace', label:'workspace' }];
let allCommands = [];

vscode.postMessage({type:'getConnectionStatus'});
vscode.postMessage({type:'getModels'});
vscode.postMessage({type:'getIndexStatus'});
vscode.postMessage({type:'getMemory'});
setInterval(()=>vscode.postMessage({type:'getSelectionContext'}),1500);

modeBadge.onclick=()=>{
  agentMode=!agentMode;
  modeBadge.textContent=agentMode?'⚡ Agent':'💬 Chat';
  modeBadge.classList.toggle('agent',agentMode);
};
$('clearBtn').onclick=()=>{
  vscode.postMessage({type:'clearChat'});
  msgs.innerHTML=''; msgs.appendChild(emptyState); emptyState.style.display='flex';
  attachedFiles=[]; currentBubble=null; currentStepsEl=null;
};
$('refreshBtn').onclick=()=>{
  vscode.postMessage({type:'getModels'});
  vscode.postMessage({type:'getConnectionStatus'});
};
$('reindexBtn').onclick=()=>vscode.postMessage({type:'reindexWorkspace'});
$('memoryBtn').onclick=()=>{ const p=$('memoryPanel'); p.classList.toggle('open',!p.classList.contains('open')); };
$('memorySaveBtn').onclick=()=>{
  const core={ projectContext: $('memProjectContext').value, userPreferences: $('memUserPreferences').value, keyFacts: window._keyFacts||[] };
  vscode.postMessage({type:'updateCore',patch:core});
};
$('newKeyFact').onkeydown=(e)=>{ if(e.key==='Enter'){ const v=$('newKeyFact').value.trim(); if(v){ (window._keyFacts=window._keyFacts||[]).push(v); $('newKeyFact').value=''; renderKeyFacts(); vscode.postMessage({type:'updateCore',patch:{keyFacts:window._keyFacts}}); } } };
function renderKeyFacts(){ const el=$('keyFactsList'); if(!el)return; const facts=window._keyFacts||[]; el.innerHTML=facts.map((f,i)=>'<span class="key-fact-tag">'+esc(f)+' <button data-i="'+i+'" title="Remove">×</button></span>').join(''); el.querySelectorAll('button').forEach(btn=>{ btn.onclick=()=>{ const i=parseInt(btn.dataset.i,10); window._keyFacts=window._keyFacts||[]; window._keyFacts.splice(i,1); renderKeyFacts(); vscode.postMessage({type:'updateCore',patch:{keyFacts:window._keyFacts}}); }; }); }
modelSel.onchange=()=>vscode.postMessage({type:'changeModel',model:modelSel.value});
stopBtn.onclick=()=>{vscode.postMessage({type:'stopAgent'});stopBtn.disabled=true;stopBtn.textContent='Stopping…';};

document.querySelectorAll('.quick-btn').forEach(b=>{
  b.onclick=()=>{ input.value=b.dataset.cmd; autoSz(); showSlash(b.dataset.cmd); input.focus(); };
});

input.addEventListener('input',()=>{
  const v=input.value, c=input.selectionStart;
  if(charCounter) charCounter.textContent = v.length.toString();
  if(v.startsWith('/')&&!v.includes(' ')&&allCommands.length){
    const filtered=allCommands.filter(cmd=>cmd.name.startsWith(v.slice(1).toLowerCase()));
    if(filtered.length&&slashMenu){
      slashMenu.innerHTML=filtered.map((cmd,i)=>'<div class="slash-item" data-idx="'+i+'" data-usage="'+esc(cmd.usage)+'" style="padding:6px 12px;cursor:pointer;display:flex;gap:8px;align-items:baseline;"><span style="color:#a78bfa;font-weight:600;font-size:12px">'+esc('/'+cmd.name)+'</span><span style="color:var(--vscode-descriptionForeground);font-size:11px">'+esc(cmd.description)+'</span></div>').join('');
      slashMenu.style.display='block';
      slashMenu.querySelectorAll('.slash-item').forEach(el=>{
        el.addEventListener('mousedown',(e)=>{ e.preventDefault(); const usage=el.getAttribute('data-usage')||''; input.value=usage.replace(/<[^>]*>/g,' ').trim()+(usage.includes('<')?' ':''); slashMenu.style.display='none'; input.focus(); if(charCounter) charCounter.textContent=input.value.length.toString(); });
      });
    } else if(slashMenu) slashMenu.style.display='none';
  } else if(slashMenu) slashMenu.style.display='none';
  autoSz();
  const sm=v.match(/^\\/(\\w*)$/);
  if(sm&&!allCommands.length){ const p=sm[1].toLowerCase(); const f=SLASH.filter(s=>s.cmd.slice(1).startsWith(p)); if(f.length){renderSlash(f);return;} }
  hideSlash();
  const am=v.slice(0,c).match(/@(\\w*)$/);
  if(am){
    const segment=v.slice(0,c).slice(v.slice(0,c).lastIndexOf('@'));
    if(segment.indexOf(':')===-1){
      if(mentionMenu){
        mentionMenu.innerHTML=MENTION_TYPES.map(m=>'<button type="button" class="mention-pill" data-type="'+esc(m.type)+'" data-label="'+esc(m.label)+'">@'+esc(m.label)+'</button>').join('');
        mentionMenu.style.display='block';
        mentionMenu.querySelectorAll('.mention-pill').forEach(btn=>{
          btn.addEventListener('mousedown',function(e){ e.preventDefault();
            const typ=this.dataset.type, val=input.value, pos=input.selectionStart;
            const start=val.slice(0,pos).lastIndexOf('@');
            const before=val.slice(0,start), after=val.slice(pos);
            const insert=typ==='workspace'?'@workspace ':'@'+typ+':';
            input.value=before+insert+after;
            input.selectionStart=input.selectionEnd=before.length+insert.length;
            mentionMenu.style.display='none'; input.focus(); autoSz();
            if(charCounter) charCounter.textContent=input.value.length.toString();
          });
        });
      }
      return;
    }
    vscode.postMessage({type:'getWorkspaceFiles',query:am[1]});
    return;
  }
  if(mentionMenu) mentionMenu.style.display='none';
  hideFile();
});
input.addEventListener('blur',()=>setTimeout(()=>{ if(slashMenu) slashMenu.style.display='none'; if(mentionMenu) mentionMenu.style.display='none'; },150));

input.addEventListener('keydown',e=>{
  if(slashPopup.classList.contains('visible')){
    const its=slashPopup.querySelectorAll('.slash-item');
    if(e.key==='ArrowDown'){e.preventDefault();slashIdx=Math.min(slashIdx+1,its.length-1);hlSlash();return;}
    if(e.key==='ArrowUp'){e.preventDefault();slashIdx=Math.max(slashIdx-1,0);hlSlash();return;}
    if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();(its[Math.max(0,slashIdx)]||its[0])?.click();return;}
    if(e.key==='Escape'){hideSlash();return;}
  }
  if(filePopup.classList.contains('visible')){
    const its=filePopup.querySelectorAll('.file-item');
    if(e.key==='ArrowDown'){e.preventDefault();fileIdx=Math.min(fileIdx+1,its.length-1);hlFile();return;}
    if(e.key==='ArrowUp'){e.preventDefault();fileIdx=Math.max(fileIdx-1,0);hlFile();return;}
    if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();(its[Math.max(0,fileIdx)]||its[0])?.click();return;}
    if(e.key==='Escape'){hideFile();return;}
  }
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}
});

function autoSz(){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,180)+'px';}

function showSlash(partial){
  const p=(partial||'/').replace(/^\//,'').toLowerCase();
  renderSlash(SLASH.filter(s=>s.cmd.slice(1).startsWith(p)));
}
function renderSlash(items){
  if(!items.length){hideSlash();return;}
  slashPopup.innerHTML=items.map((it,i)=>
    '<div class="slash-item" data-cmd="'+it.cmd+'">' +
    '<span class="slash-cmd">'+it.cmd+'</span>' +
    '<span class="slash-desc">'+it.desc+'</span></div>'
  ).join('');
  slashPopup.querySelectorAll('.slash-item').forEach(el=>{
    el.onclick=()=>{input.value=el.dataset.cmd+' ';hideSlash();input.focus();autoSz();};
  });
  slashIdx=0; hlSlash(); slashPopup.classList.add('visible');
}
function hideSlash(){slashPopup.classList.remove('visible');slashIdx=-1;}
function hlSlash(){slashPopup.querySelectorAll('.slash-item').forEach((el,i)=>{el.classList.toggle('sel',i===slashIdx);if(i===slashIdx)el.scrollIntoView({block:'nearest'});});}

function renderFile(files){
  if(!files.length){hideFile();return;}
  filePopup.innerHTML=files.slice(0,20).map(f=>'<div class="file-item" data-f="'+esc(f)+'">'+esc(f)+'</div>').join('');
  filePopup.querySelectorAll('.file-item').forEach(el=>{
    el.onclick=()=>{
      const v=input.value,c=input.selectionStart;
      const b=v.slice(0,c).replace(/@([^\\s]*)$/,'@'+el.dataset.f+' ');
      input.value=b+v.slice(c);
      if(!attachedFiles.includes(el.dataset.f))attachedFiles.push(el.dataset.f);
      hideFile();input.focus();autoSz();
    };
  });
  fileIdx=0; hlFile(); filePopup.classList.add('visible');
}
function hideFile(){filePopup.classList.remove('visible');fileIdx=-1;}
function hlFile(){filePopup.querySelectorAll('.file-item').forEach((el,i)=>el.classList.toggle('sel',i===fileIdx));}

function send(){
  const text=input.value.trim();
  if(!text||isRunning)return;
  const code=selText||'', files=[...attachedFiles];
  attachedFiles=[]; input.value=''; autoSz();
  hideSlash(); hideFile();
  vscode.postMessage({type:'sendMessage',text,codeContext:code,files,agentMode});
}
sendBtn.onclick=send;

function setRunning(r){
  isRunning=r; sendBtn.disabled=r;
  stopBtn.classList.toggle('visible',r);
}
function agentEnd(){
  setRunning(false);
  stopBtn.style.display='none'; sendBtn.style.display='inline-block';
  stopBtn.disabled=false; stopBtn.textContent='\u25A0 Stop';
}

function hideEmpty(){emptyState.style.display='none';}
function scrollBot(){msgs.scrollTop=msgs.scrollHeight;}
function esc(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function addUser(text){
  hideEmpty();
  const d=document.createElement('div'); d.className='message user';
  d.innerHTML='<div class="bubble">'+esc(text)+'</div>';
  msgs.appendChild(d); scrollBot();
}

function startAssistant(){
  hideEmpty();
  const d=document.createElement('div'); d.className='message assistant';
  const b=document.createElement('div'); b.className='bubble';
  b.innerHTML='<div class="thinking"><div class="thinking-dots"><span></span><span></span><span></span></div> Thinking...</div>';
  d.appendChild(b); msgs.appendChild(d); currentBubble=b; currentStepsEl=null; scrollBot();
}

function streamChunk(chunk){
  if(!currentBubble)startAssistant();
  const t=currentBubble.querySelector('.thinking'); if(t)t.remove();
  let s=currentBubble.querySelector('.stream-raw');
  if(!s){s=document.createElement('span');s.className='stream-raw';currentBubble.appendChild(s);}
  s.textContent=(s.textContent||'')+chunk;
  scrollBot();
}

function finalize(html){
  if(!currentBubble)return;
  currentBubble.innerHTML=html||''; attachActions(currentBubble); currentBubble=null; scrollBot();
}

function attachActions(el){
  el.querySelectorAll('.code-block').forEach(block=>{
    const pre=block.querySelector('pre'); if(!pre)return;
    const cp=block.querySelector('.copy-btn'), ins=block.querySelector('.insert-btn');
    if(cp)cp.onclick=()=>{navigator.clipboard?.writeText(pre.textContent||'');cp.textContent='Copied!';setTimeout(()=>cp.textContent='Copy',1200);};
    if(ins)ins.onclick=()=>vscode.postMessage({type:'insertCode',code:pre.textContent||''});
  });
}

function agentStart(){
  setRunning(true); hideEmpty();
  stopBtn.style.display='inline-block'; sendBtn.style.display='none';
  const d=document.createElement('div'); d.className='message assistant';
  const b=document.createElement('div'); b.className='bubble';
  d.appendChild(b); msgs.appendChild(d); currentBubble=b;
  const steps=document.createElement('div'); steps.className='agent-steps';
  b.appendChild(steps); currentStepsEl=steps; scrollBot();
}

function addToolCall(name,args,step){
  if(!currentStepsEl){agentStart();}
  const s=document.createElement('div'); s.className='agent-step'; s.id='step'+step;
  const argsStr=args?Object.entries(args).map(([k,v])=>k+': '+String(v).slice(0,60)).join(' · '):'';
  s.innerHTML='<span class="step-icon">⚙</span><div class="step-body"><div class="step-title">'+esc(name)+'</div>'+(argsStr?'<div class="step-detail">'+esc(argsStr)+'</div>':'')+'</div>';
  const det=s.querySelector('.step-detail');
  if(det)det.onclick=()=>det.classList.toggle('expanded');
  currentStepsEl.appendChild(s); scrollBot();
}

function addToolResult(name,output,ok,step){
  const s=document.getElementById('step'+step); if(!s)return;
  s.classList.add(ok?'success':'failure');
  s.querySelector('.step-icon').textContent=ok?'✓':'✗';
  const d=document.createElement('div'); d.className='step-detail';
  d.textContent=(output||'').slice(0,400); d.onclick=()=>d.classList.toggle('expanded');
  s.querySelector('.step-body').appendChild(d); scrollBot();
}

function addReflection(content,attempt){
  if(!currentStepsEl){agentStart();}
  const s=document.createElement('div'); s.className='agent-step reflection';
  s.innerHTML='<span class="step-icon">🔄</span><div class="step-body"><div class="step-title">Reflecting (attempt '+esc(String(attempt||1))+')</div><div class="step-detail">'+esc(content||'')+'</div></div>';
  const det=s.querySelector('.step-detail');
  if(det)det.onclick=()=>det.classList.toggle('expanded');
  currentStepsEl.appendChild(s); scrollBot();
}

function showDiffPreview(stepId,filePath,isNew,html){
  if(!currentStepsEl){agentStart();}
  const wrap=document.createElement('div'); wrap.className='diff-block';
  wrap.innerHTML='<div class="diff-header"><span>'+(isNew?'✚ New file: ':'~ Edit: ')+esc(filePath)+'</span></div><div class="diff-body">'+html+'</div><div class="diff-actions"><button class="btn-approve-diff">✓ Apply</button><button class="btn-reject-diff">✕ Reject</button></div>';
  wrap.querySelector('.btn-approve-diff').onclick=()=>{
    wrap.querySelector('.diff-actions').innerHTML='<em style="font-size:11px;color:#4ade80">Applied.</em>';
    vscode.postMessage({type:'approveDiff',stepId});
  };
  wrap.querySelector('.btn-reject-diff').onclick=()=>{
    wrap.querySelector('.diff-actions').innerHTML='<em style="font-size:11px;color:#f87171">Rejected.</em>';
    vscode.postMessage({type:'rejectDiff',stepId});
  };
  currentStepsEl.appendChild(wrap); scrollBot();
}

function showPlan(html){
  setRunning(false); hideEmpty();
  const d=document.createElement('div'); d.className='message assistant';
  const b=document.createElement('div'); b.className='bubble'; b.style.padding='4px';
  const plan=document.createElement('div'); plan.className='plan-block';
  plan.innerHTML='<div class="plan-header">📋 Plan — Review before executing</div><div class="plan-content">'+html+'</div><div class="plan-actions"><button class="btn-approve" id="approveBtn">▶ Execute Plan</button><button class="btn-reject" id="rejectBtn">✕ Reject</button></div>';
  b.appendChild(plan); d.appendChild(b); msgs.appendChild(d); currentBubble=null;
  plan.querySelector('#approveBtn').onclick=()=>{
    plan.querySelector('.plan-actions').innerHTML='<em style="font-size:12px;opacity:0.7">Executing...</em>';
    vscode.postMessage({type:'confirmPlan'});
  };
  plan.querySelector('#rejectBtn').onclick=()=>{
    plan.querySelector('.plan-actions').innerHTML='<em style="font-size:12px;color:#f44336">Plan rejected.</em>';
    vscode.postMessage({type:'rejectPlan'});
  };
  scrollBot();
}

window.addEventListener('message',e=>{
  const m=e.data;
  switch(m.type){
    case 'userMessage': addUser(m.text); startAssistant(); setRunning(true); break;
    case 'startAssistantMessage': startAssistant(); setRunning(true); break;
    case 'streamChunk': streamChunk(m.chunk); break;
    case 'finalizeAssistantMessage': finalize(m.html); agentEnd(); break;
    case 'agentStart': agentStart(); break;
    case 'agentThinking': break;
    case 'agentToolCall': addToolCall(m.toolName,m.toolArgs,m.step); break;
    case 'agentToolResult': addToolResult(m.toolName,m.output,m.success,m.step); break;
    case 'agentReflection': addReflection(m.content,m.attempt); break;
    case 'agentDiffPreview': showDiffPreview(m.stepId,m.path,m.isNew,m.html); break;
    case 'agentPlan': showPlan(m.html); break;
    case 'agentDone':
      if(m.html&&currentBubble){
        const r=document.createElement('div'); r.innerHTML=m.html;
        currentBubble.appendChild(r); attachActions(r);
      }
      if(m.error&&currentBubble){
        const er=document.createElement('div');
        er.style.cssText='color:#f44336;font-size:12px;margin-top:6px;';
        er.textContent='⚠ '+m.error; currentBubble.appendChild(er);
      }
      currentBubble=null; agentEnd(); scrollBot(); break;
    case 'planExecuting': startAssistant(); setRunning(true); break;
    case 'planRejected': agentEnd(); break;
    case 'models': renderModels(m.models,m.current); break;
    case 'connectionStatus': statusDot.classList.toggle('connected',m.connected); break;
    case 'indexStatus':
      const statusEl=$('indexStatus');
      if(statusEl){
        statusEl.textContent=m.message||'';
        statusEl.classList.toggle('indexing',!!m.indexing);
        if(m.fileCount!=null) statusEl.textContent='Indexing workspace... ('+m.fileCount+' files)';
        if(!m.indexing&&m.chunkCount!=null) statusEl.textContent=m.chunkCount+' chunks indexed';
      }
      break;
    case 'memoryData':
      const core=m.core||{};
      $('memProjectContext').value=core.projectContext||'';
      $('memUserPreferences').value=core.userPreferences||'';
      window._keyFacts=Array.isArray(core.keyFacts)?core.keyFacts.slice():[];
      renderKeyFacts();
      const recall=m.recallCount||0, arch=m.archivalCount||0, skillList=m.skills||[];
      const sum=[core.projectContext?core.projectContext.slice(0,40)+'…':'—', 'R:'+recall, 'A:'+arch, 'S:'+skillList.length].join(' · ');
      const sumEl=$('memorySummary'); if(sumEl) sumEl.textContent='Memory: '+sum;
      const skillsEl=$('skillsList'); if(skillsEl) skillsEl.innerHTML=skillList.map(s=>'<div class="skill-row"><span>'+esc(s.name)+'</span><button data-id="'+esc(s.id)+'">Delete</button></div>').join('')||'<span style="opacity:0.7">No skills</span>';
      skillsEl.querySelectorAll('button').forEach(btn=>{ btn.onclick=()=>vscode.postMessage({type:'deleteSkill',id:btn.dataset.id}); });
      break;
    case 'selectionContext':
      selText=m.text; selLang=m.lang;
      selBadge.classList.toggle('visible',!!m.text);
      if(m.text)$('selLabel').textContent=m.text.split('\\n').length+' lines ('+m.lang+')';
      break;
    case 'workspaceFiles': renderFile(m.files); break;
    case 'injectMessage': input.value=m.text; if(m.codeContext)selText=m.codeContext; autoSz(); input.focus(); break;
    case 'injectPrompt': input.value=m.text||''; autoSz(); break;
    case 'submitPrompt': if(input.value.trim())send(); break;
    case 'loadHistory':
      msgs.innerHTML=''; msgs.appendChild(emptyState); emptyState.style.display='none';
      if(sessionNameEl) sessionNameEl.textContent=m.sessionName||'';
      for(const msg of (m.messages||[])){
        if(msg.role==='user') addUser(msg.content);
        else {
          hideEmpty();
          const d=document.createElement('div'); d.className='message assistant';
          const b=document.createElement('div'); b.className='bubble';
          b.innerHTML=msg.html||esc(msg.content); d.appendChild(b); msgs.appendChild(d); attachActions(b); scrollBot();
        }
      }
      scrollBot();
      break;
    case 'clearMessages': msgs.innerHTML=''; msgs.appendChild(emptyState); emptyState.style.display='flex'; break;
    case 'error':
      if(currentBubble){currentBubble.innerHTML='<span style="color:#f44336">⚠ '+esc(m.message||'Error')+'</span>';currentBubble=null;}
      agentEnd(); break;
    case 'slashCommands': allCommands=m.commands||[]; break;
    case 'assistantMessage':
      hideEmpty();
      const ad=document.createElement('div'); ad.className='message assistant';
      const ab=document.createElement('div'); ab.className='bubble';
      ab.innerHTML=m.html||esc(m.text||'');
      ad.appendChild(ab); msgs.appendChild(ad); attachActions(ab); scrollBot();
      break;
    case 'setModel': if(modelSel&&m.model){ modelSel.value=m.model; vscode.postMessage({type:'changeModel',model:m.model}); } break;
  }
});

function renderModels(models,current){
  modelSel.innerHTML='';
  if(!models.length){const o=document.createElement('option');o.textContent='— No models —';modelSel.appendChild(o);return;}
  models.forEach(m=>{
    const o=document.createElement('option');
    o.value=m.name;
    const gb=(m.size/1e9).toFixed(1);
    o.textContent=m.name+' ('+gb+'GB)';
    if(m.name===current)o.selected=true;
    modelSel.appendChild(o);
  });
}
</script>
</body>
</html>`;
    }
}

function getNonce() {
    let text = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) { text += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return text;
}
