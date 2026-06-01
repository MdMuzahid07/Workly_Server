import httpStatus from "http-status";
import type {
  Benefits,
  Company,
  Prisma,
  SocialLink,
  UserRole,
} from "../../../generated/prisma/index.js";
import factoryFunctions from "../../../utils/FactoryFunctionsWithFilterEngine.js";
import generateUniqueSlug from "../../../utils/generateUniqueSlug.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

//* ============ helper functions ============>

const parseArray = (value: any) => {
  if (!value) return undefined;
  return Array.isArray(value) ? value : value.split(",").map((v: string) => v.trim());
};

const parseBool = (value: any) => {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
};

const createCompany = async (
  userId: string,
  payload: Company & { socialLinks: SocialLink[]; benefits: Benefits[] },
) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const isUserExits = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      company: true,
    },
  });

  if (!isUserExits || !isUserExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found to create a company`);
  }

  if (isUserExits && !isUserExits?.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not verified`);
  }

  if (isUserExits?.companyId) {
    throw new AppError(httpStatus.BAD_REQUEST, `User already has a company`);
  }

  const [isCompanyWithSameName, isSlugExists] = await Promise.all([
    prisma.company.findUnique({
      where: {
        name: payload.name,
      },
    }),
    prisma.company.findUnique({
      where: {
        slug: payload.slug,
      },
    }),
  ]);

  if (isCompanyWithSameName) {
    throw new AppError(httpStatus.BAD_REQUEST, `Company with same name already exists`);
  }

  if (isSlugExists) {
    throw new AppError(httpStatus.BAD_REQUEST, `Company with same slug already exists`);
  }

  const { socialLinks, benefits: companyBenefits, isVerified, ...companyData } = payload;

  const slug = await generateUniqueSlug(companyData.name, "company");

  const result = await prisma.$transaction(async (transactor) => {
    const company = await transactor.company.create({
      data: {
        ...companyData,
        isVerified: true,
        slug,
      },
    });

    await transactor.user.update({
      where: {
        id: userId,
      },
      data: {
        companyId: company.id,
      },
    });

    if (socialLinks && socialLinks.length > 0) {
      await transactor.socialLink.createMany({
        data: socialLinks.map((link) => ({
          platform: link.platform,
          url: link.url,
          companyId: company.id,
        })),
      });
    }

    if (companyBenefits && companyBenefits.length > 0) {
      await transactor.benefits.createMany({
        data: companyBenefits.map((benefit: Benefits) => ({
          title: benefit.title,
          description: benefit.description,
          category: benefit.category,
          icon: benefit.icon,
          isActive: benefit.isActive ?? true,
          companyId: company.id,
        })),
      });
    }

    return company;
  });

  return result;
};

const getCompanyBySlug = async (slug: string) => {
  const result = await prisma.company.findUnique({
    where: {
      slug,
      isVerified: true,
      deletedAt: null,
    },
    include: {
      industry: true,
      socialLinks: true,
      benefits: true,
      employees: {
        where: { isActive: true, deletedAt: null },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          lastLogin: true,
        },
      },
      jobs: {
        where: {
          status: "ACTIVE",
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          employees: true,
          jobs: {
            where: {
              status: "ACTIVE",
              deletedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        },
      },
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Company not found");
  }

  return result;
};
const getCompanies = async (query: any) => {
  const {
    search,
    industry,
    location,
    size,
    isVerified,
    sortBy = "createdAt",
    sortOrder = "desc",
    page,
    limit,
  } = query;

  // build filter query ==========>
  const filterQuery: any = {
    sortBy,
    sortOrder,
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    where: {},
  };

  // text search ===============>
  if (search) {
    filterQuery.search = search.trim();
    filterQuery.searchIn = ["name", "description"];
  }

  const verified = parseBool(isVerified);
  if (verified !== undefined) filterQuery.where.isVerified = verified;

  const companyFilter = factoryFunctions.createCompanyFilter(prisma);
  const { where, orderBy, skip, take, pagination } = await companyFilter.filter(filterQuery);

  if (location && location.trim()) {
    where.location = {
      contains: location.trim(),
      mode: "insensitive",
    };
  }

  // Company size filter
  if (size && size.trim()) {
    const sizes = parseArray(size);
    if (sizes?.length) {
      where.size = { in: sizes };
    }
  }

  // Industry filter (relation with industry)
  if (industry && industry.trim()) {
    const industries = parseArray(industry);
    if (industries?.length) {
      where.industry = {
        name: { in: industries, mode: "insensitive" },
      };
    }
  }

  const result = await prisma.company.findMany({
    where,
    orderBy,
    skip,
    take,
    include: {
      socialLinks: true,
      benefits: true,
      industry: true,
    },
  });
  return { data: result, meta: pagination };
};

const deleteCompanyById = async (userId: string, companyId: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true, isVerified: true },
    include: { company: true },
  });

  if (!user || user.companyId !== companyId) {
    throw new AppError(httpStatus.FORBIDDEN, "Not authorized to delete this company");
  }

  return await prisma.$transaction(async (transactor) => {
    const company = await transactor.company.update({
      where: { id: companyId },
      data: { deletedAt: new Date() },
    });

    await transactor.job.updateMany({
      where: { companyId },
      data: {
        status: "CLOSED",
        deletedAt: new Date(),
      },
    });

    return company;
  });
};

