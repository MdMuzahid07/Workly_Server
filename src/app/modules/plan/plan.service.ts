import prisma from "../../../utils/prismaClient.js";
import { PlanType } from "../../../generated/prisma/index.js";

// ─── Default plan definitions ────────────────────────────────────────────────
// These values are authoritative. Running syncDefaultPlans() will upsert them
// into the database, so any price or feature change here is reflected
// automatically on the next server start.
// ─────────────────────────────────────────────────────────────────────────────
const SEED_PLANS = [
  // ── Employer plans ──────────────────────────────────────────────────────────
  {
    name: "Free",
    planType: PlanType.EMPLOYER,
    description: "Standard local recruiting package at zero cost.",
    price: 0.0,
    currency: "BDT",
    interval: "month",
    features: {
      maxActiveJobs: 1,
      maxUsers: 1,
      maxMonthlyApplications: 0,
      maxResumes: 0,
      canMessage: false,
      canViewAnalytics: false,
      canViewProfileAnalytics: false,
      isFeaturedProfile: false,
      canMessageEmployer: false,
      durationMonths: 0,
      displayFeatures: ["1 active job listing", "1 user account", "Standard applicant tracking"],
    },
    maxActiveJobs: 1,
    maxUsers: 1,
    isActive: true,
  },
  {
    name: "Growth",
    planType: PlanType.EMPLOYER,
    description: "Best for growing teams and active recruitment campaigns.",
    price: 7999.0,
    currency: "BDT",
    interval: "month",
    features: {
      maxActiveJobs: 10,
      maxUsers: 4,
      maxMonthlyApplications: 0,
      maxResumes: 0,
      canMessage: true,
      canViewAnalytics: true,
      canViewProfileAnalytics: false,
      isFeaturedProfile: false,
      canMessageEmployer: false,
      durationMonths: 1,
      displayFeatures: [
        "10 active job listings",
        "4 user accounts",
        "Direct candidate messaging",
        "Basic analytics dashboard",
      ],
    },
    maxActiveJobs: 10,
    maxUsers: 4,
    isActive: true,
  },
  {
    name: "Enterprise",
    planType: PlanType.EMPLOYER,
    description: "Unlimited options and custom solutions for large corporate teams.",
    price: 24999.0,
    currency: "BDT",
    interval: "month",
    features: {
      maxActiveJobs: 9999,
      maxUsers: 9999,
      maxMonthlyApplications: 0,
      maxResumes: 0,
      canMessage: true,
      canViewAnalytics: true,
      canViewProfileAnalytics: false,
      isFeaturedProfile: false,
      canMessageEmployer: false,
      durationMonths: 1,
      displayFeatures: [
        "Unlimited active jobs",
        "Unlimited user accounts",
        "Direct candidate messaging",
        "Advanced analytics dashboard",
        "Priority customer support",
      ],
    },
    maxActiveJobs: 9999,
    maxUsers: 9999,
    isActive: true,
  },

  // ── Job Seeker plans ────────────────────────────────────────────────────────
  {
    name: "Free",
    planType: PlanType.JOB_SEEKER,
    description: "Start your job search with essential tools at no cost.",
    price: 0.0,
    currency: "BDT",
    interval: "month",
    features: {
      maxActiveJobs: 0,
      maxUsers: 0,
      maxMonthlyApplications: 40,
      maxResumes: 1,
      canMessage: false,
      canViewAnalytics: false,
      canViewProfileAnalytics: false,
      isFeaturedProfile: false,
      canMessageEmployer: false,
      durationMonths: 0,
      displayFeatures: [
        "40 job applications per month",
        "1 active CV upload",
        "Standard algorithmic ranking",
        "7-day view history",
        "Standard in-app alerts",
        "Basic application status",
      ],
    },
    maxActiveJobs: 0,
    maxUsers: 0,
    isActive: true,
  },
  {
    name: "Starter",
    planType: PlanType.JOB_SEEKER,
    description: "1-month premium access. Great entry point for active job seekers.",
    price: 90.0,
    currency: "BDT",
    interval: "month",
    features: {
      maxActiveJobs: 0,
      maxUsers: 0,
      maxMonthlyApplications: 200,
      maxResumes: 5,
      canMessage: false,
      canViewAnalytics: false,
      canViewProfileAnalytics: true,
      isFeaturedProfile: false,
      canMessageEmployer: true,
      durationMonths: 1,
      firstTimeDiscountPercent: 45,
      displayFeatures: [
        "200 job applications per month",
        "5 active CV uploads",
        "Direct messaging to HR",
        "30-day view history",
        "Priority real-time alerts",
        "Detailed stage tracking",
      ],
    },
    maxActiveJobs: 0,
    maxUsers: 0,
    isActive: true,
  },
  {
    name: "Pro",
    planType: PlanType.JOB_SEEKER,
    description: "2-month premium access. Better value for sustained job searching.",
    price: 160.0,
    currency: "BDT",
    interval: "month",
    features: {
      maxActiveJobs: 0,
      maxUsers: 0,
      maxMonthlyApplications: 300,
      maxResumes: 10,
      canMessage: false,
      canViewAnalytics: false,
      canViewProfileAnalytics: true,
      isFeaturedProfile: false,
      canMessageEmployer: true,
      durationMonths: 2,
      firstTimeDiscountPercent: 35,
      displayFeatures: [
        "300 job applications per month",
        "10 active CV uploads",
        "Direct messaging to HR",
        "30-day view history",
        "Priority real-time alerts",
        "Detailed stage tracking",
        "Advanced search optimization",
      ],
    },
    maxActiveJobs: 0,
    maxUsers: 0,
    isActive: true,
  },
  {
    name: "Premium",
    planType: PlanType.JOB_SEEKER,
    description: "3-month premium access. Maximum visibility with Featured Candidate status.",
    price: 225.0,
    currency: "BDT",
    interval: "month",
    features: {
      maxActiveJobs: 0,
      maxUsers: 0,
      maxMonthlyApplications: 9999,
      maxResumes: 9999,
      canMessage: false,
      canViewAnalytics: false,
      canViewProfileAnalytics: true,
      isFeaturedProfile: true,
      canMessageEmployer: true,
      durationMonths: 3,
      firstTimeDiscountPercent: 25,
      displayFeatures: [
        "Unlimited job applications",
        "Unlimited CV uploads",
        "Direct messaging to HR",
        "Full view history (90 days)",
        "Priority real-time alerts",
        "Detailed stage tracking",
        "Featured candidate profile",
      ],
    },
    maxActiveJobs: 0,
    maxUsers: 0,
    isActive: true,
  },
];

