import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config({ path: path.join(process.cwd(), ".env") });

// ---------------------------------------------------------------------------
// P0.5 — Startup environment validation (fail-fast)
// All secrets are enforced at min-length; missing vars exit the process before
// any database connection or route registration happens.
// ---------------------------------------------------------------------------
const envSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),

  // Database
  DATABASE_URL: z.string().url(),
  DB_CA_CERT_PATH: z.string().optional(), // path to CA cert for self-hosted Postgres — see P3

  // JWT (algorithm-pinned in authValidator, auth.service, socket, maintenanceMode)
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("1d"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  JWT_ALGORITHM: z.string().default("HS256"),

  // Auth
  // P2: default 13 (up from 12) — 2^13 rounds; within OWASP's updated recommendation
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(13),
  // Signed-cookie secret — min 32 bytes enforced; dev default warns loudly in logs
  COOKIE_SECRET: z.string().min(32).default("workly-dev-cookie-secret-REPLACE-BEFORE-PRODUCTION!"),

  // CORS — comma-separated list of exact origins; no substrings, no wildcards
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000,http://localhost:8081"),

  // SSLCommerz
  SSLCOMMERZ_STORE_ID: z.string().min(1).default("testbox"),
  SSLCOMMERZ_STORE_PASSWD: z.string().min(1).default("qwerty"),
  SSLCOMMERZ_IS_LIVE: z.coerce.boolean().default(false),

  // Redis (optional now — P1's in-memory fallback is used until REDIS_URL is set)
  REDIS_URL: z.string().url().optional(),

  // URLs
  BACKEND_URL: z.string().default("http://localhost:5000"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),

  // Google OAuth (optional — strategy not registered if absent)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Cloudinary (optional — upload routes fail gracefully if absent)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // SMTP (optional — email sending fails gracefully if absent)
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid environment configuration — server cannot start:");
  console.error(parsed.error.format());
  process.exit(1);
}

/**
 * Validated, typed environment. Use this everywhere instead of process.env.X.
 * The only documented exceptions are prisma/seed.ts and prisma.config.ts, which
 * run standalone via the Prisma CLI before the app boots.
 */
export const env = parsed.data;

// Warn loudly in production if the dev-default COOKIE_SECRET sneaked through.
// The min-length check ensures it has a value; this catches the specific default.
if (
  env.NODE_ENV === "production" &&
  env.COOKIE_SECRET === "workly-dev-cookie-secret-REPLACE-BEFORE-PRODUCTION!"
) {
  console.error(
    "❌  COOKIE_SECRET is still set to the dev default in production. Set a real secret and restart.",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Backward-compat alias — existing callers use `config.X`; migrate to `env.X`
// over time. The `environment` key now reads NODE_ENV (P0.2 — ENVIRONMENT var
// removed; both guards now use the same source of truth).
// ---------------------------------------------------------------------------
const config = {
  port: env.PORT,
  database_url: env.DATABASE_URL,
  bcrypt_salt_rounds: env.BCRYPT_SALT_ROUNDS,
  jwt_secret: env.JWT_SECRET,
  jwt_expires_in: env.JWT_EXPIRES_IN,
  jwt_refresh_secret: env.JWT_REFRESH_SECRET,
  jwt_refresh_expires_in: env.JWT_REFRESH_EXPIRES_IN,
  jwt_algorithm: env.JWT_ALGORITHM,
  /**
   * P0.2 fix: `environment` now mirrors NODE_ENV.
   * The old ENVIRONMENT variable is no longer read anywhere.
   * The gating bug in server.ts (config.environment vs process.env.NODE_ENV)
   * is resolved as a side-effect — both now read the same zod-validated value.
   */
  environment: env.NODE_ENV,
  backend_url: env.BACKEND_URL,
  google_client_id: env.GOOGLE_CLIENT_ID,
  google_client_secret: env.GOOGLE_CLIENT_SECRET,
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  frontend_url: env.FRONTEND_URL,
  // P0.3 fix: exact-match array; SSLCommerz real origins must be added here
  allowed_origins: env.ALLOWED_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  cloudinary: {
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  },
  sslcommerz: {
    store_id: env.SSLCOMMERZ_STORE_ID,
    store_passwd: env.SSLCOMMERZ_STORE_PASSWD,
    is_live: env.SSLCOMMERZ_IS_LIVE,
  },
};

export default config;
