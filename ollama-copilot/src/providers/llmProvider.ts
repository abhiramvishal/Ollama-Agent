/**
 * Shared types and abstract interface for all local LLM providers.
 * Supported providers: Ollama, LM Studio, llamafile, vLLM, LocalAI, Jan,
 * Text Generation WebUI, and any generic OpenAI-compatible server.
 */

export type ProviderType =
  | 'ollama'
  | 'lmstudio'
  | 'llamafile'
  | 'vllm'
  | 'localai'
  | 'jan'
  | 'textgen-webui'
  | 'openai-compatible'
  | 'anthropic'
  | 'openai'
  | 'google';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelInfo {
  name: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: Record<string, unknown>;
}

/**
 * Common interface implemented by every provider.
 * AgentRunner, completionProvider, proxy, and chatView all depend on this
 * instead of the concrete OllamaClient so providers are swappable.
 */
export interface LLMProvider {
  readonly providerType: ProviderType;
  readonly displayName: string;
  readonly baseEndpoint: string;

  isAvailable(): Promise<boolean>;
  listModels(): Promise<ModelInfo[]>;
  getBestAvailableModel(preferred: string): Promise<string>;
  refreshConfig(): void;

  streamChat(
    messages: ChatMessage[],
    model: string,
    maxTokens?: number
  ): AsyncGenerator<string>;

  streamChatWithFallback(
    messages: ChatMessage[],
    primaryModel: string,
    fallbackModels: string[],
    maxTokens?: number
  ): AsyncGenerator<string>;

  streamGenerate(
    prompt: string,
    model: string,
    maxTokens: number,
    stopTokens?: string[]
  ): AsyncGenerator<string>;

  /** Only Ollama supports pulling models; optional for other providers. */
  pullModel?(name: string, onProgress: (status: string) => void): Promise<void>;
}

/** Default TCP ports per provider (used when no explicit endpoint is configured). */
export const PROVIDER_DEFAULT_PORTS: Record<ProviderType, number> = {
  ollama:               11434,
  lmstudio:             1234,
  llamafile:            8080,
  vllm:                 8000,
  localai:              8080,
  jan:                  1337,
  'textgen-webui':      5000,
  'openai-compatible':  11434,
  anthropic:            443,
  openai:               443,
  google:               443,
};

export const PROVIDER_DISPLAY_NAMES: Record<ProviderType, string> = {
  ollama:               'Ollama',
  lmstudio:             'LM Studio',
  llamafile:            'llamafile',
  vllm:                 'vLLM',
  localai:              'LocalAI',
  jan:                  'Jan',
  'textgen-webui':      'Text Generation WebUI',
  'openai-compatible':  'OpenAI-compatible server',
  anthropic:            'Anthropic (API)',
  openai:               'OpenAI (API)',
  google:               'Google Gemini (API)',
};

/** Premium (cloud API) provider types; require API key from SecretStorage. */
export const API_PROVIDER_TYPES: ProviderType[] = ['anthropic', 'openai', 'google'];