const updateCompanyById = async (
  userId: string,
  companyId: string,
  payload: Partial<Company> & { socialLinks: SocialLink[]; benefits: Benefits[] },
) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true, isVerified: true },
    include: { company: true },
  });

  if (!user || user.companyId !== companyId) {
    throw new AppError(httpStatus.FORBIDDEN, "Not authorized to delete this company");
  }

  const { socialLinks, benefits, ...companyData } = payload;

  const result = await prisma.$transaction(async (transactor) => {
    const company = await transactor.company.update({
      where: { id: companyId, deletedAt: null },
      data: companyData,
    });

    if (payload.socialLinks !== undefined && payload.socialLinks.length > 0) {
      const currentLinkIds = payload.socialLinks
        .filter((link): link is SocialLink & { id: string } => !!link.id)
        .map((link: SocialLink) => link.id);

      await transactor.socialLink.deleteMany({
        where: {
          companyId: company.id,
          NOT: {
            id: {
              in: currentLinkIds,
            },
          },
        },
      });

      for (const link of payload.socialLinks) {
        if (link.id) {
          await transactor.socialLink.upsert({
            where: {
              id: link.id,
            },
            update: {
              platform: link.platform,
              url: link.url,
            },
            create: {
              platform: link.platform,
              url: link.url,
              companyId: company.id,
            },
          });
        } else {
          await transactor.socialLink.create({
            data: {
              platform: link.platform,
              url: link.url,
              companyId: company.id,
            },
          });
        }
      }
    }

    if (payload.benefits !== undefined && payload.benefits.length > 0) {
      const currentBenefitIds = payload.benefits
        .filter((benefit): benefit is Benefits & { id: string } => !!benefit.id)
        .map((benefit: Benefits) => benefit.id);

      await transactor.benefits.deleteMany({
        where: {
          companyId: company.id,
          NOT: {
            id: {
              in: currentBenefitIds,
            },
          },
        },
      });

      for (const benefit of payload.benefits) {
        if (benefit.id) {
          await transactor.benefits.upsert({
            where: {
              id: benefit.id,
            },
            update: {
              title: benefit.title,
              description: benefit.description,
              icon: benefit.icon,
              category: benefit.category,
            },
            create: {
              title: benefit.title,
              description: benefit.description,
              icon: benefit.icon,
              category: benefit.category,
              companyId: company.id,
            },
          });
        } else {
          await transactor.benefits.create({
            data: {
              title: benefit.title,
              description: benefit.description,
              icon: benefit.icon,
              category: benefit.category,
              companyId: company.id,
            },
          });
        }
      }
    }

    return company;
  });

  return result;
};

/** Adds an employer-role user to the company (Prisma relation: Company.employees). */
const addTeamMember = async (
  companyId: string,
  adminId: string,
  memberEmail: string,
  role: UserRole,
) => {
  const admin = await prisma.user.findUnique({
    where: { id: adminId, isActive: true },
    include: { company: true },
  });

  if (
    !admin ||
    admin.companyId !== companyId ||
    (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "Not authorized to add team members");
  }

  const member = await prisma.user.findUnique({
    where: { email: memberEmail, isActive: true },
  });

  if (!member) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (member.companyId) {
    throw new AppError(httpStatus.BAD_REQUEST, "User already belongs to a company");
  }

  return await prisma.user.update({
    where: { id: member.id },
    data: {
      companyId,
      role: role as UserRole,
    },
  });
};

