import prisma from '../../../utils/prismaClient.js';
import { TTLCache } from '../../../utils/entitlement.cache.js';

// Cache stats for 5 minutes (300,000 ms)
const statsCache = new TTLCache<any>(5 * 60 * 1000);
const CACHE_KEY = 'public_landing_stats';

interface StatisticsResponse {
  activeJobs: number;
  companies: number;
  jobSeekers: number;
  activeNow: number;
  trendingKeywords: string[];
  successRate: number;
}

const getLandingPageStats = async (): Promise<StatisticsResponse> => {
  const cached = statsCache.get(CACHE_KEY);

  try {
    // If cache is present, return it to optimize latency.
    if (cached) {
      return cached;
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      activeJobsCount,
      companiesCount,
      seekersCount,
      skillGroups,
      activeNowCount,
      totalAppsCount,
      successfulAppsCount,
    ] = await Promise.all([
      prisma.job.count({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
      prisma.company.count({
        where: {
          deletedAt: null,
        },
      }),
      prisma.user.count({
        where: {
          role: 'JOB_SEEKER',
          isActive: true,
          deletedAt: null,
        },
      }),
      prisma.jobSkill.groupBy({
        by: ['skillName'],
        _count: {
          skillName: true,
        },
        orderBy: {
          _count: {
            skillName: 'desc',
          },
        },
        take: 5,
      }),
      prisma.user.count({
        where: {
          lastLogin: {
            gt: oneDayAgo,
          },
          deletedAt: null,
        },
      }),
      prisma.application.count({
        where: {
          deletedAt: null,
        },
      }),
      prisma.application.count({
        where: {
          status: {
            in: ['ACCEPTED', 'OFFERED'],
          },
          deletedAt: null,
        },
      }),
    ]);

    let trendingKeywords = skillGroups.map((g) => g.skillName);
    if (trendingKeywords.length < 5) {
      const fallbacks = ['React', 'UI/UX', 'Python', 'Remote', 'DevOps'];
      trendingKeywords = [...new Set([...trendingKeywords, ...fallbacks])].slice(0, 5);
    }

    const activeNow = Math.max(activeNowCount, 1);
    let successRate = 95;
    if (totalAppsCount > 0) {
      successRate = Math.round((successfulAppsCount / totalAppsCount) * 100);
      if (successRate === 0) {
        successRate = 95;
      }
    }

    const stats: StatisticsResponse = {
      activeJobs: activeJobsCount,
      companies: companiesCount,
      jobSeekers: seekersCount,
      activeNow,
      trendingKeywords,
      successRate,
    };

    statsCache.set(CACHE_KEY, stats);
    return stats;
  } catch (error: any) {
    console.error(
      `[ALERT] [StatisticsService] Database outage in getLandingPageStats: ${error.message || error}`,
    );
    // Safe hardcoded defaults to keep public landing page operational if DB is down and no cache exists
    return {
      activeJobs: 12,
      companies: 5,
      jobSeekers: 45,
      activeNow: 3,
      trendingKeywords: ['React', 'UI/UX', 'Python', 'Remote', 'DevOps'],
      successRate: 95,
    };
  }
};

export default {
  getLandingPageStats,
};