// Track whether we've synced in this server process to avoid repeating on every request
let plansInitialized = false;

/**
 * Upserts all default plans into the database.
 * Runs once per server process; safe to call on every getPlans invocation.
 * Existing plans are updated (price, features, description) and new ones are created.
 */
const syncDefaultPlans = async () => {
  if (plansInitialized) return;

  let syncCount = 0;
  for (const plan of SEED_PLANS) {
    await prisma.plan.upsert({
      where: {
        name_planType: {
          name: plan.name,
          planType: plan.planType,
        },
      },
      update: {
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        features: plan.features as any,
        maxActiveJobs: plan.maxActiveJobs,
        maxUsers: plan.maxUsers,
        isActive: plan.isActive,
      },
      create: {
        name: plan.name,
        planType: plan.planType,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        features: plan.features as any,
        maxActiveJobs: plan.maxActiveJobs,
        maxUsers: plan.maxUsers,
        isActive: plan.isActive,
        isCustom: false,
      },
    });
    syncCount++;
  }

  plansInitialized = true;
  console.log(`[Plans] Synced ${syncCount} default subscription plans.`);
};

// Keep backward compat export
const seedPlans = syncDefaultPlans;

const getPlans = async (query: any) => {
  await syncDefaultPlans();
  const where: any = {};

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === "true";
  }

  if (query.type === "employer") {
    where.planType = PlanType.EMPLOYER;
  } else if (query.type === "candidate" || query.type === "seeker" || query.type === "job_seeker") {
    where.planType = PlanType.JOB_SEEKER;
  }

  const plans = await prisma.plan.findMany({
    where,
    include: {
      subscriptions: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
      userSubscriptions: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
    },
    orderBy: { price: "asc" },
  });

  return plans.map((p) => {
    const activeSubCount = p.subscriptions.length + p.userSubscriptions.length;
    const { subscriptions, userSubscriptions, ...rest } = p;
    return {
      ...rest,
      subscriberCount: activeSubCount,
    };
  });
};

const createPlan = async (data: any) => {
  let features = data.features;
  if (typeof features === "string") {
    features = JSON.parse(features);
  }

  const plan = await prisma.plan.create({
    data: {
      name: data.name,
      planType: data.planType || PlanType.JOB_SEEKER,
      description: data.description,
      price: Number(data.price),
      currency: data.currency || "BDT",
      interval: data.interval || "month",
      features: features,
      maxActiveJobs: data.maxActiveJobs ? Number(data.maxActiveJobs) : null,
      maxUsers: data.maxUsers ? Number(data.maxUsers) : null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      isCustom: data.isCustom !== undefined ? data.isCustom : false,
      createdByAdminId: data.createdByAdminId || null,
    },
  });
  return plan;
};

const updatePlan = async (id: string, data: any) => {
  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) throw new Error("Plan not found");

  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.planType !== undefined) updateData.planType = data.planType;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price !== undefined) updateData.price = Number(data.price);
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.interval !== undefined) updateData.interval = data.interval;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.maxActiveJobs !== undefined)
    updateData.maxActiveJobs = data.maxActiveJobs ? Number(data.maxActiveJobs) : null;
  if (data.maxUsers !== undefined)
    updateData.maxUsers = data.maxUsers ? Number(data.maxUsers) : null;

  // Smart merge features JSON object to preserve tech/interval counters
  let mergedFeatures: any =
    typeof existing.features === "object" && existing.features !== null
      ? { ...existing.features }
      : {};

  if (data.features !== undefined) {
    const incoming = typeof data.features === "string" ? JSON.parse(data.features) : data.features;
    if (Array.isArray(incoming)) {
      // String lists from UI are mapped to displayFeatures
      mergedFeatures.displayFeatures = incoming;
    } else if (typeof incoming === "object" && incoming !== null) {
      mergedFeatures = {
        ...mergedFeatures,
        ...incoming,
      };
    }
  }

  if (data.firstTimeDiscountPercent !== undefined) {
    mergedFeatures.firstTimeDiscountPercent = Number(data.firstTimeDiscountPercent);
  }

  updateData.features = mergedFeatures;

  const plan = await prisma.plan.update({
    where: { id },
    data: updateData,
  });
  return plan;
};

const togglePlanStatus = async (id: string) => {
  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) throw new Error("Plan not found");

  const plan = await prisma.plan.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
  return plan;
};

const deletePlan = async (id: string) => {
  await prisma.plan.delete({ where: { id } });
  return true;
};

export default {
  getPlans,
  createPlan,
  updatePlan,
  togglePlanStatus,
  deletePlan,
  seedPlans,
};
