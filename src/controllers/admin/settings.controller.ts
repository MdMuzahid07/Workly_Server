import type { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import { z } from "zod";
import { getSystemStatus, setMaintenanceMode } from "../../services/systemSettings.service.js";
import { getIO } from "../../socket/index.js";

const StatusCodes = {
  OK: httpStatus.OK,
  SERVICE_UNAVAILABLE: httpStatus.SERVICE_UNAVAILABLE,
};

const toggleSchema = z.object({
  enabled: z.boolean(),
  message: z.string().min(1).max(500).optional(),
});

export const getSettingsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const status = await getSystemStatus();
    res.status(StatusCodes.OK).json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
};

export const toggleMaintenanceModeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { enabled, message } = toggleSchema.parse(req.body);
    const adminId = (req as any).user!.id;

    const settings = await setMaintenanceMode({ enabled, message, adminId });

    const io = getIO();

    if (io) {
      if (enabled) {
        // Give connected clients a 10-second warning before hard-blocking them
        io.emit("maintenance:warning", {
          gracePeriodMs: 10_000,
          message: settings.maintenanceMessage,
        });

        setTimeout(() => {
          io.emit("maintenance:change", {
            enabled: true,
            message: settings.maintenanceMessage,
          });
        }, 10_000);
      } else {
        // Disable immediately — no grace period needed
        io.emit("maintenance:change", {
          enabled: false,
          message: null,
        });
      }
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Maintenance mode ${enabled ? "enabled" : "disabled"}`,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};
