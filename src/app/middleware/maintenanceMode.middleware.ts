import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import { getSystemStatus } from "../../services/systemSettings.service.js";

/** These paths are always reachable regardless of maintenance state */
const BYPASS_PREFIXES = [
  "/auth/", // Login must always work
  "/public/status", // Status endpoint must always respond
  "/admin/settings/maintenance", // Admin must be able to toggle OFF
];

const extractAdminFromToken = (req: Request): boolean => {
  try {
    const token = req.cookies?.accessToken ?? req.headers.authorization?.replace("Bearer ", "");

    if (!token) return false;

    // Use jwt.verify to prevent tampered role claims bypassing this guard
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      role?: string;
    };

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
    // Fail open — never block users due to an internal error in this check
    next();
  }
};
