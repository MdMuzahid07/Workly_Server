import prisma from "../../../utils/prismaClient.js";

// Standard plans data matching frontend constants/pricing.ts
const SEED_PLANS = [
  {
    name: "emp_free",
    description: "Get started with professional local recruiting at zero cost.",
    price: 0.0,
    currency: "BDT",
    interval: "month",
    features: [
      "1 Active Job Listing",
      "Basic Recruiting Tools",
      "Standard Resume Search",
      "Email Support",
    ],
    maxActiveJobs: 1,
    maxUsers: 1,
    isActive: true,
  },
  {
    name: "emp_starter",
    description: "Best for growing teams and focused local recruiting campaigns.",
    price: 4999.0,
    currency: "BDT",
    interval: "month",
    features: [
      "5 Active Job Listings",
      "Priority Support",
      "Instant Candidate Alerts",
      "Advanced Applicant Filters",
    ],
    maxActiveJobs: 5,
    maxUsers: 2,
    isActive: true,
  },
  {
    name: "emp_pro",
    description: "The ultimate recruiting solution with high discount rates.",
    price: 14999.0,
    currency: "BDT",
    interval: "month",
    features: [
      "15 Active Job Listings",
      "Featured Postings Badge",
      "Full HR Pipeline Tool",
      "1-on-1 Recruiting Counsel",
    ],
    maxActiveJobs: 15,
    maxUsers: 5,
    isActive: true,
  },
  {
    name: "cand_free",
    description: "Standard job search and profile builder for everyday candidates.",
    price: 0.0,
    currency: "BDT",
    interval: "month",
    features: [
      "Up to 40 Job Applications/mo",
      "Single Resume Upload",
      "Standard Profile Search",
      "In-App Notifications",
    ],
    maxActiveJobs: 40,
    maxUsers: 1,
    isActive: true,
  },
  {
    name: "cand_pro",
    description:
      "Perfect for active job seekers looking for profile boosts and direct HR connections.",
    price: 199.0,
    currency: "BDT",
    interval: "month",
    features: [
      "Up to 120 Job Applications/mo",
      "Multiple Resumes Uploads",
      "Priority Profile Boost",
      "Direct Messaging to HRs",
      "Who Viewed My Profile Tracker",
    ],
    maxActiveJobs: 120,
    maxUsers: 5,
    isActive: true,
  },
  {
    name: "cand_elite",
    description:
      "Complete career acceleration package including mock interviews and direct counseling.",
    price: 499.0,
    currency: "BDT",
    interval: "month",
    features: [
      "Unlimited Job Applications",
      "Unlimited Resume Uploads",
      "5x Profile Featured Boost",
      "1-on-1 Monthly Counseling",
      "1 Mock Interview prep/mo",
    ],
    maxActiveJobs: 9999,
    maxUsers: 9999,
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
          description: plan.description,
          price: plan.price,
          currency: plan.currency,
          interval: plan.interval,
          features: plan.features,
          maxActiveJobs: plan.maxActiveJobs,
          maxUsers: plan.maxUsers,
          isActive: plan.isActive,
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

  // Filter plans by name prefixes
  if (query.type === "employer") {
    where.name = { startsWith: "emp_" };
  } else if (query.type === "candidate") {
    where.name = { startsWith: "cand_" };
  }

  const plans = await prisma.plan.findMany({
    where,
    orderBy: { price: "asc" },
  });

  return plans;
};

const createPlan = async (data: any) => {
  const features = Array.isArray(data.features) ? data.features : JSON.parse(data.features || "[]");
  const plan = await prisma.plan.create({
    data: {
      name: data.name,
      description: data.description,
      price: Number(data.price),
      currency: data.currency || "BDT",
      interval: data.interval || "month",
      features: features,
      maxActiveJobs: data.maxActiveJobs ? Number(data.maxActiveJobs) : null,
      maxUsers: data.maxUsers ? Number(data.maxUsers) : null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });
  return plan;
};

const updatePlan = async (id: string, data: any) => {
  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
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
    updateData.features = Array.isArray(data.features)
      ? data.features
      : JSON.parse(data.features || "[]");
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
