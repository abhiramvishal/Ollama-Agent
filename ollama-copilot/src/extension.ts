import * as vscode from 'vscode';
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

let statusBarItem: vscode.StatusBarItem;
let chatProvider: ChatViewProvider;
let workspaceIndex: WorkspaceIndex;
let memoryStore: MemoryStore;
let skillStore: SkillStore;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const client = new OllamaClient();
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
    statusBarItem.command = 'ollamaCopilot.openChat';
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

    // Inline completions (ghost text)
    const initialModel = vscode.workspace.getConfiguration('ollamaCopilot').get<string>('model', 'llama3');
    const completionProvider = new OllamaCompletionProvider(client, initialModel);
    context.subscriptions.push(
        vscode.languages.registerInlineCompletionItemProvider(
            { pattern: '**' },
            completionProvider
        )
    );
    new CompletionStatusBar(context);
    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaCopilot.toggleCompletions', async () => {
            const cfg = vscode.workspace.getConfiguration('ollamaCopilot');
            const current = cfg.get<boolean>('inlineCompletionsEnabled', true);
            await cfg.update('inlineCompletionsEnabled', !current, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(
                `Ollama inline completions ${!current ? 'enabled' : 'disabled'}.`
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
            'ollamaCopilot.fixDiagnostic',
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
        vscode.commands.registerCommand('ollamaCopilot.askGitStatus', async () => {
            await chatProvider.sendQuickAction(
                'Run git_status and git_log to summarise the current state of the repo. ' +
                'List modified files and the last 5 commits. Be concise.'
            );
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaCopilot.newSession', async () => {
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
        vscode.commands.registerCommand('ollamaCopilot.switchSession', async () => {
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
        vscode.commands.registerCommand('ollamaCopilot.clearSession', async () => {
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
        vscode.commands.registerCommand('ollamaCopilot.exportSession', async () => {
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
        vscode.commands.registerCommand('ollamaCopilot.openChat', () => {
            vscode.commands.executeCommand('ollamaCopilot.chatView.focus');
        })
    );

    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider('*', new OllamaCodeLensProvider())
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaCopilot.explain', async () => {
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
        vscode.commands.registerCommand('ollamaCopilot.refactor', async () => {
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
        vscode.commands.registerCommand('ollamaCopilot.fix', async () => {
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
        vscode.commands.registerCommand('ollamaCopilot.add_tests', async () => {
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
        vscode.commands.registerCommand('ollamaCopilot.add_docs', async () => {
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
        vscode.commands.registerCommand('ollamaCopilot.codeLensAction', async (uri: vscode.Uri, lineIndex: number) => {
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
            const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Ollama: Choose action' });
            if (picked?.detail) {
                const prompt = buildActionPrompt(picked.detail as ActionKind, ctx);
                await chatProvider.sendQuickAction(prompt);
            }
        })
    );

    // Code action commands (context menu / keyboard shortcuts)
    const codeActions: Array<[string, string]> = [
        ['ollamaCopilot.explainCode', '/explain'],
        ['ollamaCopilot.refactorCode', '/refactor'],
        ['ollamaCopilot.fixCode', '/fix'],
        ['ollamaCopilot.generateDocs', '/docs'],
        ['ollamaCopilot.reviewCode', '/review'],
        ['ollamaCopilot.optimizeCode', '/optimize'],
        ['ollamaCopilot.writeTests', '/test'],
        ['ollamaCopilot.addTypes', '/types'],
    ];

    for (const [cmd, slash] of codeActions) {
        context.subscriptions.push(
            vscode.commands.registerCommand(cmd, () => runSlashOnSelection(slash))
        );
    }

    // Agent commands
    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaCopilot.editFile', async () => {
            const editor = vscode.window.activeTextEditor;
            const input = await vscode.window.showInputBox({
                prompt: 'Describe the changes to make to this file',
                placeHolder: 'e.g. Add error handling to all async functions'
            });
            if (!input) { return; }
            const code = editor ? editor.document.getText() : '';
            chatProvider.sendToChat(`/edit ${input}`, code);
            vscode.commands.executeCommand('ollamaCopilot.chatView.focus');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaCopilot.planFeature', async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'Describe the feature to plan',
                placeHolder: 'e.g. Add user authentication with JWT'
            });
            if (!input) { return; }
            chatProvider.sendToChat(`/plan ${input}`);
            vscode.commands.executeCommand('ollamaCopilot.chatView.focus');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaCopilot.runCommand', async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'Terminal command to run',
                placeHolder: 'e.g. npm test'
            });
            if (!input) { return; }
            chatProvider.sendToChat(`/run ${input}`);
            vscode.commands.executeCommand('ollamaCopilot.chatView.focus');
        })
    );

    // Model management
    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaCopilot.selectModel', async () => {
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
                })),
                {
                    label: '$(package) Available to pull',
                    kind: vscode.QuickPickItemKind.Separator
                },
                ...KNOWN_MODELS.filter(m => !installedSet.has(m.name)).map(m => ({
                    label: m.label,
                    description: m.category,
                    detail: m.name
                }))
            ];

            const picked = await vscode.window.showQuickPick(items, {
                matchOnDescription: true,
                matchOnDetail: true,
                placeHolder: 'Select or pull an Ollama model'
            });
            if (picked?.detail) {
                const name = picked.detail;
                if (!installedSet.has(name)) {
                    await pullModelWithProgress(client, name);
                }
                await vscode.workspace.getConfiguration('ollamaCopilot')
                    .update('model', name, vscode.ConfigurationTarget.Global);
                updateStatusBar(client, name);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaCopilot.clearMemory', async () => {
            const confirm = await vscode.window.showWarningMessage(
                'Clear all agent memory (core, recall, archival)? This cannot be undone.',
                'Clear',
                'Cancel'
            );
            if (confirm === 'Clear') {
                await memoryStore.clearAll();
                vscode.window.showInformationMessage('Ollama Copilot: Memory cleared.');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaCopilot.viewMemory', () => {
            vscode.commands.executeCommand('ollamaCopilot.chatView.focus');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaCopilot.reindexWorkspace', async () => {
            try {
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Ollama Copilot: Indexing workspace',
                        cancellable: false,
                    },
                    async progress => {
                        await workspaceIndex.indexAll((message, fileCount) => {
                            progress.report({ message: fileCount != null ? `${message} (${fileCount} files)` : message });
                        });
                    }
                );
                const st = workspaceIndex.status;
                vscode.window.showInformationMessage(`Ollama Copilot: ${st.chunkCount} chunks indexed.`);
            } catch (err) {
                vscode.window.showErrorMessage(`Re-index failed: ${err instanceof Error ? err.message : String(err)}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaCopilot.pullModel', async () => {
            const items = KNOWN_MODELS.map(m => ({
                label: m.label,
                description: m.category,
                detail: m.name
            }));
            const picked = await vscode.window.showQuickPick(items, {
                matchOnDescription: true,
                placeHolder: 'Select model to pull from Ollama registry'
            });
            if (!picked?.detail) { return; }
            const name = picked.detail;
            await pullModelWithProgress(client, name);
            await vscode.workspace.getConfiguration('ollamaCopilot')
                .update('model', name, vscode.ConfigurationTarget.Global);
            updateStatusBar(client, name);
        })
    );

    // Initial workspace index (background, with progress notification)
    const ragEnabled = vscode.workspace.getConfiguration('ollamaCopilot').get<boolean>('ragEnabled', true);
    if (ragEnabled && vscode.workspace.workspaceFolders?.length) {
        void vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Window,
                title: 'Ollama Copilot: Indexing workspace',
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

    // Startup health check
    client.isAvailable().then(available => {
        if (!available) {
            vscode.window.showWarningMessage(
                'Ollama Copilot: Ollama server not found. Install Ollama and run `ollama serve`.',
                'Get Ollama'
            ).then(choice => {
                if (choice === 'Get Ollama') {
                    vscode.env.openExternal(vscode.Uri.parse('https://ollama.com'));
                }
            });
        } else {
            const model = vscode.workspace.getConfiguration('ollamaCopilot').get<string>('model', '');
            updateStatusBar(client, model);
        }
    });

    // Update status bar on config change
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('ollamaCopilot.model')) {
                const model = vscode.workspace.getConfiguration('ollamaCopilot').get<string>('model', '');
                updateStatusBar(client, model);
                completionProvider.updateModel(model || 'llama3');
            }
        })
    );
}

function runSlashOnSelection(slash: string): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) {
        vscode.window.showWarningMessage('Select some code first, then use this command.');
        return;
    }
    const code = editor.document.getText(editor.selection);
    chatProvider.sendToChat(slash, code);
    vscode.commands.executeCommand('ollamaCopilot.chatView.focus');
}

async function pullModelWithProgress(client: OllamaClient, name: string): Promise<void> {
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
        vscode.window.showInformationMessage(`Ollama: ${name} ready!`);
    } catch (err) {
        vscode.window.showErrorMessage(`Pull failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}

function updateStatusBar(client: OllamaClient, model?: string): void {
    const m = model || vscode.workspace.getConfiguration('ollamaCopilot').get<string>('model', '');
    statusBarItem.text = m ? `$(sparkle) Ollama: ${m}` : '$(sparkle) Ollama';
    statusBarItem.tooltip = 'Ollama Copilot — click to open chat';
}

export function deactivate(): void {}
