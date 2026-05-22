import { callClaude, extractJSON } from './anthropic';

export { extractJSON };

export type AiProvider = 'anthropic' | 'openai' | 'google';

export interface ModelOption {
  id: string;
  label: string;
}

export const PROVIDER_MODELS: Record<AiProvider, ModelOption[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-6',             label: 'Claude Sonnet 4.6 (default)' },
    { id: 'claude-opus-4-7',               label: 'Claude Opus 4.7 (most capable)' },
    { id: 'claude-haiku-4-5-20251001',      label: 'Claude Haiku 4.5 (fast)' },
    { id: 'claude-sonnet-4-20250514',       label: 'Claude Sonnet 4 (legacy)' },
  ],
  openai: [
    { id: 'gpt-4o',       label: 'GPT-4o (recommended)' },
    { id: 'gpt-4o-mini',  label: 'GPT-4o Mini (fast)' },
    { id: 'gpt-4-turbo',  label: 'GPT-4 Turbo' },
    { id: 'o3-mini',      label: 'o3-mini (reasoning)' },
    { id: 'o1',           label: 'o1 (advanced reasoning)' },
  ],
  google: [
    { id: 'gemini-2.0-flash',              label: 'Gemini 2.0 Flash (recommended)' },
    { id: 'gemini-2.0-flash-thinking-exp', label: 'Gemini 2.0 Flash Thinking' },
    { id: 'gemini-1.5-pro',                label: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash',              label: 'Gemini 1.5 Flash (fast)' },
  ],
};

// ── OpenAI Responses API (supports web_search_preview) ────────
async function callOpenAI(system: string, user: string, model: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured on the server');

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      instructions: system,
      input: user,
      tools: [{ type: 'web_search_preview' }],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);

  const data = await res.json() as {
    output: Array<{ type: string; content: Array<{ type: string; text: string }> }>;
  };

  return data.output
    .filter(item => item.type === 'message')
    .flatMap(item => item.content)
    .filter(c => c.type === 'output_text')
    .map(c => c.text)
    .join('\n');
}

// ── Google Gemini (with Google Search grounding) ───────────────
async function callGemini(system: string, user: string, model: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not configured on the server');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);

  const data = await res.json() as {
    candidates: Array<{ content: { parts: Array<{ text?: string }> } }>;
  };

  return data.candidates
    .flatMap(c => c.content.parts)
    .filter(p => p.text)
    .map(p => p.text!)
    .join('\n');
}

// ── Unified entry point ────────────────────────────────────────
export async function callAI(
  system: string,
  user: string,
  settings: Record<string, unknown>,
): Promise<string> {
  const provider = (settings['ai_provider'] as AiProvider | undefined) ?? 'google';
  const model =
    (settings['ai_model'] as string | undefined) ??
    (settings['anthropic_model'] as string | undefined) ??   // backwards compat
    'gemini-2.0-flash';

  switch (provider) {
    case 'openai':   return callOpenAI(system, user, model);
    case 'google':   return callGemini(system, user, model);
    case 'anthropic':
    default:         return callClaude(system, user, model);
  }
}