const removeTeamMember = async (companyId: string, adminId: string, memberId: string) => {
  const admin = await prisma.user.findUnique({
    where: { id: adminId, isActive: true },
    include: { company: true },
  });

  if (
    !admin ||
    admin.companyId !== companyId ||
    (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "Not authorized to remove team members");
  }

  const member = await prisma.user.findUnique({
    where: { id: memberId, companyId, isActive: true },
  });

  if (!member) {
    throw new AppError(httpStatus.NOT_FOUND, "Team member not found");
  }

  return await prisma.user.update({
    where: { id: memberId },
    data: {
      companyId: null,
      role: "JOB_SEEKER",
    },
  });
};

// ============== company Statistics ================>

const checkPremiumStatus = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true },
  });

  if (!user?.isPremium) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "This is a premium feature. Please upgrade your plan to continue.",
    );
  }
};

const getCompanyOverviewStatistics = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
    include: { company: true },
  });

  if (!user || !user.companyId) {
    throw new AppError(httpStatus.NOT_FOUND, "Company not found for this user");
  }

  const companyId = user.companyId;

  // 1. Total & Active Jobs
  const jobsStats = await prisma.job.groupBy({
    by: ["status"],
    where: { companyId, deletedAt: null },
    _count: { id: true },
  });

  const totalJobs = jobsStats.reduce((acc, curr) => acc + curr._count.id, 0);
  const activeJobs = jobsStats.find((s) => s.status === "ACTIVE")?._count.id || 0;

  // 2. Total & Pending Applications
  const applicationsStats = await prisma.application.groupBy({
    by: ["status"],
    where: {
      job: { companyId, deletedAt: null },
    },
    _count: { id: true },
  });

  const totalApplications = applicationsStats.reduce((acc, curr) => acc + curr._count.id, 0);
  const pendingApplications =
    applicationsStats.find((s) => s.status === "SUBMITTED")?._count.id || 0;

  // 3. Employer users linked to this company (Prisma: Company.employees)
  const totalTeamMembers = await prisma.user.count({
    where: { companyId, isActive: true, deletedAt: null },
  });

  const now = new Date();
  const msDay = 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = new Date(now.getTime() - 30 * msDay);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * msDay);
  const sevenDaysAgo = new Date(now.getTime() - 7 * msDay);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * msDay);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * msDay);
  const oneEightyDaysAgo = new Date(now.getTime() - 180 * msDay);

  const [
    jobsCreatedLast30Days,
    jobsCreatedPrevious30Days,
    applicationsLast7Days,
    applicationsPrevious7Days,
    teamMembersJoinedLast90Days,
    teamMembersJoinedPrevious90Days,
    recentTeamMembers,
  ] = await Promise.all([
    prisma.job.count({
      where: { companyId, deletedAt: null, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.job.count({
      where: {
        companyId,
        deletedAt: null,
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),
    prisma.application.count({
      where: {
        deletedAt: null,
        job: { companyId, deletedAt: null },
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.application.count({
      where: {
        deletedAt: null,
        job: { companyId, deletedAt: null },
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
    }),
    prisma.user.count({
      where: {
        companyId,
        isActive: true,
        deletedAt: null,
        createdAt: { gte: ninetyDaysAgo },
      },
    }),
    prisma.user.count({
      where: {
        companyId,
        isActive: true,
        deletedAt: null,
        createdAt: { gte: oneEightyDaysAgo, lt: ninetyDaysAgo },
      },
    }),
    prisma.user.findMany({
      where: { companyId, isActive: true, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        fullName: true,
        role: true,
        createdAt: true,
        lastLogin: true,
      },
    }),
  ]);

  return {
    totalJobs,
    activeJobs,
    totalApplications,
    pendingApplications,
    totalTeamMembers,
    recentTeamMembers,
    trends: {
      jobsCreatedLast30Days,
      jobsCreatedPrevious30Days,
      applicationsLast7Days,
      applicationsPrevious7Days,
      teamMembersJoinedLast90Days,
      teamMembersJoinedPrevious90Days,
    },
  };
};

type AnalyticsPeriod = "7d" | "30d" | "90d" | "1y";

const MS_DAY = 24 * 60 * 60 * 1000;

const msForPeriod = (p: AnalyticsPeriod): number => {
  switch (p) {
    case "7d":
      return 7 * MS_DAY;
    case "30d":
      return 30 * MS_DAY;
    case "90d":
      return 90 * MS_DAY;
    case "1y":
      return 365 * MS_DAY;
    default:
      return 30 * MS_DAY;
  }
};

function pctChange(current: number, previous: number): number {
  if (previous <= 0) {
    return current <= 0 ? 0 : 100;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

const assertAnalyticsPeriod = (raw: string): AnalyticsPeriod =>
  ["7d", "30d", "90d", "1y"].includes(raw) ? (raw as AnalyticsPeriod) : "30d";

const dateTruncWhitelist = (unit: string): "day" | "week" | "month" =>
  unit === "day" || unit === "week" || unit === "month" ? unit : "month";

const countActiveJobsAtPoint = async (companyId: string, at: Date) => {
  return prisma.job.count({
    where: {
      companyId,
      deletedAt: null,
      status: "ACTIVE",
      createdAt: { lte: at },
      OR: [{ expiresAt: null }, { expiresAt: { gt: at } }],
    },
  });
};

const emptyEmployerAnalytics = (period: AnalyticsPeriod, hasCompany: boolean) => {
  const FUNNEL_COLORS = ["#f87171", "#fb923c", "#fbbf24", "#a3e635", "#4ade80", "#22c55e"];
  const funnelStages = [
    { name: "Applications", count: 0, percentage: 0, color: FUNNEL_COLORS[0]! },
    { name: "In review", count: 0, percentage: 0, color: FUNNEL_COLORS[1]! },
    { name: "Shortlisted", count: 0, percentage: 0, color: FUNNEL_COLORS[2]! },
    { name: "Interviewed", count: 0, percentage: 0, color: FUNNEL_COLORS[3]! },
    { name: "Offers", count: 0, percentage: 0, color: FUNNEL_COLORS[4]! },
    { name: "Hired", count: 0, percentage: 0, color: FUNNEL_COLORS[5]! },
  ];
  return {
    period,
    hasCompany,
    summary: {
      totalApplications: 0,
      totalApplicationsChangePct: 0,
      activeJobs: 0,
      activeJobsChangePct: 0,
      newCandidates: 0,
      newCandidatesChangePct: 0,
      hiredThisPeriod: 0,
      hiredThisPeriodChangePct: 0,
    },
    applicationTrends: [] as {
      periodLabel: string;
      applications: number;
      interviews: number;
      hired: number;
    }[],
    jobPerformance: [] as {
      title: string;
      views: number;
      applications: number;
      conversionRate: number;
      status: string;
    }[],
    departments: [] as {
      name: string;
      count: number;
      percentage: number;
      color: string;
    }[],
    funnelStages,
    conversionMetrics: [
      { label: "Application to interview", value: "0%" },
      { label: "Interview to offer", value: "0%" },
      { label: "Overall hire rate", value: "0%" },
    ],
  };
};

//* ========= Employer hiring analytics =========>
const getEmployerAnalytics = async (userId: string, rawPeriod: string) => {
  await checkPremiumStatus(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
  });

  if (!user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not found");
  }

  const period = assertAnalyticsPeriod(rawPeriod);

  if (!user.companyId) {
    return emptyEmployerAnalytics(period, false);
  }

  const companyId = user.companyId;
  const windowMs = msForPeriod(period);
  const now = new Date();
  const currentStart = new Date(now.getTime() - windowMs);
  const previousEnd = new Date(currentStart.getTime());
  const previousStart = new Date(previousEnd.getTime() - windowMs);

  const truncByPeriod = period === "7d" ? "day" : period === "30d" ? "week" : "month";

  const appWhereBetween = (rangeStart: Date, rangeEnd: Date): Prisma.ApplicationWhereInput => ({
    deletedAt: null,
    createdAt: { gte: rangeStart, lte: rangeEnd },
    job: { companyId, deletedAt: null },
  });

  const funnelBase: Prisma.ApplicationWhereInput = {
    deletedAt: null,
    createdAt: { gte: currentStart, lte: now },
    job: { companyId, deletedAt: null },
  };

  const unitSafe = dateTruncWhitelist(truncByPeriod);

  const [
    appsCurrentWindow,
    appsPrevWindow,
    distinctApplicantsCur,
    distinctApplicantsPrev,
    hiredCur,
    hiredPrev,
    activeJobsNow,
    activeJobsPrevPoint,
    applicationsForDiscipline,
    jobAppsInPeriod,
    appsRows,
    interviewRows,
    hiredRows,
    funnelApps,
    funnelReviewing,
    funnelShortlisted,
    funnelInterviewed,
    funnelOffered,
    funnelHired,
    interviewedAll,
    offeredAll,
  ] = await Promise.all([
    prisma.application.count({ where: appWhereBetween(currentStart, now) }),
    prisma.application.count({ where: appWhereBetween(previousStart, previousEnd) }),
    prisma.application
      .groupBy({
        by: ["applicantId"],
        where: appWhereBetween(currentStart, now),
        _count: { id: true },
      })
      .then((r) => r.length),
    prisma.application
      .groupBy({
        by: ["applicantId"],
        where: appWhereBetween(previousStart, previousEnd),
        _count: { id: true },
      })
      .then((r) => r.length),
    prisma.application.count({
      where: {
        deletedAt: null,
        status: "ACCEPTED",
        updatedAt: { gte: currentStart, lte: now },
        job: { companyId, deletedAt: null },
      },
    }),
    prisma.application.count({
      where: {
        deletedAt: null,
        status: "ACCEPTED",
        updatedAt: { gte: previousStart, lte: previousEnd },
        job: { companyId, deletedAt: null },
      },
    }),
    countActiveJobsAtPoint(companyId, now),
    countActiveJobsAtPoint(companyId, previousEnd),
    prisma.application.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: currentStart, lte: now },
        job: { companyId, deletedAt: null },
      },
      select: { job: { select: { discipline: true } } },
    }),
    prisma.application.groupBy({
      by: ["jobId"],
      where: {
        deletedAt: null,
        createdAt: { gte: currentStart, lte: now },
        job: { companyId, deletedAt: null },
      },
      _count: { id: true },
    }),
    prisma.$queryRawUnsafe<{ bucket: Date; ct: number }[]>(
      `SELECT DATE_TRUNC('${unitSafe}', a."createdAt") AS bucket, COUNT(*)::int AS ct
       FROM applications a
       INNER JOIN jobs j ON j.id = a."jobId"
       WHERE j."companyId" = $1::text
         AND a."deletedAt" IS NULL
         AND j."deletedAt" IS NULL
         AND a."createdAt" >= $2::timestamptz
       GROUP BY 1 ORDER BY 1 ASC`,
      companyId,
      currentStart,
    ),
    prisma.$queryRawUnsafe<{ bucket: Date; ct: number }[]>(
      `SELECT DATE_TRUNC('${unitSafe}', a."interviewScheduledAt") AS bucket, COUNT(*)::int AS ct
       FROM applications a
       INNER JOIN jobs j ON j.id = a."jobId"
       WHERE j."companyId" = $1::text
         AND a."deletedAt" IS NULL
         AND j."deletedAt" IS NULL
         AND a."interviewScheduledAt" IS NOT NULL
         AND a."interviewScheduledAt" >= $2::timestamptz
       GROUP BY 1 ORDER BY 1 ASC`,
      companyId,
      currentStart,
    ),
    prisma.$queryRawUnsafe<{ bucket: Date; ct: number }[]>(
      `SELECT DATE_TRUNC('${unitSafe}', a."updatedAt") AS bucket, COUNT(*)::int AS ct
       FROM applications a
       INNER JOIN jobs j ON j.id = a."jobId"
       WHERE j."companyId" = $1::text
         AND a."deletedAt" IS NULL
         AND j."deletedAt" IS NULL
         AND a."status" = 'ACCEPTED'::"ApplicationStatus"
         AND a."updatedAt" >= $2::timestamptz
       GROUP BY 1 ORDER BY 1 ASC`,
      companyId,
      currentStart,
    ),
    prisma.application.count({ where: funnelBase }),
    prisma.application.count({
      where: { ...funnelBase, status: "REVIEWING" },
    }),
    prisma.application.count({
      where: { ...funnelBase, status: "SHORTLISTED" },
    }),
    prisma.application.count({
      where: { ...funnelBase, status: "INTERVIEWED" },
    }),
    prisma.application.count({
      where: { ...funnelBase, status: "OFFERED" },
    }),
    prisma.application.count({
      where: { ...funnelBase, status: "ACCEPTED" },
    }),
    prisma.application.count({
      where: {
        ...funnelBase,
        status: { in: ["INTERVIEWED", "OFFERED", "ACCEPTED"] },
      },
    }),
    prisma.application.count({
      where: { ...funnelBase, status: { in: ["OFFERED", "ACCEPTED"] } },
    }),
  ]);

  const periodAppsByJobId = new Map(jobAppsInPeriod.map((x) => [x.jobId, x._count.id]));
  const rankedJobIds = [...jobAppsInPeriod]
    .sort((a, b) => b._count.id - a._count.id)
    .slice(0, 10)
    .map((x) => x.jobId);

  const jobRank = new Map(rankedJobIds.map((id, i) => [id, i]));
  const jobRows =
    rankedJobIds.length > 0
      ? (
          await prisma.job.findMany({
            where: { id: { in: rankedJobIds }, companyId, deletedAt: null },
            select: {
              id: true,
              title: true,
              viewCount: true,
              applyCount: true,
              status: true,
            },
          })
        ).sort((a, b) => (jobRank.get(a.id) ?? 0) - (jobRank.get(b.id) ?? 0))
      : await prisma.job.findMany({
          where: { companyId, deletedAt: null },
          orderBy: [{ applyCount: "desc" }, { viewCount: "desc" }],
          take: 10,
          select: {
            id: true,
            title: true,
            viewCount: true,
            applyCount: true,
            status: true,
          },
        });

  const PIE_COLORS = [
    "#22c55e",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
    "#64748b",
  ];

  const discMap = new Map<string, number>();
  for (const row of applicationsForDiscipline) {
    const name = row.job?.discipline?.trim() || "Other";
    discMap.set(name, (discMap.get(name) ?? 0) + 1);
  }
  const discEntries = [...discMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const discTotal = discEntries.reduce((s, [, c]) => s + c, 0) || 1;
  const departments = discEntries.map(([name, count], i) => ({
    name,
    count,
    percentage: Math.round((count / discTotal) * 1000) / 10,
    color: PIE_COLORS[i % PIE_COLORS.length]!,
  }));

  const jobPerformance = jobRows.map((j) => {
    const views = j.viewCount ?? 0;
    const periodApplications = periodAppsByJobId.get(j.id) ?? 0;
    const lifetimeApplications = j.applyCount ?? 0;
    const conversionRate = views > 0 ? Math.round((lifetimeApplications / views) * 1000) / 10 : 0;
    return {
      title: j.title,
      views,
      applications: periodApplications,
      conversionRate,
      status: j.status === "ACTIVE" ? "Active" : j.status,
    };
  });

  const bucketIso = (bucket: Date | string) => {
    const d = bucket instanceof Date ? bucket : new Date(bucket);
    return Number.isNaN(d.getTime()) ? String(bucket) : d.toISOString();
  };
  const appM = new Map(appsRows.map((r) => [bucketIso(r.bucket), Number(r.ct)]));
  const intM = new Map(interviewRows.map((r) => [bucketIso(r.bucket), Number(r.ct)]));
  const hireM = new Map(hiredRows.map((r) => [bucketIso(r.bucket), Number(r.ct)]));
  const allKeys = new Set([...appM.keys(), ...intM.keys(), ...hireM.keys()]);
  const sortedKeys = [...allKeys].sort((a, b) => a.localeCompare(b));

  const formatBucketLabel = (iso: string) => {
    const d = new Date(iso);
    if (unitSafe === "day") {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    if (unitSafe === "week") {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const applicationTrends = sortedKeys.map((k) => ({
    periodLabel: formatBucketLabel(k),
    applications: appM.get(k) ?? 0,
    interviews: intM.get(k) ?? 0,
    hired: hireM.get(k) ?? 0,
  }));

  const FUNNEL_COLORS = ["#f87171", "#fb923c", "#fbbf24", "#a3e635", "#4ade80", "#22c55e"];
  const funnelStages = [
    { name: "Applications", count: funnelApps, color: FUNNEL_COLORS[0]! },
    { name: "In review", count: funnelReviewing, color: FUNNEL_COLORS[1]! },
    { name: "Shortlisted", count: funnelShortlisted, color: FUNNEL_COLORS[2]! },
    { name: "Interviewed", count: funnelInterviewed, color: FUNNEL_COLORS[3]! },
    { name: "Offers", count: funnelOffered, color: FUNNEL_COLORS[4]! },
    { name: "Hired", count: funnelHired, color: FUNNEL_COLORS[5]! },
  ].map((s) => ({
    ...s,
    percentage: funnelApps > 0 ? Math.round((s.count / funnelApps) * 1000) / 10 : 0,
  }));

  const pct = (num: number, den: number) => (den <= 0 ? 0 : Math.round((num / den) * 1000) / 10);

  const conversionMetrics = [
    {
      label: "Application to interview",
      value: `${pct(interviewedAll, funnelApps)}%`,
    },
    {
      label: "Interview to offer",
      value: `${pct(offeredAll, interviewedAll)}%`,
    },
    { label: "Overall hire rate", value: `${pct(funnelHired, funnelApps)}%` },
  ];

  return {
    period,
    hasCompany: true,
    summary: {
      totalApplications: appsCurrentWindow,
      totalApplicationsChangePct: pctChange(appsCurrentWindow, appsPrevWindow),
      activeJobs: activeJobsNow,
      activeJobsChangePct: pctChange(activeJobsNow, activeJobsPrevPoint),
      newCandidates: distinctApplicantsCur,
      newCandidatesChangePct: pctChange(distinctApplicantsCur, distinctApplicantsPrev),
      hiredThisPeriod: hiredCur,
      hiredThisPeriodChangePct: pctChange(hiredCur, hiredPrev),
    },
    applicationTrends,
    jobPerformance,
    departments,
    funnelStages,
    conversionMetrics,
  };
};

const getMyCompany = async (userId: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
      isActive: true,
      isVerified: true,
    },
    include: {
      company: {
        include: {
          industry: true,
          socialLinks: true,
          benefits: true,
        },
      },
    },
  });

  if (!user || !user.companyId) {
    throw new AppError(httpStatus.NOT_FOUND, "Company not found for this user");
  }

  if (!user.company) {
    throw new AppError(httpStatus.NOT_FOUND, "Company not found");
  }

  // Include count for stats
  const companyWithCounts = await prisma.company.findUnique({
    where: {
      id: user.company.id,
    },
    include: {
      industry: true,
      socialLinks: true,
      benefits: true,
      companySettings: true,
      _count: {
        select: {
          employees: {
            where: { isActive: true, deletedAt: null },
          },
          jobs: {
            where: {
              status: "ACTIVE",
              deletedAt: null,
            },
          },
        },
      },
    },
  });

  return companyWithCounts;
};

//* ===== settings =========>
const getSettings = async (companyId: string) => {
  const settings = await prisma.companySettings.findUnique({
    where: { companyId },
  });
  if (!settings) {
    // Create default settings if none exist
    return prisma.companySettings.create({
      data: { companyId },
    });
  }
  return settings;
};

// Update company settings
const updateSettings = async (companyId: string, data: any) => {
  return prisma.companySettings.upsert({
    where: { companyId },
    update: {
      emailNotifications: data.emailNotifications,
      applicationAlerts: data.applicationAlerts,
      jobExpiryReminders: data.jobExpiryReminders,
      weeklyReports: data.weeklyReports,
      profileVisibility: data.profileVisibility,
      showEmployeeCount: data.showEmployeeCount,
      allowDirectMessages: data.allowDirectMessages,
    },
    create: {
      companyId,
      emailNotifications: data.emailNotifications ?? true,
      applicationAlerts: data.applicationAlerts ?? true,
      jobExpiryReminders: data.jobExpiryReminders ?? true,
      weeklyReports: data.weeklyReports ?? true,
      profileVisibility: data.profileVisibility ?? true,
      showEmployeeCount: data.showEmployeeCount ?? true,
      allowDirectMessages: data.allowDirectMessages ?? true,
    },
  });
};

const companyService = {
  createCompany,
  getCompanyBySlug,
  deleteCompanyById,
  updateCompanyById,
  addTeamMember,
  removeTeamMember,
  getCompanies,
  getCompanyOverviewStatistics,
  getEmployerAnalytics,
  getMyCompany,
  getSettings,
  updateSettings,
};
export default companyService;
