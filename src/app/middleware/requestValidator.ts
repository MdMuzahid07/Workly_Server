import type { NextFunction, Request, Response } from "express";
import { z, type ZodTypeAny } from "zod";
import AppError from "../error/AppError.js";

/**
 * P4 — Request body validator (backward-compatible, existing usage unchanged).
 * Validates req.body only against the provided Zod schema.
 */
const requestValidator = (schema: ZodTypeAny) => {
  return async (
    req: Request,
    //@ts-ignore
    res: Response,
    next: NextFunction,
  ) => {
    try {
      req.body = await schema.parseAsync(req.body);
      return next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * P4 / B11 fix — Combined body+query+params validator.
 * The original requestValidator only validated req.body, silently ignoring
 * SQL-injectable or malformed query parameters and path params.
 *
 * Schema shape: { body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }
 *
 * Example usage:
 *   router.get("/job/:id", validateRequest(z.object({
 *     params: z.object({ id: z.string().uuid() }),
 *     query: z.object({ page: z.coerce.number().optional() }),
 *   })), handler);
 */
export const validateRequest = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      // Fail-closed: P9 — if validation fails, always reject. Never call next()
      // without data, never silently allow through on unexpected parse errors.
      return next(new AppError(400, result.error.message));
    }

    const parsedData = result.data as {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    };

    // Assign validated+coerced values back so controllers see clean data
    if (parsedData.body !== undefined) req.body = parsedData.body as Record<string, any>;
    if (parsedData.query !== undefined) req.query = parsedData.query as any;
    if (parsedData.params !== undefined) req.params = parsedData.params as any;

    return next();
  };
};

/**
 * Convenience wrapper for query-only validation.
 */
export const validateQuery = (querySchema: ZodTypeAny) =>
  validateRequest(
    z.object({
      query: querySchema,
    }),
  );

export default requestValidator;
