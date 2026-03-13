import * as vscode from 'vscode';
import * as path from 'path';
import { spawn } from 'child_process';
import type { LLMProvider, ChatMessage } from './providers/llmProvider';
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
    private _client: LLMProvider;
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
    private _log = vscode.window.createOutputChannel('ClawPilot Debug');

    constructor(
        private readonly _extensionUri: vscode.Uri,
        client: LLMProvider,
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

    setClient(client: LLMProvider): void {
        this._client = client;
        const maxRetries = vscode.workspace.getConfiguration('clawpilot').get<number>('reflexionMaxRetries', 3);
        this._agentRunner = new AgentRunner(client, new AgentTools(this._workspaceIndex, this._memoryStore, this._skillStore), maxRetries);
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        this._log.appendLine('resolveWebviewView called, visible=' + webviewView.visible);
        this._log.show(true);
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        this._isAgentRunning = false; // reset stale state on webview recreation
        webviewView.webview.html = this._getHtml();
        webviewView.webview.onDidReceiveMessage(msg => this._handleMessage(msg));
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this._refreshModels();
                this._checkConnection();
                this._sendIndexStatus();
            }
        });
        if (this._historyStore) {
            const session = this._historyStore.getOrCreateActiveSession();
            this._activeSessionId = session.id;
        }
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
                try {
                    await this._handleUserMessage(msg.text, msg.codeContext, msg.files, msg.agentMode);
                } catch (err: unknown) {
                    this._view?.webview.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
                }
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
            case 'ready':
                await this._refreshModels();
                await this._checkConnection();
                this._sendIndexStatus();
                await this._sendMemoryData();
                if (this._historyStore && this._activeSessionId) {
                    const session = this._historyStore.loadSession(this._activeSessionId);
                    if (session) this._sendHistoryToWebview(session);
                }
                this._view?.webview.postMessage({
                    type: 'slashCommands',
                    commands: SLASH_COMMANDS.map(c => ({ name: c.name, usage: c.usage, description: c.description }))
                });
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
                this._isAgentRunning = false;
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
            case 'runCommand':
                if (typeof msg.command === 'string') {
                    vscode.commands.executeCommand(msg.command);
                }
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
                case 'install': {
                    const modelArg = arg.trim();
                    if (!modelArg) {
                        this._view?.webview.postMessage({
                            type: 'assistantMessage',
                            html: renderMarkdownToHtml('Usage: `/install <model>` — e.g. `/install qwen2.5-coder:7b`')
                        });
                        return;
                    }
                    await this._handleInstallModel(modelArg);
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
        let isAgentTask = agentModeOverride ?? false;

        if (slashMatch) {
            processedText = this._expandSlashCommand(slashMatch[1], slashMatch[2], codeContext);
            if (agentSlashCmds.includes(slashMatch[1])) {
                isAgentTask = true;
            }
        }

        try { processedText = await this._resolveMentionsInMessage(processedText); } catch { /* skip unresolvable mentions */ }

        let fullMessage = processedText;
        const contextTypes: string[] = [];
        if (this._contextRegistry) {
            try {
                const ctx = await this._contextRegistry.assemble(processedText, 8000);
                if (ctx.text && ctx.text.trim()) {
                    fullMessage = ctx.text + '\n\n' + fullMessage;
                    contextTypes.push(...ctx.sources);
                }
            } catch {
                // Non-blocking
            }
        }

        if (codeContext && !fullMessage.includes(codeContext)) {
            fullMessage = fullMessage + '\n\n**Selected code:**\n\`\`\`' + this._getEditorLang() + '\n' + codeContext + '\n\`\`\`';
            if (!contextTypes.includes('selection')) contextTypes.push('selection');
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
            if (!contextTypes.includes('files')) contextTypes.push('files');
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

        this._view?.webview.postMessage({ type: 'userMessage', text, contextTypes });

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
            this._log.appendLine('_refreshModels: calling listModels...');
            const models = await this._client.listModels();
            this._log.appendLine('_refreshModels: got ' + models.length + ' models, posting...');
            const config = vscode.workspace.getConfiguration('clawpilot');
            const current = config.get<string>('model', 'llama3');
            this._view?.webview.postMessage({ type: 'models', models, current });
            this._log.appendLine('_refreshModels: posted models message');
            const ok = await this._client.isAvailable();
            this._view?.webview.postMessage({
                type: 'providerModelStatus',
                providerLabel: this._client.displayName,
                model: current || '',
                connected: ok,
            });
        } catch (e) {
            this._log.appendLine('_refreshModels CATCH: ' + (e instanceof Error ? e.message : String(e)));
            this._view?.webview.postMessage({ type: 'models', models: [], current: '' });
            this._view?.webview.postMessage({
                type: 'providerModelStatus',
                providerLabel: this._client.displayName,
                model: '',
                connected: false,
            });
        }
    }

    private async _checkConnection() {
        const ok = await this._client.isAvailable();
        const config = vscode.workspace.getConfiguration('clawpilot');
        const model = config.get<string>('model', '');
        this._view?.webview.postMessage({ type: 'connectionStatus', connected: ok });
        this._view?.webview.postMessage({
            type: 'providerModelStatus',
            providerLabel: this._client.displayName,
            model: model || '',
            connected: ok,
        });
    }

    private async _handleInstallModel(modelName: string): Promise<void> {
        if (!this._client.pullModel) {
            this._view?.webview.postMessage({
                type: 'assistantMessage',
                html: renderMarkdownToHtml('`/install` is only available for the **Ollama** provider. Switch provider in the header or settings.')
            });
            return;
        }
        this._view?.webview.postMessage({ type: 'installStart', model: modelName });
        const proc = spawn('ollama', ['pull', modelName], { shell: true, windowsHide: true });
        const lines: string[] = [];
        proc.stdout?.on('data', (d: Buffer) => {
            const line = d.toString().trim();
            if (line) {
                lines.push(line);
                this._view?.webview.postMessage({ type: 'installProgress', line });
            }
        });
        proc.stderr?.on('data', (d: Buffer) => {
            const line = d.toString().trim();
            if (line) {
                lines.push(line);
                this._view?.webview.postMessage({ type: 'installProgress', line });
            }
        });
        proc.on('close', async code => {
            if (code === 0) {
                await vscode.workspace.getConfiguration('clawpilot').update('model', modelName, vscode.ConfigurationTarget.Global);
                this._view?.webview.postMessage({ type: 'setModel', model: modelName });
                this._view?.webview.postMessage({ type: 'installDone', model: modelName, success: true });
            } else {
                this._view?.webview.postMessage({ type: 'installDone', model: modelName, success: false, error: `Exit code ${code}` });
            }
        });
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
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);background:var(--vscode-sideBar-background);display:flex;flex-direction:column;height:100vh;overflow:hidden}
/* ── Top bar ── */
.topbar{display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--vscode-panel-border);flex-shrink:0;min-height:36px}
.status-dot{width:7px;height:7px;border-radius:50%;background:#555;flex-shrink:0;transition:background .25s}
.status-dot.ok{background:#4ade80}
.provider-btn{flex:1;font-size:12px;font-weight:600;cursor:pointer;background:none;border:none;color:var(--vscode-foreground);text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:2px 4px;border-radius:4px}
.provider-btn:hover{background:var(--vscode-toolbar-hoverBackground)}
.icon-btn{background:none;border:none;cursor:pointer;padding:4px 5px;color:var(--vscode-foreground);opacity:.7;font-size:14px;border-radius:4px;flex-shrink:0;line-height:1}
.icon-btn:hover{opacity:1;background:var(--vscode-toolbar-hoverBackground)}
.session-name{font-size:10px;color:var(--vscode-descriptionForeground);padding:1px 12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-height:13px}
/* ── Toolbar: model + mode ── */
.toolbar{display:flex;align-items:center;gap:6px;padding:5px 10px;border-bottom:1px solid var(--vscode-panel-border);flex-shrink:0}
.model-select{flex:1;min-width:0;background:var(--vscode-dropdown-background);color:var(--vscode-dropdown-foreground);border:1px solid var(--vscode-dropdown-border);padding:3px 6px;border-radius:5px;font-size:11px;cursor:pointer;outline:none}
.mode-group{display:flex;gap:2px;flex-shrink:0}
.mode-btn{font-size:11px;font-weight:600;padding:3px 10px;border-radius:10px;cursor:pointer;border:1px solid var(--vscode-panel-border);background:none;color:var(--vscode-descriptionForeground);white-space:nowrap;transition:all .15s}
.mode-btn.active-agent{background:#7c3aed;color:#fff;border-color:#7c3aed}
.mode-btn.active-ask{background:#0ea5e9;color:#fff;border-color:#0ea5e9}
/* ── Status bar ── */
.status-bar{display:flex;align-items:center;gap:4px;padding:2px 10px;border-bottom:1px solid var(--vscode-panel-border);font-size:10px;color:var(--vscode-descriptionForeground);flex-shrink:0}
.index-info{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.index-info.indexing::before{content:'';display:inline-block;width:8px;height:8px;margin-right:4px;vertical-align:middle;border:1.5px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.text-btn{background:none;border:none;cursor:pointer;font-size:10px;color:var(--vscode-descriptionForeground);padding:1px 4px;border-radius:3px;white-space:nowrap}
.text-btn:hover{color:var(--vscode-foreground);background:var(--vscode-toolbar-hoverBackground)}
/* ── Memory panel ── */
.memory-panel{display:none;padding:8px 10px;border-bottom:1px solid var(--vscode-panel-border);background:var(--vscode-editor-inactiveSelectionBackground,rgba(0,0,0,.06));font-size:11px;max-height:220px;overflow-y:auto}
.memory-panel.open{display:block}
.memory-panel label{display:block;margin-top:6px;margin-bottom:2px;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.5px;opacity:.7}
.memory-panel textarea{width:100%;min-height:44px;max-height:70px;padding:5px;font-size:11px;resize:vertical;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:4px;outline:none}
.key-facts-list{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}
.key-fact-tag{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:8px;background:var(--vscode-badge-background);font-size:10px}
.key-fact-tag button{background:none;border:none;cursor:pointer;padding:0;opacity:.7;font-size:11px}
.skills-list{margin-top:4px}
.skill-row{display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--vscode-panel-border)}
.skill-row button{font-size:10px;padding:1px 5px}
.mem-save-btn{margin-top:8px;padding:4px 10px;font-size:11px}
/* ── Setup empty state ── */
.empty-setup{display:none;flex:1;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px;text-align:center}
.empty-setup.visible{display:flex}
.empty-setup-title{font-size:13px;font-weight:600}
.empty-setup-sub{font-size:11px;opacity:.75;line-height:1.5}
/* ── Messages area ── */
.messages{flex:1;overflow-y:auto;padding:10px 10px 6px;display:flex;flex-direction:column;gap:10px}
.messages::-webkit-scrollbar{width:3px}
.messages::-webkit-scrollbar-thumb{background:var(--vscode-scrollbarSlider-background);border-radius:2px}
/* ── Welcome state ── */
.empty-state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px}
.empty-icon{font-size:28px}
.empty-title{font-size:14px;font-weight:700}
.empty-sub{font-size:11px;text-align:center;opacity:.65;line-height:1.5}
.quick-actions{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:2px}
.quick-btn{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border:none;padding:5px 11px;border-radius:10px;cursor:pointer;font-size:11px}
.quick-btn:hover{background:var(--vscode-button-secondaryHoverBackground)}
/* ── Message bubbles ── */
.message{display:flex;flex-direction:column;gap:3px;max-width:100%}
.message.user{align-items:flex-end}
.message.assistant{align-items:flex-start}
.ctx-tags{font-size:9px;color:var(--vscode-descriptionForeground);display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;margin-bottom:1px}
.ctx-tag{background:var(--vscode-badge-background);padding:1px 5px;border-radius:4px;opacity:.8}
.bubble{padding:7px 11px;border-radius:12px;max-width:94%;word-break:break-word;line-height:1.55;font-size:13px}
.user .bubble{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border-bottom-right-radius:3px}
.assistant .bubble{background:var(--vscode-editor-inactiveSelectionBackground,var(--vscode-list-hoverBackground));border-bottom-left-radius:3px}
/* ── Agent steps ── */
.agent-steps{display:flex;flex-direction:column;gap:5px;width:100%;margin-bottom:5px}
.agent-step{display:flex;align-items:flex-start;gap:7px;padding:5px 9px;border-radius:7px;font-size:11px;background:var(--vscode-list-hoverBackground);border-left:3px solid #7c3aed}
.agent-step.success{border-left-color:#4ade80}
.agent-step.failure{border-left-color:#f87171}
.agent-step.reflection{border-left-color:#fbbf24}
.step-icon{font-size:12px;flex-shrink:0;margin-top:1px}
.step-body{flex:1;min-width:0}
.step-title{font-weight:600}
.step-detail{color:var(--vscode-descriptionForeground);font-size:10px;white-space:pre-wrap;word-break:break-all;margin-top:2px;max-height:2.2em;overflow:hidden;cursor:pointer}
.step-detail.expanded{max-height:100px;overflow-y:auto}
/* ── Diff block ── */
.diff-block{border:1px solid var(--vscode-panel-border);border-radius:8px;overflow:hidden;width:100%;margin:3px 0;font-family:monospace;font-size:11px}
.diff-header{background:rgba(124,58,237,.12);padding:5px 9px;font-size:11px;font-weight:600;color:#a78bfa;display:flex;justify-content:space-between;align-items:center}
.diff-body{max-height:180px;overflow-y:auto;background:var(--vscode-editor-background)}
.diff-line{padding:1px 9px;white-space:pre}
.diff-add{background:rgba(74,222,128,.1);color:#4ade80}
.diff-remove{background:rgba(248,113,113,.1);color:#f87171}
.diff-context{color:var(--vscode-descriptionForeground)}
.diff-actions{display:flex;gap:5px;padding:5px 9px;border-top:1px solid var(--vscode-panel-border)}
.btn-approve-diff{background:#4ade80;color:#000;border:none;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600}
.btn-reject-diff{background:#f87171;color:#000;border:none;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600}
/* ── Plan block ── */
.plan-block{border:1px solid #7c3aed;border-radius:10px;overflow:hidden;width:100%;margin:3px 0}
.plan-header{background:rgba(124,58,237,.12);padding:7px 11px;font-size:12px;font-weight:600;color:#a78bfa}
.plan-content{padding:9px 11px;font-size:12px}
.plan-actions{display:flex;gap:7px;padding:7px 11px;border-top:1px solid rgba(124,58,237,.3)}
.btn-approve{background:#7c3aed;color:#fff;border:none;padding:4px 12px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600}
.btn-approve:hover{background:#6d28d9}
.btn-reject{background:none;color:var(--vscode-foreground);border:1px solid var(--vscode-panel-border);padding:4px 12px;border-radius:5px;cursor:pointer;font-size:12px}
/* ── Code blocks ── */
.code-block{position:relative;margin:6px 0}
.code-lang{font-size:9px;color:var(--vscode-descriptionForeground);padding:3px 9px 0;font-family:monospace}
.code-block pre{background:var(--vscode-editor-background);padding:9px;border-radius:5px;overflow-x:auto;font-size:11.5px;font-family:var(--vscode-editor-font-family,monospace);border:1px solid var(--vscode-panel-border);white-space:pre;line-height:1.5}
.code-actions{position:absolute;top:5px;right:5px;display:flex;gap:3px;opacity:0;transition:opacity .15s}
.code-block:hover .code-actions{opacity:1}
.code-actions button{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border:none;padding:2px 7px;border-radius:3px;cursor:pointer;font-size:10px}
/* ── Thinking ── */
.thinking{display:flex;align-items:center;gap:7px;padding:3px 0;font-size:12px;color:var(--vscode-descriptionForeground)}
.thinking-dots{display:flex;gap:3px}
.thinking-dots span{width:4px;height:4px;border-radius:50%;background:currentColor;animation:bounce 1.2s infinite}
.thinking-dots span:nth-child(2){animation-delay:.2s}
.thinking-dots span:nth-child(3){animation-delay:.4s}
@keyframes bounce{0%,80%,100%{transform:scale(.6);opacity:.5}40%{transform:scale(1);opacity:1}}
/* ── Slash / file popups ── */
.popup{display:none;position:absolute;bottom:100%;left:0;right:0;background:var(--vscode-editorWidget-background,var(--vscode-editor-background));border:1px solid var(--vscode-panel-border);border-radius:8px;box-shadow:0 -4px 16px rgba(0,0,0,.35);max-height:200px;overflow-y:auto;z-index:100}
.popup.open{display:block}
.popup-item{display:flex;align-items:baseline;gap:8px;padding:6px 11px;cursor:pointer;font-size:12px}
.popup-item:hover,.popup-item.hi{background:var(--vscode-list-hoverBackground)}
.p-cmd{font-weight:700;color:#a78bfa;min-width:72px;flex-shrink:0}
.p-desc{color:var(--vscode-descriptionForeground);font-size:11px}
.file-item{padding:5px 11px;cursor:pointer;font-size:11px}
.file-item:hover,.file-item.hi{background:var(--vscode-list-hoverBackground)}
/* ── @mention popup ── */
.mention-pop{display:none;position:absolute;bottom:100%;left:0;right:0;background:var(--vscode-editorWidget-background,var(--vscode-editor-background));border:1px solid var(--vscode-panel-border);border-radius:8px;z-index:100;box-shadow:0 -4px 12px rgba(0,0,0,.3);padding:6px 8px;flex-wrap:wrap;gap:5px}
.mention-pop.open{display:flex}
.m-pill{padding:3px 9px;border-radius:12px;font-size:11px;cursor:pointer;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);border:1px solid var(--vscode-panel-border)}
.m-pill:hover{background:var(--vscode-list-hoverBackground)}
/* ── Context bar ── */
.ctx-bar{display:flex;align-items:center;gap:6px;padding:3px 10px;font-size:10px;color:var(--vscode-descriptionForeground);flex-shrink:0;border-top:1px solid var(--vscode-panel-border)}
.ctx-track{width:56px;height:4px;border-radius:2px;background:rgba(128,128,128,.2);flex-shrink:0;overflow:hidden}
.ctx-fill{height:100%;border-radius:2px;background:#4ade80;width:0%;transition:width .3s,background .3s}
.ctx-label{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.sel-pill{display:none;align-items:center;gap:3px;padding:1px 7px;background:var(--vscode-badge-background);border-radius:8px;font-size:10px;flex-shrink:0}
.sel-pill.on{display:flex}
/* ── Input area ── */
.input-area{padding:4px 8px 8px;flex-shrink:0}
.input-wrap{position:relative}
.input-box{display:flex;align-items:flex-end;gap:5px;background:var(--vscode-input-background);border:1px solid var(--vscode-input-border,var(--vscode-panel-border));border-radius:10px;padding:5px 6px;transition:border-color .15s}
.input-box:focus-within{border-color:var(--vscode-focusBorder)}
.input-box textarea{flex:1;background:none;border:none;outline:none;resize:none;color:var(--vscode-input-foreground);font-family:inherit;font-size:13px;line-height:1.5;max-height:160px;min-height:22px;padding:2px 2px}
.send-btn{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:7px;padding:5px 10px;cursor:pointer;font-size:15px;flex-shrink:0;height:30px;line-height:1}
.send-btn:hover{background:var(--vscode-button-hoverBackground)}
.send-btn:disabled{opacity:.35;cursor:not-allowed}
.stop-btn{background:#ef4444;color:#fff;border:none;border-radius:7px;padding:5px 11px;cursor:pointer;font-size:11px;font-weight:700;flex-shrink:0;height:30px;display:none;white-space:nowrap}
.stop-btn:hover{background:#dc2626}
.stop-btn:disabled{opacity:.5}
.char-ct{font-size:9px;color:var(--vscode-descriptionForeground);text-align:right;padding:1px 3px 0}
/* ── Typography ── */
p{margin:3px 0}h1,h2,h3{margin:7px 0 3px}ul,ol{padding-left:16px}li{margin:2px 0}
code{background:var(--vscode-textCodeBlock-background);padding:1px 4px;border-radius:3px;font-size:11px}
strong{font-weight:700}em{font-style:italic}a{color:var(--vscode-textLink-foreground)}
</style>
</head>
<body>
<div id="dbg" style="position:fixed;top:0;left:0;right:0;background:#ff0;color:#000;font-size:10px;padding:2px 4px;z-index:9999;word-break:break-all;">waiting...</div>
<!-- Top bar -->
<div class="topbar">
  <span class="status-dot" id="statusDot"></span>
  <button class="provider-btn" id="providerBadge" title="Change provider">ClawPilot</button>
  <span style="font-size:9px;opacity:.45;flex-shrink:0">v2</span>
  <button class="icon-btn" id="setupBtn" title="Settings">&#9881;</button>
  <button class="icon-btn" id="newSessionBtn" title="New chat">&#43;</button>
</div>
<div id="session-name" class="session-name"></div>
<!-- Model + Mode toolbar -->
<div class="toolbar">
  <select id="modelSelect" class="model-select" title="Select model"></select>
  <div class="mode-group">
    <button class="mode-btn active-agent" id="modeAgentBtn" title="Agent: multi-step, uses tools">&#9889; Agent</button>
    <button class="mode-btn" id="modeAskBtn" title="Ask: single reply, no tools">&#128172; Ask</button>
  </div>
</div>
<!-- Status bar -->
<div class="status-bar">
  <span class="index-info" id="indexStatus"></span>
  <button class="text-btn" id="reindexBtn">&#8635; Re-index</button>
  <span style="opacity:.4">&#183;</span>
  <button class="text-btn" id="memoryBtn">&#129504; Memory</button>
</div>
<!-- Memory panel (hidden by default) -->
<div class="memory-panel" id="memoryPanel">
  <label>Project context <span style="font-weight:400;opacity:.6">(max 500)</span></label>
  <textarea id="memProjectContext" maxlength="500" placeholder="Project description, tech stack..."></textarea>
  <label>User preferences <span style="font-weight:400;opacity:.6">(max 300)</span></label>
  <textarea id="memUserPreferences" maxlength="300" placeholder="Coding style, preferences..."></textarea>
  <label>Key facts</label>
  <div class="key-facts-list" id="keyFactsList"></div>
  <input type="text" id="newKeyFact" placeholder="Add a fact &#8594; Enter to save" maxlength="100"
    style="width:100%;margin-top:5px;padding:4px 6px;font-size:11px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:4px;outline:none">
  <label>Skills</label>
  <div class="skills-list" id="skillsList"></div>
  <button type="button" class="mem-save-btn btn-approve" id="memorySaveBtn">Save Memory</button>
</div>
<!-- Messages -->
<div class="messages" id="messages">
  <div class="empty-setup" id="emptyStateNoSetup">
    <div class="empty-icon">&#128268;</div>
    <div class="empty-setup-title">No model connected</div>
    <div class="empty-setup-sub">Start Ollama, or add an API key for a cloud provider.</div>
    <button type="button" class="quick-btn" id="setupEmptyBtn">&#9881; Open Setup</button>
  </div>
  <div class="empty-state" id="emptyState">
    <div class="empty-icon">&#129302;</div>
    <div class="empty-title">ClawPilot</div>
    <div class="empty-sub">Local AI &#183; Privacy-first &#183; No cloud required<br>Type <strong>/</strong> for commands &#183; <strong>@</strong> to attach files</div>
    <div class="quick-actions">
      <button type="button" class="quick-btn" data-cmd="/explain">Explain</button>
      <button type="button" class="quick-btn" data-cmd="/fix">Fix bugs</button>
      <button type="button" class="quick-btn" data-cmd="/refactor">Refactor</button>
      <button type="button" class="quick-btn" data-cmd="/test">Write tests</button>
      <button type="button" class="quick-btn" data-cmd="/plan ">Plan feature</button>
      <button type="button" class="quick-btn" data-cmd="/review">Review</button>
    </div>
  </div>
</div>
<!-- Context usage bar -->
<div class="ctx-bar">
  <div class="ctx-track"><div class="ctx-fill" id="ctxFill"></div></div>
  <span class="ctx-label" id="ctxLabel">0 tokens</span>
  <span class="sel-pill" id="selBadge">&#128206; <span id="selLabel">selection</span></span>
</div>
<!-- Input + Popups (popups positioned relative to input-area) -->
<div class="input-area" style="position:relative">
  <div class="popup" id="slashPop"></div>
  <div class="popup" id="filePop"></div>
  <div class="popup" id="cmdMenu"></div>
  <div class="mention-pop" id="mentionPop"></div>
  <div class="input-box">
    <textarea id="msgInput" placeholder="Ask anything...  / commands  @ files" rows="1"></textarea>
    <button class="stop-btn" id="stopBtn" title="Stop generation">&#9632; Stop</button>
    <button class="send-btn" id="sendBtn" title="Send (Enter)">&#9658;</button>
  </div>
  <div class="char-ct" id="charCt">0</div>
</div>
<script nonce="${nonce}">
window.onerror = function(msg, src, line, col, err) {
  document.body.insertAdjacentHTML('afterbegin',
    '<div style="position:fixed;top:0;left:0;right:0;background:red;color:white;font-size:11px;padding:4px;z-index:9999">'
    + 'JS ERROR line ' + line + ': ' + msg + '</div>');
  return false;
};
const vscode = acquireVsCodeApi();
let agentMode=false, running=false, selText='', selLang='';
let curBubble=null, curSteps=null, attachedFiles=[];
let slashIdx=-1, fileIdx=-1;
let convTokens=0, ctxLimit=32768;
let needSetup=true, allCmds=[];

/* ── Context limit estimates ── */
const MODEL_CTX={
  'llama3.3':131072,'llama3.2':131072,'llama3.1':131072,'llama3':8192,
  'phi4':16384,'phi3.5':131072,'phi3':131072,
  'mistral':32768,'mixtral':32768,
  'codellama':16384,'deepseek':65536,
  'qwen2.5':131072,'qwen2':32768,'qwen':32768,
  'gemma3':131072,'gemma2':8192,'gemma':8192,
  'llava':8192,'starcoder2':16384,'starcoder':8192,
  'wizardcoder':16384,'solar':4096,'vicuna':4096,
};
function getCtxLimit(m){
  if(!m)return 32768;
  const b=m.split(':')[0].toLowerCase();
  for(const[k,v]of Object.entries(MODEL_CTX))if(b.includes(k))return v;
  return 32768;
}
function countTok(t){return Math.ceil((t||'').length/3.5);}
function fmtTok(n){return n>=1000?(n/1000).toFixed(1)+'k':String(n);}
function updateCtx(){
  const pct=Math.min(100,(convTokens/ctxLimit)*100);
  const f=document.getElementById('ctxFill'),l=document.getElementById('ctxLabel');
  if(f)f.style.cssText='width:'+pct+'%;background:'+(pct<60?'#4ade80':pct<85?'#fbbf24':'#f87171');
  if(l)l.textContent=fmtTok(convTokens)+' / '+fmtTok(ctxLimit)+' tokens';
}

const SLASH=[
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
const MENTIONT=[{type:'file',label:'file'},{type:'git',label:'git'},{type:'symbol',label:'symbol'},{type:'memory',label:'memory'},{type:'workspace',label:'workspace'}];

const $=id=>document.getElementById(id);
const msgs=$('messages'), inp=$('msgInput'), sendBtn=$('sendBtn'), stopBtn=$('stopBtn');
const statusDot=$('statusDot'), modelSel=$('modelSelect');
const selBadge=$('selBadge'), slashPop=$('slashPop'), filePop=$('filePop');
const emptyState=$('emptyState'), emptyNoSetup=$('emptyStateNoSetup'), sessionNameEl=$('session-name');
const charCt=$('charCt'), cmdMenu=$('cmdMenu'), mentionPop=$('mentionPop');

/* init */
setInterval(()=>vscode.postMessage({type:'getSelectionContext'}),1500);

/* ── Mode toggle ── */
const modeA=$('modeAgentBtn'), modeQ=$('modeAskBtn');
function setMode(a){
  agentMode=a;
  modeA.className='mode-btn'+(a?' active-agent':'');
  modeQ.className='mode-btn'+(!a?' active-ask':'');
}
modeA.onclick=()=>setMode(true);
modeQ.onclick=()=>setMode(false);

/* ── Top bar buttons ── */
$('providerBadge').onclick=()=>vscode.postMessage({type:'runCommand',command:'clawpilot.selectProvider'});
$('setupBtn').onclick=()=>vscode.postMessage({type:'runCommand',command:'clawpilot.setup'});
$('newSessionBtn').onclick=()=>vscode.postMessage({type:'runCommand',command:'clawpilot.newSession'});
if($('setupEmptyBtn'))$('setupEmptyBtn').onclick=()=>vscode.postMessage({type:'runCommand',command:'clawpilot.setup'});
$('reindexBtn').onclick=()=>vscode.postMessage({type:'reindexWorkspace'});
$('memoryBtn').onclick=()=>{const p=$('memoryPanel');p.classList.toggle('open',!p.classList.contains('open'));};
$('memorySaveBtn').onclick=()=>{
  const core={projectContext:$('memProjectContext').value,userPreferences:$('memUserPreferences').value,keyFacts:window._kf||[]};
  vscode.postMessage({type:'updateCore',patch:core});
};
$('newKeyFact').onkeydown=e=>{
  if(e.key==='Enter'){const v=$('newKeyFact').value.trim();if(v){(window._kf=window._kf||[]).push(v);$('newKeyFact').value='';renderKF();vscode.postMessage({type:'updateCore',patch:{keyFacts:window._kf}});}}
};
function renderKF(){
  const el=$('keyFactsList');if(!el)return;
  const f=window._kf||[];
  el.innerHTML=f.map((t,i)=>'<span class="key-fact-tag">'+esc(t)+' <button data-i="'+i+'">\xd7</button></span>').join('');
  el.querySelectorAll('button').forEach(b=>{b.onclick=()=>{(window._kf=window._kf||[]).splice(+b.dataset.i,1);renderKF();vscode.postMessage({type:'updateCore',patch:{keyFacts:window._kf}});};});
}

modelSel.onchange=()=>{ctxLimit=getCtxLimit(modelSel.value);updateCtx();vscode.postMessage({type:'changeModel',model:modelSel.value});};
stopBtn.onclick=()=>{vscode.postMessage({type:'stopAgent'});stopBtn.disabled=true;stopBtn.textContent='Stopping\u2026';};

document.querySelectorAll('.quick-btn').forEach(b=>{
  b.onclick=()=>{
    const cmd=(b.dataset.cmd||'').trim();
    if(!cmd){inp.focus();return;}
    inp.value=cmd;autoSz();closeSlash();closeFile();
    if(inp.value.trim()&&!running)send();else inp.focus();
  };
});

/* ── Input events ── */
inp.addEventListener('input',()=>{
  const v=inp.value,c=inp.selectionStart;
  if(charCt)charCt.textContent=v.length;
  /* New command menu from loaded commands */
  if(v.startsWith('/')&&!v.includes(' ')&&allCmds.length){
    const fil=allCmds.filter(x=>x.name.startsWith(v.slice(1).toLowerCase()));
    if(fil.length&&cmdMenu){
      cmdMenu.innerHTML=fil.map((x,i)=>'<div class="popup-item" data-usage="'+esc(x.usage)+'"><span class="p-cmd">'+esc('/'+x.name)+'</span><span class="p-desc">'+esc(x.description)+'</span></div>').join('');
      cmdMenu.classList.add('open');
      cmdMenu.querySelectorAll('.popup-item').forEach(el=>{
        el.addEventListener('mousedown',e=>{e.preventDefault();const u=el.getAttribute('data-usage')||'';inp.value=u.replace(/<[^>]*>/g,' ').trim()+(u.includes('<')?' ':'');cmdMenu.classList.remove('open');inp.focus();if(charCt)charCt.textContent=inp.value.length;});
      });
    }else if(cmdMenu)cmdMenu.classList.remove('open');
  }else if(cmdMenu)cmdMenu.classList.remove('open');
  autoSz();
  /* Fallback SLASH list */
  const sm=v.match(/^\/(\w*)$/);
  if(sm&&!allCmds.length){const p=sm[1].toLowerCase();const f=SLASH.filter(s=>s.cmd.slice(1).startsWith(p));if(f.length){renderSlash(f);return;}}
  closeSlash();
  /* @ mentions */
  const am=v.slice(0,c).match(/@(\w*)$/);
  if(am){
    const seg=v.slice(0,c).slice(v.slice(0,c).lastIndexOf('@'));
    if(seg.indexOf(':')===-1){
      if(mentionPop){
        mentionPop.innerHTML=MENTIONT.map(m=>'<button class="m-pill" data-type="'+esc(m.type)+'">@'+esc(m.label)+'</button>').join('');
        mentionPop.classList.add('open');
        mentionPop.querySelectorAll('.m-pill').forEach(b=>{
          b.addEventListener('mousedown',function(e){e.preventDefault();
            const tp=this.dataset.type,val=inp.value,pos=inp.selectionStart;
            const st=val.slice(0,pos).lastIndexOf('@');
            const bef=val.slice(0,st),aft=val.slice(pos);
            const ins=tp==='workspace'?'@workspace ':'@'+tp+':';
            inp.value=bef+ins+aft;inp.selectionStart=inp.selectionEnd=bef.length+ins.length;
            mentionPop.classList.remove('open');inp.focus();autoSz();
            if(charCt)charCt.textContent=inp.value.length;
          });
        });
      }
      return;
    }
    vscode.postMessage({type:'getWorkspaceFiles',query:am[1]});
    return;
  }
  if(mentionPop)mentionPop.classList.remove('open');
  closeFile();
});

inp.addEventListener('blur',()=>setTimeout(()=>{
  closeSlash();closeFile();
  if(mentionPop)mentionPop.classList.remove('open');
  if(cmdMenu)cmdMenu.classList.remove('open');
},150));

inp.addEventListener('keydown',e=>{
  const enter=(e.key==='Enter'||e.keyCode===13)&&!e.shiftKey;
  if(slashPop.classList.contains('open')){
    const its=slashPop.querySelectorAll('.popup-item');
    if(e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();slashIdx=Math.min(slashIdx+1,its.length-1);hlSlash();return;}
    if(e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();slashIdx=Math.max(slashIdx-1,0);hlSlash();return;}
    if(enter||e.key==='Tab'){e.preventDefault();e.stopPropagation();(its[Math.max(0,slashIdx)]||its[0])?.click();return;}
    if(e.key==='Escape'){e.preventDefault();closeSlash();return;}
  }
  if(filePop.classList.contains('open')){
    const its=filePop.querySelectorAll('.file-item');
    if(e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();fileIdx=Math.min(fileIdx+1,its.length-1);hlFile();return;}
    if(e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();fileIdx=Math.max(fileIdx-1,0);hlFile();return;}
    if(enter||e.key==='Tab'){e.preventDefault();e.stopPropagation();(its[Math.max(0,fileIdx)]||its[0])?.click();return;}
    if(e.key==='Escape'){e.preventDefault();closeFile();return;}
  }
  if(enter){e.preventDefault();e.stopPropagation();send();}
},{capture:true});
inp.onkeydown = function(e) {
  if ((e.key === 'Enter') && !e.shiftKey) { e.preventDefault(); send(); }
};

function autoSz(){inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,160)+'px';}

function renderSlash(items){
  if(!items.length){closeSlash();return;}
  slashPop.innerHTML=items.map(it=>'<div class="popup-item" data-cmd="'+it.cmd+'"><span class="p-cmd">'+it.cmd+'</span><span class="p-desc">'+it.desc+'</span></div>').join('');
  slashPop.querySelectorAll('.popup-item').forEach(el=>{el.onclick=()=>{inp.value=el.dataset.cmd+' ';closeSlash();inp.focus();autoSz();};});
  slashIdx=0;hlSlash();slashPop.classList.add('open');
}
function closeSlash(){slashPop.classList.remove('open');slashIdx=-1;}
function hlSlash(){slashPop.querySelectorAll('.popup-item').forEach((el,i)=>{el.classList.toggle('hi',i===slashIdx);if(i===slashIdx)el.scrollIntoView({block:'nearest'});});}

function renderFile(files){
  if(!files.length){closeFile();return;}
  filePop.innerHTML=files.slice(0,20).map(f=>'<div class="file-item" data-f="'+esc(f)+'">'+esc(f)+'</div>').join('');
  filePop.querySelectorAll('.file-item').forEach(el=>{
    el.onclick=()=>{
      const v=inp.value,c=inp.selectionStart;
      inp.value=v.slice(0,c).replace(/@([^\s]*)$/,'@'+el.dataset.f+' ')+v.slice(c);
      if(!attachedFiles.includes(el.dataset.f))attachedFiles.push(el.dataset.f);
      closeFile();inp.focus();autoSz();
    };
  });
  fileIdx=0;hlFile();filePop.classList.add('open');
}
function closeFile(){filePop.classList.remove('open');fileIdx=-1;}
function hlFile(){filePop.querySelectorAll('.file-item').forEach((el,i)=>el.classList.toggle('hi',i===fileIdx));}

function send(){
  const text = inp.value.trim();
  if (!text) return;
  if (running) { inp.value = ''; return; }
  inp.value = ''; autoSz();
  // Show message immediately in chat without waiting for extension
  addUser(text, []);
  startAssistant();
  setRunning(true);
  vscode.postMessage({ type: 'sendMessage', text, codeContext: selText || '', files: [...attachedFiles], agentMode: false });
  attachedFiles = [];
}
sendBtn.onclick = send;
sendBtn.addEventListener('click', send);
sendBtn.setAttribute('onclick', '');

function setRunning(r){
  running=r;
  sendBtn.disabled=r;
  sendBtn.style.display=r?'none':'inline-block';
  stopBtn.style.display=r?'inline-block':'none';
  if(!r){stopBtn.disabled=false;stopBtn.textContent='\u25a0 Stop';}
}
function agentEnd(){setRunning(false);}

function hideEmpty(){
  emptyState.style.display='none';
  if(emptyNoSetup)emptyNoSetup.classList.remove('visible');
}
function scrollBot(){msgs.scrollTop=msgs.scrollHeight;}
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

const CTX_SYM={selection:'[sel]',activeFile:'[file]',workspaceRag:'[rag]',gitDiff:'[diff]',diagnostics:'[diag]',memory:'[mem]',skills:'[skill]',files:'[files]'};

function addUser(text,ctxTypes){
  hideEmpty();
  const d=document.createElement('div');d.className='message user';
  d.innerHTML='<div class="bubble">'+esc(text)+'</div>';
  if(ctxTypes&&ctxTypes.length){
    const s=document.createElement('div');s.className='ctx-tags';
    s.innerHTML=ctxTypes.map(t=>'<span class="ctx-tag" title="'+esc(t)+'">'+(CTX_SYM[t]||esc(t))+'</span>').join('');
    d.appendChild(s);
  }
  msgs.appendChild(d);scrollBot();
}

function startAssistant(){
  hideEmpty();
  const d=document.createElement('div');d.className='message assistant';
  const b=document.createElement('div');b.className='bubble';
  b.innerHTML='<div class="thinking"><div class="thinking-dots"><span></span><span></span><span></span></div> Thinking\u2026</div>';
  d.appendChild(b);msgs.appendChild(d);curBubble=b;curSteps=null;scrollBot();
}

function streamChunk(chunk){
  if(!curBubble)startAssistant();
  const t=curBubble.querySelector('.thinking');if(t)t.remove();
  let s=curBubble.querySelector('.stream-raw');
  if(!s){s=document.createElement('span');s.className='stream-raw';curBubble.appendChild(s);}
  s.textContent=(s.textContent||'')+chunk;scrollBot();
}

function finalize(html){
  if(!curBubble)return;
  convTokens+=countTok(curBubble.querySelector('.stream-raw')?.textContent||'');updateCtx();
  curBubble.innerHTML=html||'';attachActions(curBubble);curBubble=null;scrollBot();
}

function attachActions(el){
  el.querySelectorAll('.code-block').forEach(block=>{
    const pre=block.querySelector('pre');if(!pre)return;
    const cp=block.querySelector('.copy-btn'),ins=block.querySelector('.insert-btn');
    if(cp)cp.onclick=()=>{navigator.clipboard?.writeText(pre.textContent||'');cp.textContent='Copied!';setTimeout(()=>cp.textContent='Copy',1200);};
    if(ins)ins.onclick=()=>vscode.postMessage({type:'insertCode',code:pre.textContent||''});
  });
}

function agentStart(){
  setRunning(true);hideEmpty();
  const d=document.createElement('div');d.className='message assistant';
  const b=document.createElement('div');b.className='bubble';
  d.appendChild(b);msgs.appendChild(d);curBubble=b;
  const steps=document.createElement('div');steps.className='agent-steps';
  b.appendChild(steps);curSteps=steps;scrollBot();
}

function addToolCall(name,args,step){
  if(!curSteps)agentStart();
  const s=document.createElement('div');s.className='agent-step';s.id='step'+step;
  const argsStr=args?Object.entries(args).map(([k,v])=>k+': '+String(v).slice(0,60)).join(' \xb7 '):'';
  s.innerHTML='<span class="step-icon">\u2699</span><div class="step-body"><div class="step-title">'+esc(name)+'</div>'+(argsStr?'<div class="step-detail">'+esc(argsStr)+'</div>':'')+'</div>';
  const det=s.querySelector('.step-detail');if(det)det.onclick=()=>det.classList.toggle('expanded');
  curSteps.appendChild(s);scrollBot();
}

function addToolResult(name,output,ok,step){
  const s=document.getElementById('step'+step);if(!s)return;
  s.classList.add(ok?'success':'failure');
  s.querySelector('.step-icon').textContent=ok?'\u2713':'\u2717';
  const d=document.createElement('div');d.className='step-detail';
  d.textContent=(output||'').slice(0,400);d.onclick=()=>d.classList.toggle('expanded');
  s.querySelector('.step-body').appendChild(d);scrollBot();
}

function addReflection(content,attempt){
  if(!curSteps)agentStart();
  const s=document.createElement('div');s.className='agent-step reflection';
  s.innerHTML='<span class="step-icon">\ud83d\udd04</span><div class="step-body"><div class="step-title">Reflecting (attempt '+esc(String(attempt||1))+')</div><div class="step-detail">'+esc(content||'')+'</div></div>';
  const det=s.querySelector('.step-detail');if(det)det.onclick=()=>det.classList.toggle('expanded');
  curSteps.appendChild(s);scrollBot();
}

function showDiffPreview(stepId,filePath,isNew,html){
  if(!curSteps)agentStart();
  const wrap=document.createElement('div');wrap.className='diff-block';
  wrap.innerHTML='<div class="diff-header"><span>'+(isNew?'\u271a New: ':'~ Edit: ')+esc(filePath)+'</span></div><div class="diff-body">'+html+'</div><div class="diff-actions"><button class="btn-approve-diff">\u2713 Apply</button><button class="btn-reject-diff">\u2715 Reject</button></div>';
  wrap.querySelector('.btn-approve-diff').onclick=()=>{wrap.querySelector('.diff-actions').innerHTML='<em style="font-size:11px;color:#4ade80">Applied.</em>';vscode.postMessage({type:'approveDiff',stepId});};
  wrap.querySelector('.btn-reject-diff').onclick=()=>{wrap.querySelector('.diff-actions').innerHTML='<em style="font-size:11px;color:#f87171">Rejected.</em>';vscode.postMessage({type:'rejectDiff',stepId});};
  curSteps.appendChild(wrap);scrollBot();
}

function showPlan(html){
  setRunning(false);hideEmpty();
  const d=document.createElement('div');d.className='message assistant';
  const b=document.createElement('div');b.className='bubble';b.style.padding='4px';
  const plan=document.createElement('div');plan.className='plan-block';
  plan.innerHTML='<div class="plan-header">\ud83d\udccb Plan \u2014 Review before executing</div><div class="plan-content">'+html+'</div><div class="plan-actions"><button class="btn-approve" id="approveBtn">\u25b6 Execute</button><button class="btn-reject" id="rejectBtn">\u2715 Reject</button></div>';
  b.appendChild(plan);d.appendChild(b);msgs.appendChild(d);curBubble=null;
  plan.querySelector('#approveBtn').onclick=()=>{plan.querySelector('.plan-actions').innerHTML='<em style="font-size:12px;opacity:.7">Executing\u2026</em>';vscode.postMessage({type:'confirmPlan'});};
  plan.querySelector('#rejectBtn').onclick=()=>{plan.querySelector('.plan-actions').innerHTML='<em style="font-size:12px;color:#f44336">Rejected.</em>';vscode.postMessage({type:'rejectPlan'});};
  scrollBot();
}

/* ── Message handler ── */
window.addEventListener('message',e=>{
  const dbg=document.getElementById('dbg');
  try{
    if(dbg){
      const data=e.data??{};
      dbg.textContent='msg: '+(data.type||'unknown')+' | '+JSON.stringify(data).slice(0,80);
    }
  }catch{}
  const m=e.data;
  switch(m.type){
    case 'userMessage': break; // already shown optimistically in send()
    case 'startAssistantMessage': startAssistant();setRunning(true);break;
    case 'streamChunk': streamChunk(m.chunk);break;
    case 'finalizeAssistantMessage': finalize(m.html);agentEnd();break;
    case 'agentStart': agentStart();break;
    case 'agentThinking': break;
    case 'agentToolCall': addToolCall(m.toolName,m.toolArgs,m.step);break;
    case 'agentToolResult': addToolResult(m.toolName,m.output,m.success,m.step);break;
    case 'agentReflection': addReflection(m.content,m.attempt);break;
    case 'agentDiffPreview': showDiffPreview(m.stepId,m.path,m.isNew,m.html);break;
    case 'agentPlan': showPlan(m.html);break;
    case 'agentDone':
      if(m.html&&curBubble){const r=document.createElement('div');r.innerHTML=m.html;curBubble.appendChild(r);attachActions(r);convTokens+=countTok(r.textContent||'');updateCtx();}
      if(m.error&&curBubble){const er=document.createElement('div');er.style.cssText='color:#f87171;font-size:12px;margin-top:6px;';er.textContent='\u26a0 '+m.error;curBubble.appendChild(er);}
      curBubble=null;agentEnd();scrollBot();break;
    case 'planExecuting': startAssistant();setRunning(true);break;
    case 'planRejected': agentEnd();break;
    case 'models': renderModels(m.models,m.current);break;
    case 'connectionStatus': statusDot.classList.toggle('ok',m.connected);break;
    case 'providerModelStatus':{
      const badge=$('providerBadge');
      if(badge)badge.textContent=(m.providerLabel||'ClawPilot')+(m.model?' \u2022 '+m.model:'');
      needSetup=!m.connected||!m.model;
      if(emptyNoSetup)emptyNoSetup.classList.toggle('visible',needSetup);
      if(emptyState)emptyState.style.display=needSetup?'none':'flex';
      if(m.model){ctxLimit=getCtxLimit(m.model);updateCtx();}
      break;
    }
    case 'indexStatus':{
      const el=$('indexStatus');
      if(el){
        el.classList.toggle('indexing',!!m.indexing);
        if(m.indexing&&m.fileCount!=null)el.textContent='Indexing\u2026 ('+m.fileCount+' files)';
        else if(!m.indexing&&m.chunkCount!=null)el.textContent=m.chunkCount+' chunks indexed';
        else el.textContent=m.message||'';
      }
      break;
    }
    case 'memoryData':{
      const core=m.core||{};
      if($('memProjectContext'))$('memProjectContext').value=core.projectContext||'';
      if($('memUserPreferences'))$('memUserPreferences').value=core.userPreferences||'';
      window._kf=Array.isArray(core.keyFacts)?core.keyFacts.slice():[];
      renderKF();
      const skillList=m.skills||[];
      const sk=$('skillsList');
      if(sk){sk.innerHTML=skillList.map(s=>'<div class="skill-row"><span>'+esc(s.name)+'</span><button data-id="'+esc(s.id)+'">Delete</button></div>').join('')||'<span style="opacity:.7">No skills</span>';sk.querySelectorAll('button').forEach(b=>{b.onclick=()=>vscode.postMessage({type:'deleteSkill',id:b.dataset.id});});}
      break;
    }
    case 'selectionContext':
      selText=m.text;selLang=m.lang;
      selBadge.classList.toggle('on',!!m.text);
      if(m.text&&$('selLabel'))$('selLabel').textContent=m.text.split('\n').length+' lines'+(m.lang?' ('+m.lang+')':'');
      break;
    case 'workspaceFiles': renderFile(m.files);break;
    case 'injectMessage': inp.value=m.text;if(m.codeContext)selText=m.codeContext;autoSz();inp.focus();break;
    case 'injectPrompt': inp.value=m.text||'';autoSz();break;
    case 'submitPrompt': if(inp.value.trim())send();break;
    case 'loadHistory':
      msgs.innerHTML='';
      if(emptyNoSetup)msgs.appendChild(emptyNoSetup);
      msgs.appendChild(emptyState);
      emptyState.style.display='none';
      if(emptyNoSetup)emptyNoSetup.classList.remove('visible');
      if(sessionNameEl)sessionNameEl.textContent=m.sessionName||'';
      convTokens=0;
      for(const msg of(m.messages||[])){
        if(msg.role==='user'){addUser(msg.content);convTokens+=countTok(msg.content);}
        else{
          hideEmpty();
          const d=document.createElement('div');d.className='message assistant';
          const b=document.createElement('div');b.className='bubble';
          b.innerHTML=msg.html||esc(msg.content);d.appendChild(b);msgs.appendChild(d);
          attachActions(b);convTokens+=countTok(msg.content);
        }
      }
      updateCtx();scrollBot();break;
    case 'clearMessages':
      msgs.innerHTML='';
      if(emptyNoSetup)msgs.appendChild(emptyNoSetup);
      msgs.appendChild(emptyState);
      emptyState.style.display=needSetup?'none':'flex';
      if(emptyNoSetup)emptyNoSetup.classList.toggle('visible',needSetup);
      convTokens=0;updateCtx();break;
    case 'error':
      if(curBubble){curBubble.innerHTML='<span style="color:#f87171">\u26a0 '+esc(m.message||'Error')+'</span>';curBubble=null;}
      else{
        hideEmpty();
        const d=document.createElement('div');d.className='message assistant';
        const b=document.createElement('div');b.className='bubble';
        b.innerHTML='<span style="color:#f87171">\u26a0 '+esc(m.message||'Error')+'</span>';
        d.appendChild(b);msgs.appendChild(d);scrollBot();
      }
      agentEnd();break;
    case 'slashCommands': allCmds=m.commands||[];break;
    case 'assistantMessage':{
      hideEmpty();
      const ad=document.createElement('div');ad.className='message assistant';
      const ab=document.createElement('div');ab.className='bubble';
      ab.innerHTML=m.html||esc(m.text||'');
      ad.appendChild(ab);msgs.appendChild(ad);attachActions(ab);
      convTokens+=countTok(m.text||'');updateCtx();scrollBot();break;
    }
    case 'setModel':
      if(modelSel&&m.model){modelSel.value=m.model;ctxLimit=getCtxLimit(m.model);updateCtx();vscode.postMessage({type:'changeModel',model:m.model});}
      break;
    case 'installStart':
      hideEmpty();
      {const d=document.createElement('div');d.className='message assistant';const b=document.createElement('div');b.className='bubble';b.innerHTML='<div style="font-family:monospace;font-size:11px;white-space:pre-wrap;">Pulling '+esc(m.model)+'\u2026<\/div>';d.appendChild(b);msgs.appendChild(d);window._installLog=b.querySelector('div');scrollBot();}
      break;
    case 'installProgress':
      if(window._installLog){window._installLog.textContent+=(window._installLog.textContent?'\n':'')+m.line;scrollBot();}
      break;
    case 'installDone':
      if(window._installLog){window._installLog.textContent+='\n'+(m.success?'\u2713 Done. Switched to '+m.model+'.':'\u2717 Failed. '+(m.error||''));window._installLog=null;}
      break;
  }
});
vscode.postMessage({type:'ready'});

function renderModels(models,current){
  modelSel.innerHTML='';
  if(!models||!models.length){
    const o=document.createElement('option');
    o.textContent='No models \u2014 start Ollama or add API key';
    o.value='';modelSel.appendChild(o);
    modelSel.title='Run: ollama serve  then: ollama pull llama3.2';
    return;
  }
  models.forEach(m=>{
    const o=document.createElement('option');
    o.value=m.name;
    const sz=m.size!=null?(m.size/1e9).toFixed(1)+'B':'';
    o.textContent=m.name+(sz?' ('+sz+')':'');
    if(m.name===current)o.selected=true;
    modelSel.appendChild(o);
  });
  if(current){ctxLimit=getCtxLimit(current);updateCtx();}
}

updateCtx();
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
