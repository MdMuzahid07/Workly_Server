import prisma from "../../../utils/prismaClient.js";

const logProfileView = async (
  viewedUserId: string,
  viewerId?: string,
  ip?: string,
  userAgent?: string,
) => {
  // Don't log if viewing own profile
  if (viewerId === viewedUserId) {
    return null;
  }

  // Optional: Rate limiting to avoid spam views from same IP/User in short time
  // For now, we'll log everything and handle aggregation in stats

  const result = await prisma.profileView.create({
    data: {
      viewedUserId,
      viewerId,
      ipAddress: ip,
      userAgent: userAgent,
    },
  });

  return result;
};

const getProfileViewStats = async (userId: string) => {
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  // Total views
  const totalViews = await prisma.profileView.count({
    where: { viewedUserId: userId },
  });

  // Views from last month (for comparison)
  const lastMonth = new Date();
  lastMonth.setMonth(now.getMonth() - 1);
  const viewsLastMonth = await prisma.profileView.count({
    where: {
      viewedUserId: userId,
      viewedAt: { gte: lastMonth },
    },
  });

  // Unique companies (viewers who are employers)
  const uniqueCompanies = await prisma.profileView.findMany({
    where: {
      viewedUserId: userId,
      viewer: {
        role: "EMPLOYER",
      },
    },
    distinct: ["viewerId"],
    select: {
      viewerId: true,
    },
  });

  // Chart data: Views per day for last 7 days
  const chartDataRaw = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('day', "viewedAt") as date,
      COUNT(*)::int as count
    FROM "profile_views"
    WHERE "viewedUserId" = ${userId}
      AND "viewedAt" >= ${sevenDaysAgo}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  return {
    totalViews,
    viewsLastMonth,
    uniqueCompaniesCount: uniqueCompanies.length,
    chartData: chartDataRaw,
  };
};

const getRecentVisitors = async (userId: string) => {
  const visitors = await prisma.profileView.findMany({
    where: { viewedUserId: userId },
    take: 10,
    orderBy: { viewedAt: "desc" },
    include: {
      viewer: {
        select: {
          id: true,
          fullName: true,
          role: true,
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              industry: true,
              location: true,
            },
          },
          profile: {
            select: {
              avatarUrl: true,
              location: true,
              headline: true,
            },
          },
        },
      },
    },
  });

  return visitors;
};

export const profileViewService = {
  logProfileView,
  getProfileViewStats,
  getRecentVisitors,
};
