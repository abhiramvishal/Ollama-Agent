/** Minimal API calls to verify keys work. Used by the API Keys panel. */
export type ApiType = 'anthropic' | 'openai' | 'google';

export async function testApiKey(apiType: ApiType, apiKey: string): Promise<{ ok: boolean; error?: string }> {
  const key = (apiKey ?? '').trim();
  if (!key) return { ok: false, error: 'No API key provided.' };

  try {
    if (apiType === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, error: `${res.status}: ${t.slice(0, 200)}` };
      }
      return { ok: true };
    }

    if (apiType === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` },
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, error: `${res.status}: ${t.slice(0, 200)}` };
      }
      return { ok: true };
    }

    if (apiType === 'google') {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(key)
      );
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, error: `${res.status}: ${t.slice(0, 200)}` };
      }
      return { ok: true };
    }

    return { ok: false, error: 'Unknown API type.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
