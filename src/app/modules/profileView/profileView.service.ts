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

/**
 * Resolves the start date for a given period string.
 * Returns null for "overall" (no date filter).
 */
const resolveStartDate = (period: string): Date | null => {
  const now = new Date();

  switch (period) {
    case "7days":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "14days":
      return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    case "lastMonth": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case "3months": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case "overall":
    default:
      return null; // No date filter = all time
  }
};

const getProfileViewStats = async (userId: string, period: string = "7days") => {
  const now = new Date();
  const startDate = resolveStartDate(period);

  // Determine grouping interval for chart
  let interval = "day";
  if (period === "3months") interval = "week";
  else if (period === "overall") interval = "month";

  // Views in selected period (for the chart card count)
  const periodViewsWhere: any = { viewedUserId: userId };
  if (startDate) {
    periodViewsWhere.viewedAt = { gte: startDate };
  }

  // Total all-time views
  const totalViews = await prisma.profileView.count({
    where: { viewedUserId: userId },
  });

  // Views in current selected period
  const periodViews = await prisma.profileView.count({
    where: periodViewsWhere,
  });

  // Views from the previous equivalent period (for % change comparison)
  let viewsLastMonth = 0;
  if (period !== "overall") {
    const prevPeriodEnd = startDate ? new Date(startDate) : new Date(now);
    const prevPeriodStart = new Date(prevPeriodEnd);

    // shift the same window back by the same amount
    if (period === "7days") {
      prevPeriodStart.setDate(prevPeriodStart.getDate() - 7);
    } else if (period === "14days") {
      prevPeriodStart.setDate(prevPeriodStart.getDate() - 14);
    } else if (period === "lastMonth") {
      prevPeriodStart.setMonth(prevPeriodStart.getMonth() - 1);
    } else if (period === "3months") {
      prevPeriodStart.setMonth(prevPeriodStart.getMonth() - 3);
    }

    viewsLastMonth = await prisma.profileView.count({
      where: {
        viewedUserId: userId,
        viewedAt: { gte: prevPeriodStart, lt: prevPeriodEnd },
      },
    });
  }

  // Unique companies (distinct employer viewers, all time)
  const uniqueCompanies = await prisma.profileView.findMany({
    where: {
      viewedUserId: userId,
      viewer: { role: "EMPLOYER" },
    },
    distinct: ["viewerId"],
    select: { viewerId: true },
  });

  // Chart data for selected period
  let chartDataRaw: any[] = [];
  if (startDate) {
    chartDataRaw = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC(${interval}, "viewedAt") as date,
        COUNT(*)::int as count
      FROM "profile_views"
      WHERE "viewedUserId" = ${userId}
        AND "viewedAt" >= ${startDate}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
  } else {
    // overall: all time
    chartDataRaw = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC(${interval}, "viewedAt") as date,
        COUNT(*)::int as count
      FROM "profile_views"
      WHERE "viewedUserId" = ${userId}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
  }

  return {
    totalViews,
    periodViews,
    viewsLastMonth,
    uniqueCompaniesCount: uniqueCompanies.length,
    chartData: chartDataRaw,
    period,
  };
};

const getRecentVisitors = async (userId: string, period: string = "overall") => {
  const startDate = resolveStartDate(period);

  const where: any = { viewedUserId: userId };
  if (startDate) {
    where.viewedAt = { gte: startDate };
  }

  const visitors = await prisma.profileView.findMany({
    where,
    take: 20,
    orderBy: { viewedAt: "desc" },
    include: {
      viewer: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
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
