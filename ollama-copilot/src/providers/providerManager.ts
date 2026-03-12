import * as vscode from 'vscode';
import type { LLMProvider } from './llmProvider';
import type { ProviderType } from './llmProvider';
import { OllamaClient } from '../ollamaClient';
import { OpenAICompatibleProvider } from './openaiCompatibleProvider';

const PROVIDER_ORDER: ProviderType[] = [
  'ollama',
  'lmstudio',
  'jan',
  'llamafile',
  'vllm',
  'localai',
  'textgen-webui',
];

export function createProvider(): LLMProvider {
  const config = vscode.workspace.getConfiguration('clawpilot');
  const provider = config.get<string>('provider', 'ollama') as ProviderType;
  if (provider === 'ollama') {
    return new OllamaClient();
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
