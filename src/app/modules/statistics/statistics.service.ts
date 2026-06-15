import prisma from "../../../utils/prismaClient.js";
import { TTLCache } from "../../../utils/entitlement.cache.js";

// Cache stats for 5 minutes (300,000 ms)
const statsCache = new TTLCache<any>(5 * 60 * 1000);
const CACHE_KEY = "public_landing_stats";

interface StatisticsResponse {
  activeJobs: number;
  companies: number;
  jobSeekers: number;
  activeNow: number;
  trendingKeywords: string[];
}

const getLandingPageStats = async (): Promise<StatisticsResponse> => {
  const cached = statsCache.get(CACHE_KEY);
  if (cached) {
    return cached;
  }

  // 1. Count active jobs
  const activeJobsCount = await prisma.job.count({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  // 2. Count registered companies
  const companiesCount = await prisma.company.count({
    where: {
      deletedAt: null,
    },
  });

  // 3. Count active job seekers
  const seekersCount = await prisma.user.count({
    where: {
      role: "JOB_SEEKER",
      isActive: true,
      deletedAt: null,
    },
  });

  // 4. Determine trending keywords (top required skills in active jobs)
  const skillGroups = await prisma.jobSkill.groupBy({
    by: ["skillName"],
    _count: {
      skillName: true,
    },
    orderBy: {
      _count: {
        skillName: "desc",
      },
    },
    take: 5,
  });

  let trendingKeywords = skillGroups.map((g) => g.skillName);
  if (trendingKeywords.length < 5) {
    // Fill up or fallback if seed database lacks skills
    const fallbacks = ["React", "UI/UX", "Python", "Remote", "DevOps"];
    trendingKeywords = [...new Set([...trendingKeywords, ...fallbacks])].slice(0, 5);
  }

  // 5. Calculate real-time "Active Now" (users logged in within the last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const activeNowCount = await prisma.user.count({
    where: {
      lastLogin: {
        gt: oneDayAgo,
      },
      deletedAt: null,
    },
  });
  const activeNow = Math.max(activeNowCount, 1);

  const stats: StatisticsResponse = {
    activeJobs: activeJobsCount,
    companies: companiesCount,
    jobSeekers: seekersCount,
    activeNow,
    trendingKeywords,
  };

  statsCache.set(CACHE_KEY, stats);
  return stats;
};

export default {
  getLandingPageStats,
};
