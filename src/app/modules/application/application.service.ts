import httpStatus from "http-status";
import { type Job } from "../../../generated/prisma/index.js";
import factoryFunctions from "../../../utils/FactoryFunctionsWithFilterEngine.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const APPLICATION_STATUSES = [
  "SUBMITTED",
  "REVIEWING",
  "SHORTLISTED",
  "INTERVIEWED",
  "REJECTED",
  "OFFERED",
  "ACCEPTED",
  "WITHDRAWN",
] as const;

const getApplicationDateRange = (dateFilter?: string) => {
  const now = new Date();
  const start = new Date(now);

  switch (dateFilter) {
    case "today":
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    case "last_7_days":
      start.setDate(now.getDate() - 7);
      return { start, end: now };
    case "this_month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    default:
      return undefined;
  }
};

const getApplicationClosedReason = (
  job: Pick<Job, "status" | "deletedAt" | "applicationDeadline" | "expiresAt"> | null,
) => {
  const now = new Date();

  if (!job || job.deletedAt) return "Job not found";
  if (job.status !== "ACTIVE") return "This job is not accepting applications";
  if (job.applicationDeadline && job.applicationDeadline <= now) {
    return "The application deadline has passed";
  }
  if (job.expiresAt && job.expiresAt <= now) {
    return "This job posting has expired";
  }

  return null;
};

const createApplication = async (userId: string, payload: any) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
  });

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, "User not found or inactive");
  }

  const job = await prisma.job.findUnique({
    where: {
      id: payload.jobId,
    },
  });

  const closedReason = getApplicationClosedReason(job);
  if (closedReason) {
    throw new AppError(
      closedReason === "Job not found" ? httpStatus.NOT_FOUND : httpStatus.BAD_REQUEST,
      closedReason,
    );
  }

  const existingApplication = await prisma.application.findUnique({
    where: {
      jobId_applicantId: {
        jobId: payload.jobId,
        applicantId: userId,
      },
    },
  });

  if (existingApplication) {
    throw new AppError(httpStatus.CONFLICT, "You have already applied for this job");
  }

  if (job?.maxApplications) {
    const applicationCount = await prisma.application.count({
      where: {
        jobId: payload.jobId,
        deletedAt: null,
        status: {
          not: "WITHDRAWN",
        },
      },
    });

    if (applicationCount >= job.maxApplications) {
      throw new AppError(httpStatus.BAD_REQUEST, "This job has reached maximum applications");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const application = await tx.application.create({
      data: {
        jobId: payload.jobId,
        applicantId: userId,
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        resumeUrl: payload.resumeFile,
        currentLocation: payload.location,
        yearsOfExperience: payload.experience ? Number(payload.experience) : 0,
        agreedTerms: payload.agreeTerms ?? true,
        coverLetter: payload.coverLetter,
        preferredContactMethod: (payload.preferredContactMethod?.toUpperCase() as any) || "EMAIL",
        folderName: payload.folderName,
      },
      include: {
        job: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
          },
        },
        applicant: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            profile: {
              select: {
                skills: true,
                preference: true,
              },
            },
          },
        },
      },
    });

    await tx.job.update({
      where: { id: payload.jobId },
      data: {
        applyCount: {
          increment: 1,
        },
      },
    });

    return application;
  });

  return result;
};

const getMyApplications = async (userId: string, query: any) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const applicationFilter = factoryFunctions.createApplicationFilter(prisma);
  const filterOptions: any = {
    where: { applicantId: userId },
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 10,
    sortBy: query.sortBy || "createdAt",
    sortOrder: (query.sortOrder as "asc" | "desc") || "desc",
  };

  if (query.status) {
    filterOptions.where.status = query.status;
  }

  const dateRange = getApplicationDateRange(query.dateFilter);
  if (dateRange) {
    filterOptions.dateRange = {
      createdAt: dateRange,
    };
  }

  const searchTerm = typeof query.q === "string" ? query.q.trim() : "";
  if (searchTerm) {
    filterOptions.customWhere = {
      OR: [
        {
          job: {
            title: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          job: {
            company: {
              name: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    };
  }

  const { where, orderBy, skip, take, pagination } = await applicationFilter.filter(filterOptions);

  const data = await prisma.application.findMany({
    where,
    orderBy,
    skip,
    take,
    include: {
      job: {
        select: {
          id: true,
          title: true,
          slug: true,
          location: true,
          isRemote: true,
          salaryMin: true,
          salaryMax: true,
          currency: true,
          jobType: true,
          requirements: true,
          JobSkill: { select: { id: true, skillName: true } },
          company: { select: { id: true, name: true, slug: true, logoUrl: true } },
        },
      },
      applicant: { select: { id: true, fullName: true, email: true } },
    },
  });

  return { data, meta: pagination };
};

const getMyApplicationSummary = async (userId: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const groupedStatusCounts = await prisma.application.groupBy({
    by: ["status"],
    where: {
      applicantId: userId,
      deletedAt: null,
    },
    _count: {
      status: true,
    },
  });

  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0])) as Record<
    (typeof APPLICATION_STATUSES)[number],
    number
  >;

  groupedStatusCounts.forEach((item) => {
    byStatus[item.status] = item._count.status;
  });

  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

  return {
    total,
    inReview: byStatus.SUBMITTED + byStatus.REVIEWING + byStatus.SHORTLISTED,
    interviewing: byStatus.INTERVIEWED,
    offer: byStatus.OFFERED,
    accepted: byStatus.ACCEPTED,
    rejected: byStatus.REJECTED,
    withdrawn: byStatus.WITHDRAWN,
    byStatus,
  };
};

//* ========== Helper functions to check if a user is an employer of a job ==========>
const assertEmployerOwnsJob = async (employerId: string, jobId: string) => {
  const employer = await prisma.user.findUnique({
    where: { id: employerId, isActive: true },
    select: { companyId: true, role: true },
  });
  if (!employer || !employer.companyId) {
    throw new AppError(httpStatus.FORBIDDEN, "Not authorized");
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { companyId: true },
  });
  if (!job || job.companyId !== employer.companyId) {
    throw new AppError(httpStatus.FORBIDDEN, "Not authorized to access this job");
  }
};

