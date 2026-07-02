import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import jwt, { type JwtPayload, type Secret } from "jsonwebtoken";
import { env } from "../../config/index.js";
import AppError from "../error/AppError.js";

/**
 * P2 — JWT auth middleware with algorithm pinning and SUPER_ADMIN elevation.
 *
 * Algorithm pinning: jwt.verify() must have `{ algorithms: [...] }` to close
 * the "none-algorithm" / algorithm-confusion class (CVE-2022-23529 family).
 * The library is patched, but the protection only applies when callers pin.
 *
 * SUPER_ADMIN elevation: SUPER_ADMIN is a strict superset of ADMIN.
 * Any route that accepts ADMIN also accepts SUPER_ADMIN automatically.
 * Routes that should be SUPER_ADMIN-only must be listed explicitly
 * (e.g. authValidator("SUPER_ADMIN") with no "ADMIN" in the array).
 */
const authValidator = (...requiredRoles: string[]) => {
  return async (
    req: Request,
    //@ts-ignore
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new AppError(httpStatus.BAD_REQUEST, "Token not found");
      }

      const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

      if (!token) {
        throw new AppError(httpStatus.BAD_REQUEST, "Token not found");
      }

      // P2 — algorithm pinning: prevents "none" and algorithm-swap attacks.
      // env.JWT_ALGORITHM comes from the validated zod schema (HS256 default).
      const verifiedUser = jwt.verify(token, env.JWT_SECRET as Secret, {
        algorithms: [env.JWT_ALGORITHM as jwt.Algorithm],
      }) as unknown as JwtPayload & { role: string };

      if (!verifiedUser) {
        throw new AppError(httpStatus.BAD_REQUEST, "Invalid token");
      }

      req.user = verifiedUser;

      if (requiredRoles.length) {
        // P2 — SUPER_ADMIN elevation: if ADMIN is an accepted role, SUPER_ADMIN
        // is implicitly accepted too. SUPER_ADMIN-only routes must be listed
        // as authValidator("SUPER_ADMIN") explicitly (without "ADMIN").
        const effectiveRoles =
          requiredRoles.includes("ADMIN") && !requiredRoles.includes("SUPER_ADMIN")
            ? [...requiredRoles, "SUPER_ADMIN"]
            : requiredRoles;

        if (!effectiveRoles.includes(verifiedUser.role)) {
          throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to access this route");
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default authValidator;
