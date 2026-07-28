import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import apiNotFound from './app/middleware/apiNotFound.js';
import globalErrorHandler from './app/middleware/globalErrorHandler.js';
import { maintenanceModeMiddleware } from './app/middleware/maintenanceMode.middleware.js';
import router from './app/route/index.js';
import { env } from './config/index.js';
import passport from './config/passport.config.js';
import { globalLimiter } from './lib/rateLimiters.js';

// ---------------------------------------------------------------------------
// CORS — P0.3 fixes:
//  1. No substring match (origin.includes was bypassable via sslcommerz.com.attacker.io)
//  2. No unconditional `null` origin in production (sandboxed iframe bypass)
//  3. No duplicate frontend_url check (folded into ALLOWED_ORIGINS array)
//  4. SSLCommerz real origins must be added to ALLOWED_ORIGINS env var
// ---------------------------------------------------------------------------
const allowedOrigins = [...env.ALLOWED_ORIGINS.split(','), env.BACKEND_URL, env.FRONTEND_URL]
  .map((o) => (o ? o.trim().replace(/\/+$/, '') : ''))
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Requests with no origin (server-to-server, curl) are allowed.
    // The `null` string origin (sandboxed iframes / data: URIs) is NOT allowed
    // globally — scope it to specific routes if SSLCommerz genuinely requires it.
    if (!origin) return callback(null, true);

    // Non-production: also accept localhost on any port and local-network IPs
    if (env.NODE_ENV !== 'production') {
      if (
        /^https?:\/\/localhost(?::\d+)?$/i.test(origin) ||
        /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin) ||
        /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(?::\d+)?$/i.test(origin)
      ) {
        return callback(null, true);
      }
    }

    // Exact-match check against the validated allowlist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
};

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app: Application = express();

// P10 / P1: trust proxy — set to exact hop count for your load balancer.
// Q1 FLAG: confirm this value matches your deployment topology before production.
//   1 = one reverse proxy in front of Node (most common VPS/LB setups)
//   Vercel serverless: requires a different value — confirm Q1 before finalising.
// Never use `true` — it makes the leftmost X-Forwarded-For client-spoofable.
app.set('trust proxy', 1);

// P1 — Middleware stack, ordered per spec:
// helmet → cors → globalLimiter → body parsers → cookieParser → hpp → passport
// CORS is registered BEFORE body parsers so bad origins are rejected before
// any body parsing work happens.
app.use(helmet());
// P1.1: Exact-match set for SSLCommerz callback paths — prevents sub-path bypasses
const PAYMENT_CALLBACK_PATHS = new Set([
  '/api/v1/payments/success',
  '/api/v1/payments/fail',
  '/api/v1/payments/cancel',
  '/api/v1/payments/ipn',
]);

app.use((req: any, res: any, next: any) => {
  const isPaymentCallback = PAYMENT_CALLBACK_PATHS.has(req.path);

  if (isPaymentCallback) {
    // Permit all external POST checkouts from SSLCommerz sandbox / live servers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    return next();
  }

  cors(corsOptions)(req, res, next);
});
app.use(globalLimiter);
app.use(express.json({ limit: '1mb' })); // was 50mb — P0.6
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // was 50mb — P0.6
app.use(cookieParser(env.COOKIE_SECRET)); // B4 fix: signed-cookie secret added
app.use(hpp());
app.use(passport.initialize());

app.use('/api/v1', maintenanceModeMiddleware, router);

app.use(apiNotFound);
app.use(globalErrorHandler);

export default app;
