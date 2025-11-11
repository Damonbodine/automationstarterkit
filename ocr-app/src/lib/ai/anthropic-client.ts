import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Prefer configuring the model via env. Default to Sonnet 4.5.
// Use dated versions for production (e.g., claude-sonnet-4-5-20250929) or aliases for latest
export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
export const CLAUDE_FALLBACK_MODEL =
  process.env.ANTHROPIC_FALLBACK_MODEL || 'claude-haiku-4-5-20251001';

export async function createClaudeMessage({
  prompt,
  maxTokens,
}: {
  prompt: string;
  maxTokens: number;
}) {
  try {
    return await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });
  } catch (err: any) {
    const isNotFound = err?.status === 404 || err?.error?.type === 'not_found_error' || err?.message?.includes('not_found_error');
    if (isNotFound && CLAUDE_FALLBACK_MODEL) {
      console.warn(`[anthropic] Model ${CLAUDE_MODEL} not found. Falling back to ${CLAUDE_FALLBACK_MODEL}.`);
      return await anthropic.messages.create({
        model: CLAUDE_FALLBACK_MODEL,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
    }
    throw err;
  }
}

