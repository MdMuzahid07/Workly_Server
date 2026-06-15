import prisma from "../../../utils/prismaClient.js";
import { PlanType } from "../../../generated/prisma/index.js";

// Standard plans data matching frontend constants/pricing.ts
const SEED_PLANS = [
  // Employer plans
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
    },
    maxActiveJobs: 9999,
    maxUsers: 9999,
    isActive: true,
  },
  // Job Seeker plans
  {
    name: "Free",
    planType: PlanType.JOB_SEEKER,
    description: "Basic job search and profile builder for seekers.",
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
    },
    maxActiveJobs: 0,
    maxUsers: 0,
    isActive: true,
  },
  {
    name: "Pro",
    planType: PlanType.JOB_SEEKER,
    description: "Accelerate your career search with higher limits and messaging.",
    price: 399.0,
    currency: "BDT",
    interval: "month",
    features: {
      maxActiveJobs: 0,
      maxUsers: 0,
      maxMonthlyApplications: 120,
      maxResumes: 5,
      canMessage: false,
      canViewAnalytics: false,
      canViewProfileAnalytics: true,
      isFeaturedProfile: false,
      canMessageEmployer: true,
    },
    maxActiveJobs: 0,
    maxUsers: 0,
    isActive: true,
  },
  {
    name: "Premium",
    planType: PlanType.JOB_SEEKER,
    description: "The ultimate package with maximum visibility and unlimited features.",
    price: 999.0,
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
    },
    maxActiveJobs: 0,
    maxUsers: 0,
    isActive: true,
  },
];

const seedPlans = async () => {
  const count = await prisma.plan.count();
  if (count === 0) {
    console.log("Seeding default subscription plans into the database...");
    for (const plan of SEED_PLANS) {
      await prisma.plan.create({
        data: {
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
    }
    console.log("Successfully seeded 6 default subscription plans.");
  }
};

const getPlans = async (query: any) => {
  await seedPlans(); // Ensure dynamic database plans are seeded on first load
  const where: any = {};

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === "true";
  }

  // Filter plans by proper PlanType
  if (query.type === "employer") {
    where.planType = PlanType.EMPLOYER;
  } else if (query.type === "candidate" || query.type === "seeker" || query.type === "job_seeker") {
    where.planType = PlanType.JOB_SEEKER;
  }

  const plans = await prisma.plan.findMany({
    where,
    orderBy: { price: "asc" },
  });

  return plans;
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
  if (data.features !== undefined) {
    updateData.features =
      typeof data.features === "string" ? JSON.parse(data.features) : data.features;
  }

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
