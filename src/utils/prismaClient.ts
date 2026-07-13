/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../generated/prisma/index.js';
import { env } from '../config/index.js';
import { logger } from './logger.js';

const { Pool } = pg;

// ---------------------------------------------------------------------------
// P3 — TLS-aware database connection with Pool Tuning & Session Timeouts
//
// The pg.Pool manages connection pooling and connects to the database via TCP/TLS.
// The PrismaPg driver adapter wraps this pool to map queries from the Prisma Engine.
// ---------------------------------------------------------------------------
const sslConfig = env.DB_CA_CERT_PATH
  ? { ssl: { ca: fs.readFileSync(env.DB_CA_CERT_PATH, 'utf8') } }
  : undefined;

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  ...sslConfig,
});

// Configure session-level timeouts directly on new PostgreSQL connections
// to protect against hanging transactions and stuck queries holding resources.
pool.on('connect', (client) => {
  client.query(`SET statement_timeout = ${env.DB_STATEMENT_TIMEOUT_MS}`).catch((err) => {
    logger.error({ err }, '[Database] Failed to set statement_timeout session parameter');
  });
  client
    .query(`SET idle_in_transaction_session_timeout = ${env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS}`)
    .catch((err) => {
      logger.error(
        { err },
        '[Database] Failed to set idle_in_transaction_session_timeout session parameter',
      );
    });
});

const adapter = new PrismaPg(pool);

const basePrisma = new PrismaClient({
  adapter,
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
  omit: {
    user: {
      passwordHash: true,
    },
  },
});

basePrisma.$on('error' as any, (e: any) => {
  logger.error({ err: e }, '[Prisma Client Error]');
});

basePrisma.$on('warn' as any, (e: any) => {
  logger.warn({ prismaWarn: e }, '[Prisma Client Warning]');
});

// ---------------------------------------------------------------------------
// Transient Error Retry Policy with Exponential Backoff + Jitter
// Only retry well-understood transient codes explicitly defined by Prisma/PG.
// ---------------------------------------------------------------------------
const TRANSIENT_ERROR_CODES = new Set(['P1001', 'P1008', 'P1017', 'P2034']);

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 100,
  maxDelay = 1000,
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const isTransient =
        error &&
        (TRANSIENT_ERROR_CODES.has(error.code) ||
          (error.message &&
            (error.message.includes('connection limit exceeded') ||
              error.message.includes('deadlock detected') ||
              error.message.includes('serialization failure') ||
              error.message.includes('connection timeout') ||
              error.message.includes('pool is closed') ||
              error.message.includes('client has been closed'))));

      if (!isTransient || attempt >= retries) {
        throw error;
      }

      const jitter = Math.random() * 50;
      const backoffDelay = Math.min(delay * Math.pow(2, attempt) + jitter, maxDelay);
      logger.warn(
        { err: error, attempt, retries, backoffDelay },
        '[Database] Query failed. Retrying in %sms.',
        backoffDelay.toFixed(0),
      );
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }
  return fn();
}

// Extend Prisma Client with tracing, structured error logging, slow query threshold detection, and automatic retries.
const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ model, operation, args, query }) {
      const queryName = model ? `${model}.${operation}` : operation;
      const start = Date.now();
      try {
        const result = await retryWithBackoff(() => query(args));
        const duration = Date.now() - start;
        if (duration >= env.SLOW_QUERY_THRESHOLD_MS) {
          logger.warn(
            { queryName, duration, args },
            '[Prisma Slow Query] %s took %sms',
            queryName,
            duration,
          );
        }
        return result;
      } catch (error: any) {
        const duration = Date.now() - start;
        logger.error(
          { err: error, queryName, duration, args },
          '[Prisma Error] %s failed after %sms',
          queryName,
          duration,
        );
        throw error;
      }
    },
  },
});

export const disconnectDb = async () => {
  try {
    await basePrisma.$disconnect();
    await pool.end();
    logger.info('[Database] Disconnected connection pool cleanly.');
  } catch (error) {
    logger.error({ err: error }, '[Database] Error disconnecting pool');
  }
};

// Export extended prisma instance
export default prisma as unknown as typeof basePrisma;
