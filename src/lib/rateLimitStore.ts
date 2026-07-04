import type { Store } from "express-rate-limit";
import { env } from "../config/index.js";

// Lazy-initialized so the module can be imported without connecting immediately.
let redisClient: import("ioredis").Redis | null = null;

/**
 * Returns a Redis-backed rate-limit store when REDIS_URL is set,
 * or `undefined` (express-rate-limit's built-in MemoryStore) when it isn't.
 *
 * Fail-open on Redis errors: a Redis outage should NOT take the API down.
 * Rate limiting is defense-in-depth, not the primary security control.
 * Contrast with auth/BOLA/payment checks — those fail-closed (see P9).
 *
 * ⚠️  In-memory fallback is ONLY correct with a single Node process.
 *    If you run PM2 cluster mode or multiple replicas, each worker keeps
 *    its own counter and the effective limit multiplies by worker count.
 *    Set REDIS_URL before scaling out.
 */
export async function getRateLimitStore(): Promise<Store | undefined> {
  if (!env.REDIS_URL) {
    console.warn(
      "[RateLimit] REDIS_URL not set — using in-memory MemoryStore. " +
        "Correct for a single Node process only. Set REDIS_URL before scaling out.",
    );
    return undefined;
  }

  try {
    const { default: Redis } = await import("ioredis");
    const { RedisStore } = await import("rate-limit-redis");

    redisClient ??= new Redis(env.REDIS_URL, {
      // Fail open: if Redis is unavailable, let the limiter degrade gracefully
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    return new RedisStore({
      sendCommand: (...args: [string, ...string[]]) =>
        redisClient!.call(...args) as Promise<number>,
    });
  } catch (err) {
    console.warn("[RateLimit] Redis store init failed — falling back to in-memory:", err);
    return undefined;
  }
}
