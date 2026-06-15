import { PlanType } from "../generated/prisma/index.js";

export interface PlanFeatureFlags {
  maxActiveJobs: number;
  maxUsers: number;
  maxMonthlyApplications: number;
  maxResumes: number;
  canMessage: boolean;
  canViewAnalytics: boolean;
  canViewProfileAnalytics: boolean;
  isFeaturedProfile: boolean;
  canMessageEmployer: boolean;
}

export type UsageLimitKey = "maxActiveJobs" | "maxUsers" | "maxMonthlyApplications" | "maxResumes";

export interface MySubscriptionResponse {
  planName: string;
  planType: PlanType;
  price: number;
  startDate: Date;
  endDate: Date | null;
  status: string;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  features: PlanFeatureFlags;
  usage: {
    jobsPosted: number;
    applicationsSubmitted: number;
    resumesUploaded: number;
  };
}

export interface CheckoutResponse {
  gatewayUrl: string;
}

export interface EntitlementErrorResponse {
  success: boolean;
  statusCode: number;
  message: string;
  error: {
    code: "LIMIT_EXCEEDED" | "FEATURE_LOCKED";
    feature: keyof PlanFeatureFlags;
    limit?: number;
    current?: number;
  };
}
