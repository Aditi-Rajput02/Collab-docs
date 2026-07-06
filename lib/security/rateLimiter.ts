/**
 * Sliding-window rate limiter.
 *
 * Uses an in-memory Map in development / single-instance deployments.
 * On Vercel (multi-instance serverless), this resets per cold-start —
 * replace with Upstash Redis for true distributed rate limiting:
 *   npm install @upstash/ratelimit @upstash/redis
 *
 * Current limits provide protection against naive/sequential attacks
 * even without shared state between instances.
 */

type Window = { count: number; resetAt: number };
const store = new Map<string, Window>();

const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, w] of store) {
    if (w.resetAt <= now) store.delete(key);
  }
}, 5 * 60 * 1000);
if (cleanup.unref) cleanup.unref();

export type RateLimitResult = { allowed: boolean; remaining: number; resetIn: number };

function check(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  let w = store.get(key);

  if (!w || w.resetAt <= now) {
    w = { count: 0, resetAt: now + windowSec * 1000 };
  }
  w.count += 1;
  store.set(key, w);

  const resetIn = Math.ceil((w.resetAt - now) / 1000);
  return { allowed: w.count <= limit, remaining: Math.max(0, limit - w.count), resetIn };
}

/** 5 login attempts per IP per 15 minutes */
export function checkLoginLimit(ip: string): RateLimitResult {
  return check(`login:${ip}`, 5, 15 * 60);
}

/** 3 registrations per IP per hour */
export function checkRegisterLimit(ip: string): RateLimitResult {
  return check(`register:${ip}`, 3, 60 * 60);
}

/** 60 sync/API calls per user per minute */
export function checkSyncLimit(userId: string): RateLimitResult {
  return check(`sync:${userId}`, 60, 60);
}
