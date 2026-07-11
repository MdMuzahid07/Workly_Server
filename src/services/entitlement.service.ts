/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from '../utils/prismaClient.js';
import { entitlementCache } from '../utils/entitlement.cache.js';
import { PlanFeatureFlags } from '../types/subscription.types.js';

export const ADMIN_FLAGS: PlanFeatureFlags = {
  maxActiveJobs: 9999,
  maxUsers: 9999,
  maxMonthlyApplications: 9999,
  maxResumes: 9999,
  canMessage: true,
  canViewAnalytics: true,
  canViewProfileAnalytics: true,
  isFeaturedProfile: true,
  canMessageEmployer: true,
};

export const FREE_EMPLOYER_FLAGS: PlanFeatureFlags = {
  maxActiveJobs: 1,
  maxUsers: 1,
  maxMonthlyApplications: 0,
  maxResumes: 0,
  canMessage: false,
  canViewAnalytics: false,
  canViewProfileAnalytics: false,
  isFeaturedProfile: false,
  canMessageEmployer: false,
};

export const FREE_SEEKER_FLAGS: PlanFeatureFlags = {
  maxActiveJobs: 0,
  maxUsers: 0,
  maxMonthlyApplications: 40,
  maxResumes: 1,
  canMessage: false,
  canViewAnalytics: false,
  canViewProfileAnalytics: false,
  isFeaturedProfile: false,
  canMessageEmployer: false,
};

const isSubscriptionActive = (sub: { status: string; endDate: Date | null } | null) => {
  if (!sub) return false;
  if (sub.status !== 'ACTIVE') return false;
  if (sub.endDate && new Date() > new Date(sub.endDate)) return false;
  return true;
};

export class EntitlementService {
  static async getUserEntitlements(userId: string): Promise<PlanFeatureFlags> {
    const cached = entitlementCache.get(userId);
    if (cached) {
      return cached;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          company: {
            include: {
              subscription: {
                include: {
                  plan: true,
                },
              },
            },
          },
          userSubscription: {
            include: {
              plan: true,
            },
          },
        },
      });

      if (!user) {
        return FREE_SEEKER_FLAGS;
      }

      let entitlements: PlanFeatureFlags;

      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        entitlements = ADMIN_FLAGS;
      } else if (user.role === 'EMPLOYER') {
        const sub = user.company?.subscription;
        if (sub && isSubscriptionActive(sub)) {
          entitlements = sub.plan.features as unknown as PlanFeatureFlags;
        } else {
          entitlements = FREE_EMPLOYER_FLAGS;
        }
      } else {
        // JOB_SEEKER / Candidate
        const sub = user.userSubscription;
        if (sub && isSubscriptionActive(sub)) {
          entitlements = sub.plan.features as unknown as PlanFeatureFlags;
        } else {
          entitlements = FREE_SEEKER_FLAGS;
        }
      }

      entitlementCache.set(userId, entitlements);
      return entitlements;
    } catch (error: any) {
      console.error(
        `[ALERT] [EntitlementService] Database outage while checking entitlements for user ${userId}. ` +
          `Falling back to default FREE flags. Error: ${error.message || error}`,
      );
      return FREE_SEEKER_FLAGS;
    }
  }

  static async getCurrentUsage(
    userId: string,
  ): Promise<{ jobsPosted: number; applicationsSubmitted: number; resumesUploaded: number }> {
    const period = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    const [user, usage, resumeCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, companyId: true },
      }),
      prisma.usageCounter.findUnique({
        where: {
          userId_period: {
            userId,
            period,
          },
        },
      }),
      prisma.resume.count({
        where: {
          userId,
          deletedAt: null,
        },
      }),
    ]);

    let activeJobsCount = usage?.jobsPosted ?? 0;
    if (user?.role === 'EMPLOYER' && user.companyId) {
      activeJobsCount = await prisma.job.count({
        where: {
          companyId: user.companyId,
          status: 'ACTIVE',
          deletedAt: null,
        },
      });
    }

    let appsCount = usage?.applicationsSubmitted ?? 0;
    if (user?.role === 'JOB_SEEKER') {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      appsCount = await prisma.application.count({
        where: {
          applicantId: userId,
          deletedAt: null,
          createdAt: {
            gte: monthStart,
          },
        },
      });
    }

    return {
      jobsPosted: activeJobsCount,
      applicationsSubmitted: appsCount,
      resumesUploaded: resumeCount,
    };
  }

  static async incrementUsage(
    userId: string,
    field: 'jobsPosted' | 'applicationsSubmitted',
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) return;

    const period = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    await prisma.usageCounter.upsert({
      where: {
        userId_period: {
          userId,
          period,
        },
      },
      update: {
        [field]: { increment: 1 },
      },
      create: {
        userId,
        companyId: user.companyId,
        period,
        [field]: 1,
      },
    });
  }

  static invalidateCache(userId: string): void {
    entitlementCache.delete(userId);
  }
}
