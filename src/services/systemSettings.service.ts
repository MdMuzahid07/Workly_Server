import prisma from "../utils/prismaClient.js";
import { maintenanceCache } from "../lib/maintenanceCache.js";

const SINGLETON_ID = "singleton";
const DEFAULT_MESSAGE = "We're performing scheduled maintenance. We'll be back shortly.";

/** Returns maintenance state. Hits DB only when cache is stale (>30s). */
export const getSystemStatus = async () => {
  if (!maintenanceCache.isStale()) {
    return maintenanceCache.get();
  }

  const settings = await prisma.systemSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID },
    update: {},
  });

  maintenanceCache.set(
    settings.maintenanceMode,
    settings.maintenanceMessage,
    settings.maintenanceSetAt,
    settings.maintenanceEstimatedEnd,
  );
  return maintenanceCache.get();
};

export const setMaintenanceMode = async ({
  enabled,
  message,
  estimatedEnd,
  adminId,
}: {
  enabled: boolean;
  message?: string;
  estimatedEnd?: Date | string | null;
  adminId: string;
}) => {
  const settings = await prisma.systemSettings.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      maintenanceMode: enabled,
      maintenanceMessage: message ?? DEFAULT_MESSAGE,
      maintenanceSetAt: enabled ? new Date() : null,
      maintenanceSetBy: enabled ? adminId : null,
      maintenanceEstimatedEnd: enabled && estimatedEnd ? new Date(estimatedEnd) : null,
    },
    update: {
      maintenanceMode: enabled,
      maintenanceMessage: message ?? DEFAULT_MESSAGE,
      maintenanceSetAt: enabled ? new Date() : null,
      maintenanceSetBy: enabled ? adminId : null,
      maintenanceEstimatedEnd: enabled && estimatedEnd ? new Date(estimatedEnd) : null,
    },
  });

  // Sync cache immediately — don't wait for next request's TTL check
  maintenanceCache.set(
    settings.maintenanceMode,
    settings.maintenanceMessage,
    settings.maintenanceSetAt,
    settings.maintenanceEstimatedEnd,
  );

  return settings;
};