const getEmployerCompanyId = async (employerId: string) => {
  const employer = await prisma.user.findUnique({
    where: { id: employerId, isActive: true },
    select: { companyId: true },
  });

  if (!employer || !employer.companyId) {
    throw new AppError(httpStatus.FORBIDDEN, "Not authorized or no company associated");
  }

  return employer.companyId;
};

const getPaginationOptions = (query: any) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const getApplicationSortOptions = (query: any) => {
  const allowedSortFields = new Set(["createdAt", "updatedAt", "statusChangedAt"]);
  const sortBy =
    typeof query.sortBy === "string" && allowedSortFields.has(query.sortBy)
      ? query.sortBy
      : "createdAt";
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  return { sortBy, sortOrder };
};

const buildApplicationSearchWhere = (searchTerm: string) => {
  const contains = {
    contains: searchTerm,
    mode: "insensitive" as const,
  };

  return [
    { fullName: contains },
    { email: contains },
    { phone: contains },
    { applicant: { fullName: contains } },
    { applicant: { email: contains } },
    { applicant: { phone: contains } },
    { job: { title: contains } },
  ];
};

const getJobApplications = async (employerId: string, jobId: string, query: any) => {
  if (!employerId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  await assertEmployerOwnsJob(employerId, jobId);

  const { page, limit, skip } = getPaginationOptions(query);
  const { sortBy, sortOrder } = getApplicationSortOptions(query);
  const where: any = { jobId, deletedAt: null };

  if (query.status) {
    where.status = query.status;
  }

  const searchTerm = typeof query.q === "string" ? query.q.trim() : "";
  if (searchTerm) {
    where.OR = buildApplicationSearchWhere(searchTerm);
  }

  const [total, data] = await prisma.$transaction([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            isRemote: true,
          },
        },
        applicant: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            profile: {
              select: {
                avatarUrl: true,
                headline: true,
                location: true,
                skills: true,
                preference: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 0,
    },
  };
};

const getApplicationById = async (requesterId: string, applicationId: string) => {
  if (!requesterId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: { select: { id: true, title: true, companyId: true, company: true } },
      applicant: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  });
  if (!app) {
    throw new AppError(httpStatus.NOT_FOUND, "Application not found");
  }

  // Allow if requester is applicant
  if (app.applicantId === requesterId) return app;

  // Or if requester is employer of the job's company
  await assertEmployerOwnsJob(requesterId, app.jobId);
  return app;
};

const updateStatus = async (
  employerId: string,
  applicationId: string,
  status: string,
  rejectionReason?: string,
) => {
  if (!employerId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }
  const current = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!current) {
    throw new AppError(httpStatus.NOT_FOUND, "Application not found");
  }
  await assertEmployerOwnsJob(employerId, current.jobId);

  const allowedStatuses = [
    "REVIEWING",
    "SHORTLISTED",
    "INTERVIEWED",
    "REJECTED",
    "OFFERED",
    "ACCEPTED",
  ];
  if (!allowedStatuses.includes(status)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid status transition");
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: status as any,
      statusChangedBy: employerId,
      statusChangedAt: new Date(),
      rejectionReason: status === "REJECTED" ? (rejectionReason ?? null) : null,
    },
  });
  return updated;
};

const withdraw = async (userId: string, applicationId: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app || app.applicantId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "Not authorized to withdraw this application");
  }
  if (app.status === "WITHDRAWN") {
    return app;
  }
  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { status: "WITHDRAWN" as any, withdrawnAt: new Date() },
  });
  return updated;
};

