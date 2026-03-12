import * as vscode from 'vscode';
import type { LLMProvider } from './providers/llmProvider';
import { createProvider, autoDetectProvider } from './providers/providerManager';
import { PROVIDER_DISPLAY_NAMES } from './providers/llmProvider';
import type { ProviderType } from './providers/llmProvider';
import { OllamaClient, KNOWN_MODELS } from './ollamaClient';
import { OllamaCompletionProvider } from './completion/completionProvider';
import { CompletionStatusBar } from './completion/completionStatusBar';
import { ChatViewProvider } from './chatViewProvider';
import { WorkspaceIndex } from './rag/workspaceIndex';
import { MemoryStore } from './memory/memoryStore';
import { SkillStore } from './memory/skillStore';
import { buildActionPrompt, getSelectionContext } from './actions/selectionActions';
import type { ActionKind } from './actions/selectionActions';
import { OllamaCodeLensProvider } from './actions/codeLensProvider';
import { OllamaDiagnosticActionProvider } from './diagnostics/diagnosticActionProvider';
import { DiagnosticStatusBar } from './diagnostics/diagnosticStatusBar';
import { buildDiagnosticPrompt } from './diagnostics/diagnosticPromptBuilder';
import { HistoryStore } from './history/historyStore';
import { GitStatusBar } from './git/gitStatusBar';
import { ContextRegistry } from './context/contextRegistry';
import { createActiveFileProvider } from './context/providers/activeFileProvider';
import { createSelectionProvider } from './context/providers/selectionProvider';
import { createDiagnosticsProvider } from './context/providers/diagnosticsProvider';
import { createGitDiffProvider } from './context/providers/gitDiffProvider';
import { createWorkspaceRagProvider } from './context/providers/workspaceRagProvider';
import { createMemoryProvider } from './context/providers/memoryProvider';
import { createSkillProvider } from './context/providers/skillProvider';
import { ClawProxy } from './proxy/clawProxy';
import { SetupWizard } from './system/setupWizard';
import { openSetupPanel } from './webviews/setupPanel';
import { openApiKeyPanel } from './webviews/apiKeyPanel';
import { API_PROVIDER_TYPES } from './providers/llmProvider';

