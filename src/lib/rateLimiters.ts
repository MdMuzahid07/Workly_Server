import rateLimit from 'express-rate-limit';
import { env } from '../config/index.js';
import { getRateLimitStore } from './rateLimitStore.js';

// Store is resolved once at startup; awaited in app.ts before the server binds.
const storePromise = getRateLimitStore();

/**
 * Global limiter: applied to every request.
 * 100 requests per 15 minutes per IP.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'production' ? 100 : 999999,
  standardHeaders: true, // Return RateLimit-* headers (RFC 6585)
  legacyHeaders: false, // Disable X-RateLimit-* headers
  store: undefined, // replaced with resolved store below
  skip: (req) => req.method === 'OPTIONS' || env.NODE_ENV !== 'production', // preflight requests don't count, skip in dev
});

/**
 * Auth limiter: applied to login, register, forgot-password, reset-password.
 * 5 requests per 15 minutes; successful requests don't count toward the limit.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'production' ? 5 : 999999,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failed attempts
  store: undefined, // replaced with resolved store below
  skip: () => env.NODE_ENV !== 'production', // skip in dev
  message: {
    success: false,
    message: 'Too many attempts from this IP, please try again after 15 minutes.',
  },
});

/**
 * Initialises both limiters with the resolved store (Redis or MemoryStore).
 * Must be called and awaited before the limiters are registered in app.ts.
 */
export async function initRateLimiters(): Promise<void> {
  const store = await storePromise;
  if (store) {
    // @ts-expect-error — express-rate-limit allows store to be set after construction
    globalLimiter.store = store;
    // @ts-expect-error
    authLimiter.store = store;
  }
}
