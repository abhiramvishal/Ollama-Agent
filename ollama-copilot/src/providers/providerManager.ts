import * as vscode from 'vscode';
import type { LLMProvider } from './llmProvider';
import type { ProviderType } from './llmProvider';
import { API_PROVIDER_TYPES } from './llmProvider';
import { OllamaClient } from '../ollamaClient';
import { OpenAICompatibleProvider } from './openaiCompatibleProvider';
import { ApiProvider, type ApiType } from './apiProvider';
import { SECRET_KEY_IDS } from './secretKeys';

const PROVIDER_ORDER: ProviderType[] = [
  'ollama',
  'lmstudio',
  'jan',
  'llamafile',
  'vllm',
  'localai',
  'textgen-webui',
];

const API_SECRET_KEYS: Record<ProviderType, string | undefined> = {
  ollama: undefined,
  lmstudio: undefined,
  llamafile: undefined,
  vllm: undefined,
  localai: undefined,
  jan: undefined,
  'textgen-webui': undefined,
  'openai-compatible': undefined,
  anthropic: SECRET_KEY_IDS.anthropic,
  openai: SECRET_KEY_IDS.openai,
  google: SECRET_KEY_IDS.google,
};

export async function createProvider(context: vscode.ExtensionContext): Promise<LLMProvider> {
  const config = vscode.workspace.getConfiguration('clawpilot');
  const provider = config.get<string>('provider', 'ollama') as ProviderType;
  if (provider === 'ollama') {
    return new OllamaClient();
  }
  if (API_PROVIDER_TYPES.includes(provider)) {
    const secretId = API_SECRET_KEYS[provider];
    if (!secretId) throw new Error('Unknown API provider');
    const apiKey = await context.secrets.get(secretId);
    if (!apiKey?.trim()) {
      throw new Error(
        `No API key set for ${provider}. Use "ClawPilot: Manage API Keys" to add your key.`
      );
    }
    return new ApiProvider(provider as ApiType, apiKey);
  }
  return new OpenAICompatibleProvider(provider);
}

export async function autoDetectProvider(): Promise<LLMProvider | null> {
  const candidates: LLMProvider[] = [
    new OllamaClient(),
    new OpenAICompatibleProvider('lmstudio'),
    new OpenAICompatibleProvider('jan'),
    new OpenAICompatibleProvider('llamafile'),
    new OpenAICompatibleProvider('vllm'),
    new OpenAICompatibleProvider('localai'),
    new OpenAICompatibleProvider('textgen-webui'),
  ];
  const results = await Promise.all(
    candidates.map(async p => ({ provider: p, ok: await p.isAvailable() }))
  );
  const found = results.find(r => r.ok);
  return found ? found.provider : null;
}
