import * as vscode from 'vscode';
import { scanSystem } from './systemScanner';
import { recommendModels } from './modelRecommender';
import { isOllamaInstalled, startOllamaServer } from './ollamaInstaller';
import { openSetupPanel } from '../webviews/setupPanel';

export class SetupWizard {
  async run(context: vscode.ExtensionContext): Promise<void> {
    const config = vscode.workspace.getConfiguration('clawpilot');
    const modelSet = config.get<string>('model', '').trim().length > 0;
    const ranBefore = context.globalState.get<boolean>('clawpilot.setupRanOnce', false);

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'ClawPilot: Scanning your system...', cancellable: false },
      async () => {
        const info = await scanSystem();

        if (!info.ollamaRunning && !info.lmstudioRunning) {
          const installed = await isOllamaInstalled();
          if (!installed) {
            const choice = await vscode.window.showInformationMessage(
              'ClawPilot: No local AI server is running. Set up Ollama to get started.',
              'Set up local AI (recommended)',
              'Use API key instead',
              'Skip'
            );
            if (choice === 'Set up local AI (recommended)') {
              await openSetupPanel(context.extensionUri, context);
            }
            context.globalState.update('clawpilot.setupRanOnce', true);
            return;
          }
          await startOllamaServer(() => {});
        }

        if (info.ollamaRunning && info.installedOllamaModels.length === 0) {
          if (!modelSet || !ranBefore) {
            await openSetupPanel(context.extensionUri, context);
          }
          context.globalState.update('clawpilot.setupRanOnce', true);
          return;
        }

        if (info.ollamaRunning && info.installedOllamaModels.length > 0 && !modelSet) {
          const recs = recommendModels(info);
          const best = recs.find(r => r.alreadyInstalled && r.recommended) ?? recs.find(r => r.alreadyInstalled);
          const modelName = best?.name ?? info.installedOllamaModels[0];
          await config.update('model', modelName, vscode.ConfigurationTarget.Global);
        }

        context.globalState.update('clawpilot.setupRanOnce', true);
      }
    );
  }
}
