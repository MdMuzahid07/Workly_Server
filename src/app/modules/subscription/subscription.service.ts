import prisma from "../../../utils/prismaClient.js";
import {
  EntitlementService,
  ADMIN_FLAGS,
  FREE_EMPLOYER_FLAGS,
  FREE_SEEKER_FLAGS,
} from "../../../services/entitlement.service.js";
import AppError from "../../error/AppError.js";
import httpStatus from "http-status";
import { PlanType, SubscriptionStatus } from "../../../generated/prisma/index.js";
import { MySubscriptionResponse, PlanFeatureFlags } from "../../../types/subscription.types.js";

const getMySubscription = async (userId: string): Promise<MySubscriptionResponse> => {
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
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const usage = await EntitlementService.getCurrentUsage(userId);

  // 1. Admin bypass
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    return {
      planName: "Admin Access",
      planType: PlanType.EMPLOYER,
      price: 0,
      startDate: user.createdAt,
      endDate: null,
      status: "ACTIVE",
      autoRenew: true,
      cancelAtPeriodEnd: false,
      features: ADMIN_FLAGS,
      usage: {
        jobsPosted: 0,
        applicationsSubmitted: 0,
        resumesUploaded: 0,
      },
    };
  }

  // 2. Employer subscription
  if (user.role === "EMPLOYER") {
    const sub = user.company?.subscription;
    const isSubActive =
      sub && sub.status === "ACTIVE" && (!sub.endDate || new Date() < new Date(sub.endDate));

    if (sub && isSubActive) {
      return {
        planName: sub.plan.name,
        planType: sub.plan.planType,
        price: sub.plan.price,
        startDate: sub.startDate,
        endDate: sub.endDate,
        status: sub.status,
        autoRenew: sub.autoRenew,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        features: sub.plan.features as unknown as PlanFeatureFlags,
        usage: {
          jobsPosted: usage.jobsPosted,
          applicationsSubmitted: 0,
          resumesUploaded: 0,
        },
      };
    } else {
      return {
        planName: "Free",
        planType: PlanType.EMPLOYER,
        price: 0,
        startDate: user.createdAt,
        endDate: null,
        status: "ACTIVE",
        autoRenew: false,
        cancelAtPeriodEnd: false,
        features: FREE_EMPLOYER_FLAGS,
        usage: {
          jobsPosted: usage.jobsPosted,
          applicationsSubmitted: 0,
          resumesUploaded: 0,
        },
      };
    }
  }

  // 3. Job Seeker subscription
  const sub = user.userSubscription;
  const isSubActive =
    sub && sub.status === "ACTIVE" && (!sub.endDate || new Date() < new Date(sub.endDate));

  if (sub && isSubActive) {
    return {
      planName: sub.plan.name,
      planType: sub.plan.planType,
      price: sub.plan.price,
      startDate: sub.startDate,
      endDate: sub.endDate,
      status: sub.status,
      autoRenew: sub.autoRenew,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      features: sub.plan.features as unknown as PlanFeatureFlags,
      usage: {
        jobsPosted: 0,
        applicationsSubmitted: usage.applicationsSubmitted,
        resumesUploaded: usage.resumesUploaded,
      },
    };
  } else {
    return {
      planName: "Free",
      planType: PlanType.JOB_SEEKER,
      price: 0,
      startDate: user.createdAt,
      endDate: null,
      status: "ACTIVE",
      autoRenew: false,
      cancelAtPeriodEnd: false,
      features: FREE_SEEKER_FLAGS,
      usage: {
        jobsPosted: 0,
        applicationsSubmitted: usage.applicationsSubmitted,
        resumesUploaded: usage.resumesUploaded,
      },
    };
  }
};

const cancelSubscription = async (userId: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      companyId: true,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.role === "EMPLOYER") {
    if (!user.companyId) {
      throw new AppError(httpStatus.BAD_REQUEST, "Company profile not found");
    }
    const sub = await prisma.subscription.findUnique({
      where: { companyId: user.companyId },
    });
    if (!sub || sub.status !== "ACTIVE") {
      throw new AppError(httpStatus.BAD_REQUEST, "No active subscription to cancel");
    }
    await prisma.subscription.update({
      where: { companyId: user.companyId },
      data: { cancelAtPeriodEnd: true },
    });
  } else if (user.role === "JOB_SEEKER") {
    const sub = await prisma.userSubscription.findUnique({
      where: { userId },
    });
    if (!sub || sub.status !== "ACTIVE") {
      throw new AppError(httpStatus.BAD_REQUEST, "No active subscription to cancel");
    }
    await prisma.userSubscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });
  } else {
    throw new AppError(httpStatus.BAD_REQUEST, "This role cannot have a subscription");
  }

  EntitlementService.invalidateCache(userId);
};

const adminAssignPlan = async (targetUserId: string, planId: string): Promise<void> => {
  const [targetUser, plan] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, companyId: true },
    }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ]);

  if (!targetUser) {
    throw new AppError(httpStatus.NOT_FOUND, "Target user not found");
  }
  if (!plan) {
    throw new AppError(httpStatus.NOT_FOUND, "Plan not found");
  }

  if (targetUser.role === "EMPLOYER") {
    if (plan.planType !== PlanType.EMPLOYER) {
      throw new AppError(httpStatus.BAD_REQUEST, "Cannot assign a job seeker plan to an employer");
    }
    if (!targetUser.companyId) {
      throw new AppError(httpStatus.BAD_REQUEST, "Target employer does not have a company profile");
    }

    await prisma.subscription.upsert({
      where: { companyId: targetUser.companyId },
      update: {
        planId,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days duration
        cancelAtPeriodEnd: false,
      },
      create: {
        companyId: targetUser.companyId,
        planId,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
      },
    });
  } else if (targetUser.role === "JOB_SEEKER") {
    if (plan.planType !== PlanType.JOB_SEEKER) {
      throw new AppError(httpStatus.BAD_REQUEST, "Cannot assign an employer plan to a job seeker");
    }

    await prisma.userSubscription.upsert({
      where: { userId: targetUserId },
      update: {
        planId,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        cancelAtPeriodEnd: false,
      },
      create: {
        userId: targetUserId,
        planId,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
      },
    });
  } else {
    throw new AppError(httpStatus.BAD_REQUEST, "Cannot assign subscription to an administrator");
  }

  EntitlementService.invalidateCache(targetUserId);
};

export default {
  getMySubscription,
  cancelSubscription,
  adminAssignPlan,
};
