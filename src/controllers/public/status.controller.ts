/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { checkRedisHealth } from '../../lib/rateLimitStore.js';
import { getSystemStatus } from '../../services/systemSettings.service.js';
import prisma from '../../utils/prismaClient.js';

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
      .set('Cache-Control', 'public, max-age=5, stale-while-revalidate=10')
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

export const publicHealthHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let dbStatus = 'UP';
    let dbError: string | null = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err: any) {
      dbStatus = 'DOWN';
      dbError = err.message || String(err);
    }

    let redisStatus = 'NOT_CONFIGURED';
    try {
      redisStatus = await checkRedisHealth();
    } catch {
      redisStatus = 'DOWN';
    }

    const isHealthy = dbStatus === 'UP' && redisStatus !== 'DOWN';

    res.status(isHealthy ? httpStatus.OK : httpStatus.SERVICE_UNAVAILABLE).json({
      success: isHealthy,
      status: isHealthy ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          error: dbError,
        },
        redis: {
          status: redisStatus,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