const scheduleInterview = async (
  employerId: string,
  applicationId: string,
  interviewScheduledAt: Date,
  interviewNotes?: string,
) => {
  if (!employerId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) throw new AppError(httpStatus.NOT_FOUND, "Application not found");
  await assertEmployerOwnsJob(employerId, app.jobId);

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      interviewScheduledAt,
      interviewNotes: interviewNotes ?? null,
      status: "INTERVIEWED" as any,
      statusChangedBy: employerId,
      statusChangedAt: new Date(),
    },
  });
  return updated;
};

const updateNotes = async (employerId: string, applicationId: string, interviewNotes: string) => {
  if (!employerId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) throw new AppError(httpStatus.NOT_FOUND, "Application not found");
  await assertEmployerOwnsJob(employerId, app.jobId);

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { interviewNotes },
  });
  return updated;
};

const getJobSummary = async (employerId: string, jobId: string) => {
  if (!employerId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }
  await assertEmployerOwnsJob(employerId, jobId);

  const statuses = [
    "SUBMITTED",
    "REVIEWING",
    "SHORTLISTED",
    "INTERVIEWED",
    "REJECTED",
    "OFFERED",
    "ACCEPTED",
    "WITHDRAWN",
  ];
  const counts = await Promise.all(
    statuses.map((s) => prisma.application.count({ where: { jobId, status: s as any } })),
  );
  const summary = Object.fromEntries(statuses.map((s, i) => [s, counts[i]]));
  const total = await prisma.application.count({ where: { jobId } });
  return { total, summary } as const;
};

const getMyCompanyApplications = async (employerId: string, query: any) => {
  if (!employerId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const companyId = await getEmployerCompanyId(employerId);
  const { page, limit, skip } = getPaginationOptions(query);
  const { sortBy, sortOrder } = getApplicationSortOptions(query);
  const where: any = {
    job: { companyId },
    deletedAt: null,
  };

  if (query.status) {
    where.status = query.status;
  }

  if (query.jobId) {
    where.jobId = query.jobId;
  }

  const searchTerm = typeof query.q === "string" ? query.q.trim() : "";
  if (searchTerm) {
    where.OR = buildApplicationSearchWhere(searchTerm);
  }

  const [total, data] = await prisma.$transaction([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            isRemote: true,
            slug: true,
          },
        },
        applicant: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            profile: {
              select: {
                avatarUrl: true,
                headline: true,
                location: true,
                skills: true,
                preference: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 0,
    },
  };
};

const getMyCompanyApplicationSummary = async (employerId: string) => {
  if (!employerId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const companyId = await getEmployerCompanyId(employerId);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const groupedStatusCounts = await prisma.application.groupBy({
    by: ["status"],
    where: {
      job: { companyId },
      deletedAt: null,
    },
    _count: {
      status: true,
    },
  });

  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0])) as Record<
    (typeof APPLICATION_STATUSES)[number],
    number
  >;

  groupedStatusCounts.forEach((item) => {
    byStatus[item.status] = item._count.status;
  });

  const [newThisWeek, rejectedThisMonth] = await prisma.$transaction([
    prisma.application.count({
      where: {
        job: { companyId },
        deletedAt: null,
        createdAt: { gte: weekStart, lte: now },
      },
    }),
    prisma.application.count({
      where: {
        job: { companyId },
        deletedAt: null,
        status: "REJECTED",
        statusChangedAt: { gte: monthStart, lte: now },
      },
    }),
  ]);

  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

  return {
    total,
    newThisWeek,
    inReview: byStatus.SUBMITTED + byStatus.REVIEWING + byStatus.SHORTLISTED,
    rejected: byStatus.REJECTED,
    rejectedThisMonth,
    byStatus,
  };
};

const getApplicationStats = async (userId: string, period: string = "7days") => {
  const now = new Date();
  const startDate = new Date();

  let interval = "day";
  switch (period) {
    case "14days":
      startDate.setDate(now.getDate() - 14);
      break;
    case "lastMonth":
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "3months":
      startDate.setMonth(now.getMonth() - 3);
      interval = "week";
      break;
    case "overall":
      startDate.setFullYear(now.getFullYear() - 1); // last 1 year
      interval = "month";
      break;
    case "7days":
    default:
      startDate.setDate(now.getDate() - 7);
      break;
  }

  // Raw query for aggregation
  // For Postgres: DATE_TRUNC(interval, "createdAt")
  const stats = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC(${interval}, "createdAt") as date,
      COUNT(*)::int as count
    FROM "applications"
    WHERE "applicantId" = ${userId}
      AND "createdAt" >= ${startDate}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  return stats;
};

const applicationService = {
  createApplication,
  getMyApplications,
  getMyApplicationSummary,
  getJobApplications,
  getMyCompanyApplications,
  getMyCompanyApplicationSummary,
  getApplicationById,
  updateStatus,
  withdraw,
  scheduleInterview,
  updateNotes,
  getJobSummary,
  getApplicationStats,
};

export default applicationService;
