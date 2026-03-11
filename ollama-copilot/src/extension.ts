import * as vscode from 'vscode';
import { OllamaClient, KNOWN_MODELS } from './ollamaClient';
import { OllamaCompletionProvider } from './completionProvider';
import { ChatViewProvider } from './chatViewProvider';
import { WorkspaceIndex } from './rag/workspaceIndex';
import { MemoryStore } from './memory/memoryStore';
import { SkillStore } from './memory/skillStore';

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

    // Inline completions
    const completionProvider = new OllamaCompletionProvider(client, statusBarItem);
    context.subscriptions.push(
        vscode.languages.registerInlineCompletionItemProvider(
            { pattern: '**' },
            completionProvider
        )
    );

    // ── Commands ──

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaCopilot.openChat', () => {
            vscode.commands.executeCommand('ollamaCopilot.chatView.focus');
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