let statusBarItem: vscode.StatusBarItem;
let chatProvider: ChatViewProvider;
let workspaceIndex: WorkspaceIndex;
let memoryStore: MemoryStore;
let skillStore: SkillStore;
let proxy: ClawProxy | undefined;
let client: LLMProvider;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    try {
        client = await createProvider(context);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('API key') && msg.includes('Manage API Keys')) {
            vscode.window.showWarningMessage(msg, 'Open API Keys').then(choice => {
                if (choice === 'Open API Keys') openApiKeyPanel(context.extensionUri, context);
            });
            client = new OllamaClient();
        } else {
            throw e;
        }
    }
    workspaceIndex = new WorkspaceIndex();
    workspaceIndex.startWatching();
    context.subscriptions.push({ dispose: () => workspaceIndex.dispose() });

    memoryStore = new MemoryStore(context.globalStorageUri);
    skillStore = new SkillStore(context.globalStorageUri);
    await memoryStore.init();
    await skillStore.init();
    context.subscriptions.push({ dispose: () => { memoryStore.save(); } });

    // Status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    updateStatusBar(client);
    statusBarItem.command = 'clawpilot.openChat';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Chat sidebar
    chatProvider = new ChatViewProvider(context.extensionUri, client, workspaceIndex, memoryStore, skillStore);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ChatViewProvider.viewType,
            chatProvider,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );
    const historyStore = new HistoryStore(context);
    chatProvider.setHistoryStore(historyStore);

    // Local proxy (OpenAI-compatible) for external tools
    const initialConfig = vscode.workspace.getConfiguration('clawpilot');
    if (initialConfig.get<boolean>('proxyEnabled', false)) {
        proxy = new ClawProxy(client);
        try {
            await proxy.start();
            context.subscriptions.push({ dispose: () => proxy?.stop() });
        } catch (err) {
            vscode.window.showErrorMessage(
                `ClawPilot proxy failed to start: ${err instanceof Error ? err.message : String(err)}`
            );
        }
    }

    const contextRegistry = new ContextRegistry();
    contextRegistry.register(createSelectionProvider());
    contextRegistry.register(createActiveFileProvider());
    contextRegistry.register(createDiagnosticsProvider());
    contextRegistry.register(createSkillProvider(skillStore));
    contextRegistry.register(createGitDiffProvider());
    contextRegistry.register(createWorkspaceRagProvider(workspaceIndex));
    contextRegistry.register(createMemoryProvider(memoryStore));
    chatProvider.setContextRegistry(contextRegistry);

    // Inline completions (ghost text)
    const initialModel = vscode.workspace.getConfiguration('clawpilot').get<string>('model', 'llama3');
    const completionProvider = new OllamaCompletionProvider(client, initialModel);
    context.subscriptions.push(
        vscode.languages.registerInlineCompletionItemProvider(
            { pattern: '**' },
            completionProvider
        )
    );
    new CompletionStatusBar(context);
    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.toggleCompletions', async () => {
            const cfg = vscode.workspace.getConfiguration('clawpilot');
            const current = cfg.get<boolean>('inlineCompletionsEnabled', true);
            await cfg.update('inlineCompletionsEnabled', !current, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(
                `ClawPilot inline completions ${!current ? 'enabled' : 'disabled'}.`
            );
        })
    );

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            '*',
            new OllamaDiagnosticActionProvider(),
            { providedCodeActionKinds: OllamaDiagnosticActionProvider.providedCodeActionKinds }
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'clawpilot.fixDiagnostic',
            async (document: vscode.TextDocument, diag: vscode.Diagnostic) => {
                const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
                const prompt = buildDiagnosticPrompt(document, diag, root);
                await chatProvider.sendQuickAction(prompt);
            }
        )
    );
    new DiagnosticStatusBar(context);
    new GitStatusBar(context);
    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.askGitStatus', async () => {
            await chatProvider.sendQuickAction(
                'Run git_status and git_log to summarise the current state of the repo. ' +
                'List modified files and the last 5 commits. Be concise.'
            );
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.newSession', async () => {
            const name = await vscode.window.showInputBox({
                prompt: 'Session name (leave blank for default)',
                placeHolder: 'My debugging session'
            });
            if (name === undefined) return;
            const session = historyStore.createSession(name || undefined);
            chatProvider.switchSession(session);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.switchSession', async () => {
            const index = historyStore.getIndex();
            if (!index.sessions.length) {
                vscode.window.showInformationMessage('No saved sessions.');
                return;
            }
            const items = index.sessions.map(s => ({
                label: s.name,
                description: new Date(s.updatedAt).toLocaleString(),
                id: s.id
            }));
            const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Select a session' });
            if (!pick) return;
            const session = historyStore.loadSession(pick.id);
            if (session) {
                historyStore.setActiveSession(pick.id);
                chatProvider.switchSession(session);
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.clearSession', async () => {
            const id = historyStore.getActiveSessionId();
            if (!id) return;
            const confirm = await vscode.window.showWarningMessage(
                'Clear all messages in this session?', 'Yes', 'Cancel'
            );
            if (confirm !== 'Yes') return;
            historyStore.clearMessages(id);
            chatProvider.clearWebviewMessages();
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.exportSession', async () => {
            const id = historyStore.getActiveSessionId();
            if (!id) return;
            const md = historyStore.exportSession(id);
            const doc = await vscode.workspace.openTextDocument({
                content: md, language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        })
    );

    // ── Commands ──

    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.openChat', () => {
            const model = vscode.workspace.getConfiguration('clawpilot').get<string>('model', '');
            if (!model.trim()) {
                openSetupPanel(context.extensionUri, context);
                return;
            }
            vscode.commands.executeCommand('clawpilot.chatView.focus');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.setup', () => {
            openSetupPanel(context.extensionUri, context);
        })
    );

    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider('*', new OllamaCodeLensProvider())
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.explain', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) { return; }
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
            const ctx = getSelectionContext(editor, root);
            if (!ctx) {
                vscode.window.showInformationMessage('Select some code first.');
                return;
            }
            const prompt = buildActionPrompt('explain', ctx);
            await chatProvider.sendQuickAction(prompt);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.refactor', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) { return; }
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
            const ctx = getSelectionContext(editor, root);
            if (!ctx) {
                vscode.window.showInformationMessage('Select some code first.');
                return;
            }
            const prompt = buildActionPrompt('refactor', ctx);
            await chatProvider.sendQuickAction(prompt);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.fix', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) { return; }
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
            const ctx = getSelectionContext(editor, root);
            if (!ctx) {
                vscode.window.showInformationMessage('Select some code first.');
                return;
            }
            const prompt = buildActionPrompt('fix', ctx);
            await chatProvider.sendQuickAction(prompt);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.add_tests', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) { return; }
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
            const ctx = getSelectionContext(editor, root);
            if (!ctx) {
                vscode.window.showInformationMessage('Select some code first.');
                return;
            }
            const prompt = buildActionPrompt('add_tests', ctx);
            await chatProvider.sendQuickAction(prompt);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.add_docs', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) { return; }
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
            const ctx = getSelectionContext(editor, root);
            if (!ctx) {
                vscode.window.showInformationMessage('Select some code first.');
                return;
            }
            const prompt = buildActionPrompt('add_docs', ctx);
            await chatProvider.sendQuickAction(prompt);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.codeLensAction', async (uri: vscode.Uri, lineIndex: number) => {
            const doc = await vscode.workspace.openTextDocument(uri);
            const lines = doc.getText().split(/\r?\n/);
            const startIndent = (lines[lineIndex] ?? '').match(/^(\s*)/)?.[1]?.length ?? 0;
            let blockEnd = lineIndex;
            const maxLook = Math.min(lineIndex + 80, lines.length);
            for (let i = lineIndex + 1; i < maxLook; i++) {
                const line = lines[i] ?? '';
                const trimmed = line.trim();
                if (trimmed.length > 0) {
                    const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
                    if (indent <= startIndent) {
                        blockEnd = i - 1;
                        break;
                    }
                }
                blockEnd = i;
            }
            const endLine = Math.min(blockEnd, lines.length - 1);
            const endCol = (lines[endLine] ?? '').length;
            const range = new vscode.Range(lineIndex, 0, endLine, endCol);
            const editor = await vscode.window.showTextDocument(doc, { selection: range, preserveFocus: false });
            editor.revealRange(range);
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
            const ctx = getSelectionContext(editor, root);
            if (!ctx) { return; }
            const items: vscode.QuickPickItem[] = [
                { label: '$(symbol-misc) Explain', detail: 'explain' },
                { label: '$(tools) Refactor', detail: 'refactor' },
                { label: '$(bug) Fix Bug', detail: 'fix' },
                { label: '$(beaker) Add Tests', detail: 'add_tests' },
                { label: '$(book) Add Docs', detail: 'add_docs' },
            ];
            const picked = await vscode.window.showQuickPick(items, { placeHolder: 'ClawPilot: Choose action' });
            if (picked?.detail) {
                const prompt = buildActionPrompt(picked.detail as ActionKind, ctx);
                await chatProvider.sendQuickAction(prompt);
            }
        })
    );

    // Code action commands (context menu / keyboard shortcuts)
    const codeActions: Array<[string, string]> = [
        ['clawpilot.explainCode', '/explain'],
        ['clawpilot.refactorCode', '/refactor'],
        ['clawpilot.fixCode', '/fix'],
        ['clawpilot.generateDocs', '/docs'],
        ['clawpilot.reviewCode', '/review'],
        ['clawpilot.optimizeCode', '/optimize'],
        ['clawpilot.writeTests', '/test'],
        ['clawpilot.addTypes', '/types'],
    ];

    for (const [cmd, slash] of codeActions) {
        context.subscriptions.push(
            vscode.commands.registerCommand(cmd, () => runSlashOnSelection(slash))
        );
    }

    // Agent commands
    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.editFile', async () => {
            const editor = vscode.window.activeTextEditor;
            const input = await vscode.window.showInputBox({
                prompt: 'Describe the changes to make to this file',
                placeHolder: 'e.g. Add error handling to all async functions'
            });
            if (!input) { return; }
            const code = editor ? editor.document.getText() : '';
            chatProvider.sendToChat(`/edit ${input}`, code);
            vscode.commands.executeCommand('clawpilot.chatView.focus');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.planFeature', async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'Describe the feature to plan',
                placeHolder: 'e.g. Add user authentication with JWT'
            });
            if (!input) { return; }
            chatProvider.sendToChat(`/plan ${input}`);
            vscode.commands.executeCommand('clawpilot.chatView.focus');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.runCommand', async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'Terminal command to run',
                placeHolder: 'e.g. npm test'
            });
            if (!input) { return; }
            chatProvider.sendToChat(`/run ${input}`);
            vscode.commands.executeCommand('clawpilot.chatView.focus');
        })
    );

    // Provider selection: local first, then separator, then Premium (API)
    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.selectProvider', async () => {
            const local: ProviderType[] = ['ollama', 'lmstudio', 'llamafile', 'vllm', 'localai', 'jan', 'textgen-webui', 'openai-compatible'];
            const items: vscode.QuickPickItem[] = [];
            local.forEach(type => {
                items.push({ label: PROVIDER_DISPLAY_NAMES[type], detail: type });
            });
            items.push({ label: 'Premium (API)', kind: vscode.QuickPickItemKind.Separator });
            API_PROVIDER_TYPES.forEach(type => {
                items.push({ label: PROVIDER_DISPLAY_NAMES[type], detail: type });
            });
            const picked = await vscode.window.showQuickPick(items, {
                matchOnDescription: true,
                placeHolder: 'Select LLM provider'
            });
            if (!picked?.detail) return;
            const chosen = picked.detail as ProviderType;
            const cfg = vscode.workspace.getConfiguration('clawpilot');
            const previous = cfg.get<string>('provider', 'ollama');
            await cfg.update('provider', chosen, vscode.ConfigurationTarget.Global);
            try {
                client = await createProvider(context);
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                if (msg.includes('API key') && msg.includes('Manage API Keys')) {
                    await cfg.update('provider', previous, vscode.ConfigurationTarget.Global);
                    vscode.window.showWarningMessage(msg, 'Open API Keys').then(choice => {
                        if (choice === 'Open API Keys') openApiKeyPanel(context.extensionUri, context);
                    });
                    return;
                }
                await cfg.update('provider', previous, vscode.ConfigurationTarget.Global);
                throw e;
            }
            chatProvider.setClient(client);
            completionProvider.setClient(client);
            updateStatusBar(client);
            vscode.window.showInformationMessage(`ClawPilot: Using ${client.displayName}.`);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.manageApiKeys', () => {
            openApiKeyPanel(context.extensionUri, context);
        })
    );

    // Model management
    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.selectModel', async () => {
            client.refreshConfig();
            let installed: { name: string }[] = [];
            try {
                const models = await client.listModels();
                installed = models.map(m => ({ name: m.name }));
            } catch { /* offline */ }

            const installedSet = new Set(installed.map(m => m.name));
            const items: vscode.QuickPickItem[] = [
                ...installed.map(m => ({
                    label: `$(check) ${m.name}`,
                    description: 'Installed',
                    detail: m.name
                }))
            ];
            if (client.pullModel) {
                items.push({
                    label: '$(package) Available to pull',
                    kind: vscode.QuickPickItemKind.Separator
                });
                items.push(...KNOWN_MODELS.filter(m => !installedSet.has(m.name)).map(m => ({
                    label: m.label,
                    description: m.category,
                    detail: m.name
                })));
            }

            const picked = await vscode.window.showQuickPick(items, {
                matchOnDescription: true,
                matchOnDetail: true,
                placeHolder: client.pullModel ? 'Select or pull a model' : 'Select model'
            });
            if (picked?.detail) {
                const name = picked.detail;
                if (client.pullModel && !installedSet.has(name)) {
                    await pullModelWithProgress(client as OllamaClient, name);
                }
                await vscode.workspace.getConfiguration('clawpilot')
                    .update('model', name, vscode.ConfigurationTarget.Global);
                updateStatusBar(client, name);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.clearMemory', async () => {
            const confirm = await vscode.window.showWarningMessage(
                'Clear all agent memory (core, recall, archival)? This cannot be undone.',
                'Clear',
                'Cancel'
            );
            if (confirm === 'Clear') {
                await memoryStore.clearAll();
                vscode.window.showInformationMessage('ClawPilot: Memory cleared.');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.viewMemory', () => {
            vscode.commands.executeCommand('clawpilot.chatView.focus');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.reindexWorkspace', async () => {
            try {
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'ClawPilot: Indexing workspace',
                        cancellable: false,
                    },
                    async progress => {
                        await workspaceIndex.indexAll((message, fileCount) => {
                            progress.report({ message: fileCount != null ? `${message} (${fileCount} files)` : message });
                        });
                    }
                );
                const st = workspaceIndex.status;
                vscode.window.showInformationMessage(`ClawPilot: ${st.chunkCount} chunks indexed.`);
            } catch (err) {
                vscode.window.showErrorMessage(`Re-index failed: ${err instanceof Error ? err.message : String(err)}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.pullModel', async () => {
            if (!client.pullModel) {
                vscode.window.showInformationMessage('Pull model is only available for the Ollama provider.');
                return;
            }
            const items = KNOWN_MODELS.map(m => ({
                label: m.label,
                description: m.category,
                detail: m.name
            }));
            const picked = await vscode.window.showQuickPick(items, {
                matchOnDescription: true,
                placeHolder: 'Select model to pull from registry'
            });
            if (!picked?.detail) { return; }
            const name = picked.detail;
            await pullModelWithProgress(client as OllamaClient, name);
            await vscode.workspace.getConfiguration('clawpilot')
                .update('model', name, vscode.ConfigurationTarget.Global);
            updateStatusBar(client, name);
        })
    );

    // Proxy toggle
    context.subscriptions.push(
        vscode.commands.registerCommand('clawpilot.toggleProxy', async () => {
            const cfg = vscode.workspace.getConfiguration('clawpilot');
            const enabled = cfg.get<boolean>('proxyEnabled', false);
            if (enabled) {
                await cfg.update('proxyEnabled', false, vscode.ConfigurationTarget.Global);
                proxy?.stop();
                proxy = undefined;
                vscode.window.showInformationMessage('ClawPilot proxy disabled.');
                return;
            }
            await cfg.update('proxyEnabled', true, vscode.ConfigurationTarget.Global);
            proxy?.stop();
            proxy = new ClawProxy(client);
            try {
                await proxy.start();
                context.subscriptions.push({ dispose: () => proxy?.stop() });
                vscode.window.showInformationMessage('ClawPilot proxy enabled.');
            } catch (err) {
                vscode.window.showErrorMessage(
                    `Failed to start ClawPilot proxy: ${err instanceof Error ? err.message : String(err)}`
                );
            }
        })
    );

    // Initial workspace index (background, with progress notification)
    const ragEnabled = vscode.workspace.getConfiguration('clawpilot').get<boolean>('ragEnabled', true);
    if (ragEnabled && vscode.workspace.workspaceFolders?.length) {
        void vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Window,
                title: 'ClawPilot: Indexing workspace',
                cancellable: false,
            },
            async progress => {
                try {
                    await workspaceIndex.indexAll((message, fileCount) => {
                        progress.report({ message: fileCount != null ? `Indexing... (${fileCount} files)` : message });
                    });
                } catch {
                    // Non-blocking; RAG will use BM25 or empty context
                }
            }
        );
    }

    // Auto-detect provider if configured and current provider unavailable
    const autoDetect = initialConfig.get<boolean>('autoDetectProvider', false);
    if (autoDetect) {
        const available = await client.isAvailable();
        if (!available) {
            const detected = await autoDetectProvider();
            if (detected) {
                client = detected;
                chatProvider.setClient(client);
                completionProvider.setClient(client);
                updateStatusBar(client);
                vscode.window.setStatusBarMessage(`ClawPilot: Auto-detected ${client.displayName}. Using it for this session.`, 8000);
            }
        }
    }

    // Startup health check
    client.isAvailable().then(available => {
        if (!available) {
            if (client.providerType === 'ollama') {
                vscode.window.showWarningMessage(
                    'ClawPilot: Server not found. Install Ollama and run `ollama serve`.',
                    'Get Ollama'
                ).then(choice => {
                    if (choice === 'Get Ollama') {
                        vscode.env.openExternal(vscode.Uri.parse('https://ollama.com'));
                    }
                });
            } else {
                vscode.window.showWarningMessage(
                    `ClawPilot: ${client.displayName} not found at ${client.baseEndpoint}.`
                );
            }
        } else {
            const model = vscode.workspace.getConfiguration('clawpilot').get<string>('model', '');
            updateStatusBar(client, model);
        }
    });

    // Update status bar on config change
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('clawpilot.model')) {
                const model = vscode.workspace.getConfiguration('clawpilot').get<string>('model', '');
                updateStatusBar(client, model);
                completionProvider.updateModel(model || 'llama3');
            }
            if (e.affectsConfiguration('clawpilot.provider')) {
                createProvider(context).then(p => {
                    client = p;
                    chatProvider.setClient(client);
                    completionProvider.setClient(client);
                    updateStatusBar(client);
                }).catch(err => {
                    const msg = err instanceof Error ? err.message : String(err);
                    if (msg.includes('API key')) {
                        vscode.window.showWarningMessage(msg, 'Open API Keys').then(choice => {
                            if (choice === 'Open API Keys') openApiKeyPanel(context.extensionUri, context);
                        });
                    }
                });
            }
        })
    );

    // System intelligence & first-run setup
    void new SetupWizard().run(context);
}

function runSlashOnSelection(slash: string): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) {
        vscode.window.showWarningMessage('Select some code first, then use this command.');
        return;
    }
    const code = editor.document.getText(editor.selection);
    chatProvider.sendToChat(slash, code);
    vscode.commands.executeCommand('clawpilot.chatView.focus');
}

async function pullModelWithProgress(client: OllamaClient, name: string): Promise<void> {
    if (!client.pullModel) return;
    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Pulling ${name}`,
                cancellable: false
            },
            async progress => {
                await client.pullModel(name, status => progress.report({ message: status }));
            }
        );
        vscode.window.showInformationMessage(`ClawPilot: ${name} ready!`);
    } catch (err) {
        vscode.window.showErrorMessage(`Pull failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}

function updateStatusBar(client: LLMProvider, model?: string): void {
    const m = model ?? vscode.workspace.getConfiguration('clawpilot').get<string>('model', '');
    const isApi = API_PROVIDER_TYPES.includes(client.providerType);
    const providerLabel = isApi ? `${client.displayName} (API)` : client.displayName;
    statusBarItem.text = m ? `$(claw) ClawPilot [${providerLabel}]: ${m}` : `$(claw) ClawPilot [${providerLabel}]`;
    statusBarItem.tooltip = 'ClawPilot — click to open chat';
}

export function deactivate(): void {}
