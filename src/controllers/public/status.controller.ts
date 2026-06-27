import type { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import { getSystemStatus } from "../../services/systemSettings.service.js";

const StatusCodes = {
  OK: httpStatus.OK,
};

export const publicStatusHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const status = await getSystemStatus();
    const { enabled, message, setAt, estimatedEnd } = status as any;

    // Cache-Control headers to leverage edge/browser caching and optimize requests
    res
      .status(StatusCodes.OK)
      .set("Cache-Control", "public, max-age=5, stale-while-revalidate=10")
      .json({
        success: true,
        data: {
          maintenanceMode: enabled,
          message: enabled ? message : null,
          setAt: enabled ? setAt : null,
          estimatedEnd: enabled ? estimatedEnd : null,
        },
      });
  } catch (error) {
    next(error);
  }
};
