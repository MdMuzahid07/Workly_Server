import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import { env } from "../../config/index.js";
import { getSystemStatus } from "../../services/systemSettings.service.js";

/** These paths are always reachable regardless of maintenance state */
const BYPASS_PREFIXES = [
  "/auth/", // Login must always work
  "/public/status", // Status endpoint must always respond
  "/admin/settings/maintenance", // Admin must be able to toggle OFF
];

/**
 * B9 fix: uses env.JWT_SECRET from the validated zod env object
 * instead of process.env.JWT_SECRET! (bypassed validation).
 * Also adds algorithm pinning to the verify call (consistent with
 * authValidator.ts and auth.service.ts).
 *
 * P5 / maintenance-mode footgun: ADMIN and SUPER_ADMIN bypass maintenance
 * mode so an admin can always disable it — turning maintenance on cannot
 * remove the only way to turn it off.
 */
const extractAdminFromToken = (req: Request): boolean => {
  try {
    const token = req.cookies?.accessToken ?? req.headers.authorization?.replace("Bearer ", "");

    if (!token) return false;

    // B9 fix: use env.JWT_SECRET (zod-validated) not process.env.JWT_SECRET!
    // Algorithm pinning added — same options as authValidator.ts
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: [env.JWT_ALGORITHM as jwt.Algorithm],
    }) as { role?: string };

    return decoded.role === "ADMIN" || decoded.role === "SUPER_ADMIN";
  } catch {
    return false; // Expired, invalid, tampered — treat as non-admin
  }
};

export const maintenanceModeMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Fast path 1: exempt routes — req.path is relative to /api/v1 mount point
    if (BYPASS_PREFIXES.some((p) => req.path.startsWith(p))) {
      next();
      return;
    }

    // Fast path 2: verified admin JWT bypasses maintenance
    if (extractAdminFromToken(req)) {
      next();
      return;
    }

    const { enabled, message } = await getSystemStatus();

    if (enabled) {
      res.status(httpStatus.SERVICE_UNAVAILABLE).set("Retry-After", "3600").json({
        success: false,
        maintenanceMode: true,
        message,
      });
      return;
    }

    next();
  } catch {
    // Fail open — never block users due to an internal error in this check.
    // This is one of the correct fail-open cases (P9): availability-affecting
    // side effect where the alternative is a self-inflicted outage.
    next();
  }
};
