/** SecretStorage keys for API keys. Used by providerManager and apiKeyPanel. */
export const CLAWPILOT_ANTHROPIC_KEY = 'clawpilot.anthropicApiKey';
export const CLAWPILOT_OPENAI_KEY = 'clawpilot.openaiApiKey';
export const CLAWPILOT_GOOGLE_KEY = 'clawpilot.googleApiKey';

export const SECRET_KEY_IDS = {
  anthropic: CLAWPILOT_ANTHROPIC_KEY,
  openai: CLAWPILOT_OPENAI_KEY,
  google: CLAWPILOT_GOOGLE_KEY,
} as const;
