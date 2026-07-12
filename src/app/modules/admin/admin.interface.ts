import { Prisma, ReportStatus } from '../../../generated/prisma/index.js';

export interface AdminActor {
  id?: string;
  userId?: string;
  role: string;
  email?: string;
}

export interface SystemSettingsUpdate {
  id?: string;
  aiMatchmaking?: boolean;
  publicRegistration?: boolean;
  globalNotifications?: boolean;
  extendedAuditLogging?: boolean;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  maintenanceEstimatedEnd?: string | Date | null;
  siteName?: string;
  siteSlogan?: string | null;
  siteLogo?: string | null;
  supportEmail?: string | null;
  qrCodeUrl?: string;
  footerSocials?: Prisma.InputJsonValue;
}

export type EmployerStatus = 'Verified' | 'Pending' | 'Suspended';
export type JobSeekerStatus = 'Hired' | 'Looking' | 'Active' | 'Suspended';

export interface EmployerOwner {
  id: string | null;
  fullName: string;
  email: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
}

export interface GetJobReportsQuery {
  page?: string | number;
  limit?: string | number;
  status?: ReportStatus;
  severity?: string;
  q?: string;
}

export interface SystemMetrics {
  server: {
    platform: string;
    arch: string;
    nodeVersion: string;
    uptime: number;
    processUptime: number;
    pid: number;
    currentTime: string;
  };
  resources: {
    cpuLoad: number[];
    memory: {
      total: number;
      free: number;
      used: number;
      ratio: number;
      processHeap: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
      };
    };
  };
  performance: {
    eventLoopLagMs: number;
    activeHandles: number;
    activeRequests: number;
  };
  dependencies: {
    database: {
      status: 'UP' | 'DOWN';
      latencyMs: number;
    };
    redis: {
      status: 'UP' | 'DOWN';
      store: string;
    };
  };
}
