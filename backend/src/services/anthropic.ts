const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

export async function callClaude(systemPrompt: string, userPrompt: string, model?: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model ?? 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${text}`);
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
}

export function extractJSON(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1].trim()); } catch {} }
  const raw = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (raw) { try { return JSON.parse(raw[1]); } catch {} }
  throw new Error('Could not extract JSON from Claude response');
}
