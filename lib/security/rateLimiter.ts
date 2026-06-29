// Simple in-memory rate limiter (no Redis/KV required for Vercel hobby tier).
// For production at scale, swap the Map for Upstash Redis.

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetIn: number;
};

export async function rateLimit(
  userId: string,
  action: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const key = `${action}:${userId}`;
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowSec * 1000 };
  }

  entry.count += 1;
  store.set(key, entry);

  const resetIn = Math.ceil((entry.resetAt - now) / 1000);
  return {
    allowed:   entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetIn,
  };
}
