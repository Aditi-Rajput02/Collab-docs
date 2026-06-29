import { kv } from '@vercel/kv';

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
  const key = `rl:${action}:${userId}`;
  const count = await kv.incr(key);
  if (count === 1) await kv.expire(key, windowSec);
  const ttl = await kv.ttl(key);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetIn: ttl,
  };
}
