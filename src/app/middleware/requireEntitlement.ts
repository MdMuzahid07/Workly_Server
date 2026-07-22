import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { EntitlementService } from '../../services/entitlement.service.js';
import { PlanFeatureFlags } from '../../types/subscription.types.js';

export const requireEntitlement = (feature: keyof PlanFeatureFlags) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as { userId: string; role: string } | undefined;
      if (!user) {
        return res.status(httpStatus.UNAUTHORIZED).json({
          success: false,
          statusCode: httpStatus.UNAUTHORIZED,
          message: 'User not authenticated',
        });
      }

      const entitlements = await EntitlementService.getUserEntitlements(user.userId);
      const isBooleanFeature = typeof entitlements[feature] === 'boolean';

      if (isBooleanFeature) {
        let hasAccess = entitlements[feature] as boolean;
        if (feature === 'canMessage' || feature === 'canMessageEmployer') {
          if (user.role === 'JOB_SEEKER') {
            hasAccess = entitlements.canMessageEmployer || entitlements.canMessage;
          } else {
            hasAccess = entitlements.canMessage;
          }
        } else if (feature === 'canViewProfileAnalytics') {
          hasAccess = entitlements.canViewProfileAnalytics || entitlements.canViewAnalytics;
        }

        if (!hasAccess) {
          return res.status(httpStatus.PAYMENT_REQUIRED).json({
            success: false,
            statusCode: httpStatus.PAYMENT_REQUIRED,
            message: `Your current plan does not include access to the '${feature}' feature. Please upgrade.`,
            error: {
              code: 'FEATURE_LOCKED',
              feature,
            },
          });
        }
      } else {
        // Numeric limit feature (e.g. maxActiveJobs, maxMonthlyApplications, maxResumes, maxUsers)
        const limit = entitlements[feature] as number;
        const usage = await EntitlementService.getCurrentUsage(user.userId);

        let currentUsage = 0;
        if (feature === 'maxActiveJobs') {
          currentUsage = usage.jobsPosted;
        } else if (feature === 'maxMonthlyApplications') {
          currentUsage = usage.applicationsSubmitted;
        } else if (feature === 'maxResumes') {
          currentUsage = usage.resumesUploaded;
        } else if (feature === 'maxUsers') {
          currentUsage = usage.teamMembers;
        }

        if (currentUsage >= limit) {
          return res.status(httpStatus.PAYMENT_REQUIRED).json({
            success: false,
            statusCode: httpStatus.PAYMENT_REQUIRED,
            message: `Limit exceeded for feature '${feature}'. Limit: ${limit}, Current: ${currentUsage}. Please upgrade.`,
            error: {
              code: 'LIMIT_EXCEEDED',
              feature,
              limit,
              current: currentUsage,
            },
          });
        }
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
