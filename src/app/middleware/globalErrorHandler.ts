import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../../config/index.js';
import formatZodError from '../error/formatZodError.js';

interface IError extends Error {
  statusCode?: number;
  path?: string[];
  message: string;
  code?: string; // Prisma error code (P1xxx, P2xxx)
}

/**
 * P9 — Global error handler.
 *
 * Fail-closed on security checks: auth, BOLA, validation, and payment
 * transitions all throw AppError — those errors are intentional and their
 * 4xx messages are safe to return to the client.
 *
 * In production:
 *   - 5xx responses return a generic "Internal server error" message only.
 *   - Prisma errors (code matching /^P\d{4}$/) are sanitised regardless of
 *     their statusCode — they may contain table names, column names, or raw
 *     SQL that must never reach the client.
 *   - error.stack is never included in any response (development or production).
 *
 * Fail-open applies only to availability-affecting side effects (rate limiter
 * store, push notification sends) — those are handled at their call sites.
 */
const globalErrorHandler = (error: IError, req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    const zodFormattedError = formatZodError(error, req.originalUrl);
    res.status(422).json(zodFormattedError);
    return;
  }

  const statusCode = error.statusCode || 500;
  const isProduction = env.NODE_ENV === 'production';

  // B10 fix — Prisma errors have a `code` property matching /^P\d{4}$/.
  // They may contain table names, column names, or raw SQL in their message.
  const isPrismaError = typeof error.code === 'string' && /^P\d{4}$/.test(error.code);

  // JWT errors are safe to surface (they're expected, not internal failures)
  if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: error.name,
      errorSources: {
        path: error.path || req.originalUrl,
        message: error.name,
      },
    });
    return;
  }

  // Log the error to stdout/stderr so it appears in Vercel logs
  if (statusCode >= 500) {
    console.error(`[Error] ${req.method} ${req.originalUrl} >>`, error);
  }

  // In production: sanitise 5xx messages and all Prisma errors.
  // In development: pass through the real message for debuggability.
  const safeMessage =
    isProduction && (statusCode >= 500 || isPrismaError)
      ? 'Internal server error'
      : error.message || 'Something went wrong!';

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
    errorSources: {
      path: error.path || req.originalUrl,
      // In production, errorSources.message also gets the safe message.
      // Never include error.stack anywhere.
      message:
        isProduction && (statusCode >= 500 || isPrismaError)
          ? 'Internal server error'
          : error.message,
    },
  });
};

export default globalErrorHandler;
