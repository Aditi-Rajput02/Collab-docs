import { createGroq } from '@ai-sdk/groq';

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
});

export const AI_MODEL = 'llama-3.3-70b-versatile';

export const AI_RATE_LIMITS = {
  summarize:    { limit: 10, windowSec: 60 },
  grammar:      { limit: 20, windowSec: 60 },
  autocomplete: { limit: 30, windowSec: 60 },
  rewrite:      { limit: 10, windowSec: 60 },
} as const;
