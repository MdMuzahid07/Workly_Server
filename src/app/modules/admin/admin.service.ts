import httpStatus from "http-status";
import AppError from "../../error/AppError.js";
import prisma from "../../../utils/prismaClient.js";

type EmployerStatus = "Verified" | "Pending" | "Suspended";
type JobSeekerStatus = "Hired" | "Looking" | "Active" | "Suspended";

const companyStatusFrom = (company: { isVerified: boolean }, owner: { isActive: boolean }) => {
  if (!owner.isActive) return "Suspended" as const;
  return company.isVerified ? ("Verified" as const) : ("Pending" as const);
};

async function findCompanyOwner(companyId: string) {
  // There is no explicit owner field in schema. Use the earliest EMPLOYER user in this company.
  const owner = await prisma.user.findFirst({
    where: { companyId, role: "EMPLOYER", deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true, email: true, isActive: true, createdAt: true },
  });
  return owner;
}

const getEmployerStats = async () => {
  const [totalEmployers, verifiedCompanies, pendingVerification, activeJobs] = await Promise.all([
    prisma.company.count({ where: { deletedAt: null } }),
    prisma.company.count({ where: { deletedAt: null, isVerified: true } }),
    prisma.company.count({ where: { deletedAt: null, isVerified: false } }),
    prisma.job.count({ where: { deletedAt: null, status: "ACTIVE" } }),
  ]);

  return {
    totalEmployers,
    verifiedCompanies,
    pendingVerification,
    activeJobs,
  };
};

const getEmployersList = async (query: {
  page: number;
  limit: number;
  q?: string;
  status?: EmployerStatus;
}) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;
  const q = query.q?.trim();

  // Base company filter (soft-delete aware)
  const companyWhere: any = { deletedAt: null };
  if (q) {
    companyWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { contactEmail: { contains: q, mode: "insensitive" } },
    ];
  }

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where: companyWhere,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        createdAt: true,
        isVerified: true,
        industry: { select: { name: true } },
      },
    }),
    prisma.company.count({ where: companyWhere }),
  ]);

  const rows = await Promise.all(
    companies.map(async (c) => {
      const owner = await findCompanyOwner(c.id);
      const activeJobs = await prisma.job.count({
        where: { companyId: c.id, deletedAt: null, status: "ACTIVE" },
      });

      const safeOwner =
        owner ??
        ({
          id: null,
          fullName: "—",
          email: "—",
          isActive: true,
          createdAt: c.createdAt,
        } as any);

      const status = companyStatusFrom(
        { isVerified: c.isVerified },
        { isActive: safeOwner.isActive },
      );

      return {
        id: c.id,
        companyName: c.name,
        slug: c.slug,
        logo: c.logoUrl ?? "",
        industry: c.industry?.name ?? "—",
        ownerId: safeOwner.id,
        ownerName: safeOwner.fullName,
        ownerEmail: safeOwner.email,
        status,
        activeJobs,
        joinedDate: c.createdAt,
        isCompanyVerified: c.isVerified,
        isOwnerActive: safeOwner.isActive,
      };
    }),
  );

  const filtered = query.status == null ? rows : rows.filter((r) => r.status === query.status);

  // If status is applied, pagination meta should reflect filtered count
  const filteredTotal = query.status == null ? total : filtered.length;

  return {
    data: filtered,
    meta: {
      page,
      limit,
      total: filteredTotal,
      totalPage: Math.ceil(filteredTotal / limit) || 1,
    },
  };
};

const verifyCompany = async (companyId: string) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company || company.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Company not found");
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { isVerified: true, verifiedAt: new Date() },
  });

  return updated;
};

const setEmployerActive = async (userId: string, isActive: boolean) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.role !== "EMPLOYER") {
    throw new AppError(httpStatus.BAD_REQUEST, "User is not an employer");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  return updated;
};

const deleteEmployer = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.role !== "EMPLOYER") {
    throw new AppError(httpStatus.BAD_REQUEST, "User is not an employer");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: false, deletedAt: new Date() },
  });

  return updated;
};

const adminService = {
  getEmployerStats,
  getEmployersList,
  verifyCompany,
  setEmployerActive,
  deleteEmployer,
  getJobSeekerStats: async () => {
    const [totalJobSeekers, activeResumes, portfoliosShared, totalWithPreference] =
      await Promise.all([
        prisma.user.count({
          where: { role: "JOB_SEEKER", deletedAt: null },
        }),
        prisma.resume.count({ where: { deletedAt: null } }),
        prisma.profile.count({
          where: {
            OR: [
              { websiteUrl: { not: null } },
              { githubUrl: { not: null } },
              { linkedInUrl: { not: null } },
            ],
          },
        }),
        prisma.preference.count(),
      ]);

    const highMatchRate =
      totalJobSeekers > 0 ? Math.round((totalWithPreference / totalJobSeekers) * 1000) / 10 : 0;

    return {
      totalJobSeekers,
      activeResumes,
      portfoliosShared,
      highMatchRate,
    };
  },

  getJobSeekersList: async (query: {
    page: number;
    limit: number;
    q?: string;
    status?: JobSeekerStatus;
  }) => {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const q = query.q?.trim();

    const where: any = {
      role: "JOB_SEEKER",
      deletedAt: null,
    };

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
          createdAt: true,
          profile: {
            select: {
              avatarUrl: true,
              location: true,
              headline: true,
              websiteUrl: true,
              githubUrl: true,
              linkedInUrl: true,
              skills: {
                select: { skillName: true },
                take: 1,
                orderBy: { experienceYears: "desc" },
              },
              preference: { select: { workExperience: true } },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const userIds = users.map((u) => u.id);
    const acceptedByApplicant = new Map<string, number>();
    const recentByApplicant = new Map<string, number>();

    const [acceptedAgg, recentAgg] = await Promise.all([
      prisma.application.groupBy({
        by: ["applicantId"],
        where: { applicantId: { in: userIds }, status: "ACCEPTED", deletedAt: null },
        _count: { id: true },
      }),
      prisma.application.groupBy({
        by: ["applicantId"],
        where: {
          applicantId: { in: userIds },
          deletedAt: null,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        _count: { id: true },
      }),
    ]);

    for (const r of acceptedAgg) acceptedByApplicant.set(r.applicantId, r._count.id);
    for (const r of recentAgg) recentByApplicant.set(r.applicantId, r._count.id);

    const deriveStatus = (u: { isActive: boolean; id: string }): JobSeekerStatus => {
      if (!u.isActive) return "Suspended";
      if ((acceptedByApplicant.get(u.id) ?? 0) > 0) return "Hired";
      if ((recentByApplicant.get(u.id) ?? 0) > 0) return "Looking";
      return "Active";
    };

    const rows = users.map((u) => {
      const p = u.profile;
      const primarySkill = p?.skills?.[0]?.skillName ?? "—";
      const experience = p?.preference?.workExperience || p?.headline || "—";
      const location = p?.location || "Remote";
      const status = deriveStatus(u);

      return {
        id: u.id,
        name: u.fullName,
        avatar: p?.avatarUrl ?? "",
        email: u.email,
        location,
        status,
        experience,
        primarySkill,
        joinedDate: u.createdAt,
        socials: {
          github: p?.githubUrl ?? undefined,
          linkedin: p?.linkedInUrl ?? undefined,
          portfolio: p?.websiteUrl ?? undefined,
        },
      };
    });

    const filtered = query.status ? rows.filter((r) => r.status === query.status) : rows;
    const filteredTotal = query.status ? filtered.length : total;

    return {
      data: filtered,
      meta: {
        page,
        limit,
        total: filteredTotal,
        totalPage: Math.ceil(filteredTotal / limit) || 1,
      },
    };
  },

  suspendJobSeeker: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AppError(httpStatus.NOT_FOUND, "User not found");
    if (user.role !== "JOB_SEEKER")
      throw new AppError(httpStatus.BAD_REQUEST, "User is not a job seeker");
    return prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  },

  reactivateJobSeeker: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AppError(httpStatus.NOT_FOUND, "User not found");
    if (user.role !== "JOB_SEEKER")
      throw new AppError(httpStatus.BAD_REQUEST, "User is not a job seeker");
    return prisma.user.update({ where: { id: userId }, data: { isActive: true } });
  },

  deleteJobSeeker: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AppError(httpStatus.NOT_FOUND, "User not found");
    if (user.role !== "JOB_SEEKER")
      throw new AppError(httpStatus.BAD_REQUEST, "User is not a job seeker");
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: false, deletedAt: new Date() },
    });
  },

  getActiveJobsStats: async () => {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));

    const [totalActiveJobs, newToday, totalApplications, expiringSoon] = await Promise.all([
      prisma.job.count({
        where: { status: "ACTIVE", deletedAt: null },
      }),
      prisma.job.count({
        where: {
          status: "ACTIVE",
          deletedAt: null,
          createdAt: { gte: today },
        },
      }),
      prisma.application.count({
        where: { deletedAt: null },
      }),
      prisma.job.count({
        where: {
          status: "ACTIVE",
          deletedAt: null,
          expiresAt: {
            gt: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
          },
        },
      }),
    ]);

    return {
      totalActiveJobs,
      newToday,
      totalApplications,
      expiringSoon,
    };
  },

  getActiveJobsList: async (query: { page: number; limit: number; q?: string; type?: string }) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;
    const q = query.q?.trim();

    const where: any = {
      status: "ACTIVE",
      deletedAt: null,
    };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { company: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    if (query.type) {
      where.jobType = query.type;
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          company: {
            select: {
              name: true,
              logoUrl: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    const rows = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company?.name || "Unknown Company",
      logo: job.company?.logoUrl ?? "",
      location: job.location,
      type: job.jobType,
      category: job.discipline,
      posted: job.createdAt,
      expires: job.expiresAt,
      views: job.viewCount,
      applications: job._count.applications,
      status: job.status,
    }));

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit) || 1,
      },
    };
  },

  getStaffStats: async () => {
    const [totalAdmins, activeNow, totalAuditLogs, riskItems] = await Promise.all([
      prisma.user.count({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, deletedAt: null },
      }),
      prisma.user.count({
        where: {
          role: { in: ["ADMIN", "SUPER_ADMIN"] },
          deletedAt: null,
          isActive: true,
          lastLogin: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // Active in last 30 mins
        },
      }),
      prisma.auditLog.count(),
      0, // Placeholder for Risk Items logic
    ]);

    return {
      totalAdmins,
      activeNow,
      totalAuditLogs,
      riskItems,
    };
  },

  getStaffList: async (query: {
    page: number;
    limit: number;
    q?: string;
    role?: "ADMIN" | "SUPER_ADMIN";
  }) => {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const q = query.q?.trim();

    const where: any = {
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
      deletedAt: null,
    };

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const rows = users.map((u) => ({
      id: u.id,
      name: u.fullName,
      email: u.email,
      role: u.role,
      status: u.isActive ? "Active" : "Inactive",
      lastLogin: u.lastLogin,
    }));

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit) || 1,
      },
    };
  },

  createStaff: async (payload: any, actor: { id: string; role: string }) => {
    // Role logic: only super admin can create super admin, or admin. admin can only create admin.
    if (actor.role === "ADMIN" && payload.role === "SUPER_ADMIN") {
      throw new AppError(httpStatus.FORBIDDEN, "Admins can only create other Admins");
    }

    const isExists = await prisma.user.findUnique({ where: { email: payload.email } });
    if (isExists) {
      throw new AppError(httpStatus.BAD_REQUEST, "User already exists with this email");
    }

    // Hash a placeholder password since they will use magic link
    const placeholderPassword = "TemporaryPassword123!";
    const passwordHash = await (await import("bcrypt")).hash(placeholderPassword, 12);

    const user = await prisma.user.create({
      data: {
        email: payload.email,
        fullName: payload.fullName,
        phone: payload.phone,
        role: payload.role,
        passwordHash,
        isVerified: true,
        isActive: true,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        entityType: "Staff",
        entityId: user.id,
        action: "CREATE",
        newValues: { role: payload.role, email: payload.email },
        userId: actor.id,
      },
    });

    return user;
  },

  setStaffStatus: async (
    userId: string,
    isActive: boolean,
    actor: { id: string; role: string },
  ) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AppError(httpStatus.NOT_FOUND, "User not found");
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      throw new AppError(httpStatus.BAD_REQUEST, "User is not a staff member");
    }

    // Role logic: Admins cannot deactivate/activate Super Admins
    if (actor.role === "ADMIN" && user.role === "SUPER_ADMIN") {
      throw new AppError(httpStatus.FORBIDDEN, "Admins cannot manage Super Administrators");
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: { isActive } });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        entityType: "Staff",
        entityId: userId,
        action: isActive ? "ACTIVATE" : "DEACTIVATE",
        oldValues: { isActive: user.isActive },
        newValues: { isActive },
        userId: actor.id,
      },
    });

    return updated;
  },

  getAuditLogs: async (query: {
    page: number;
    limit: number;
    entityType?: string;
    action?: string;
  }) => {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.entityType) where.entityType = query.entityType;
    if (query.action) where.action = query.action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: { fullName: true, role: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const rows = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      target: log.entityId, // Or a more descriptive target name if stored in values
      actor: log.user?.fullName || "System",
      actorRole: log.user?.role || "SYSTEM",
      createdAt: log.createdAt,
    }));

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit) || 1,
      },
    };
  },

  getDashboardOverviewStats: async () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    // Execute queries independently to prevent one failure from breaking the whole dashboard
    const [
      totalUsers,
      totalUsersLastMonth,
      activeJobs,
      activeJobsLastMonth,
      pendingApprovals,
      unverifiedCompanies,
      totalRevenueResult,
      totalRevenueLastMonthResult,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }).catch(() => 0),
      prisma.user
        .count({ where: { deletedAt: null, createdAt: { lt: lastMonth } } })
        .catch(() => 0),
      prisma.job.count({ where: { status: "ACTIVE", deletedAt: null } }).catch(() => 0),
      prisma.job
        .count({ where: { status: "ACTIVE", deletedAt: null, createdAt: { lt: lastMonth } } })
        .catch(() => 0),
      prisma.job.count({ where: { status: "DRAFT", deletedAt: null } }).catch(() => 0),
      prisma.company.count({ where: { isVerified: false, deletedAt: null } }).catch(() => 0),
      prisma.invoice
        .aggregate({
          where: { status: "PAID" },
          _sum: { amount: true },
        })
        .catch(() => ({ _sum: { amount: 0 } })),
      prisma.invoice
        .aggregate({
          where: { status: "PAID", paidAt: { lt: lastMonth } },
          _sum: { amount: true },
        })
        .catch(() => ({ _sum: { amount: 0 } })),
    ]);

    const totalRevenue = (totalRevenueResult as any)?._sum?.amount || 0;
    const totalRevenueLastMonth = (totalRevenueLastMonthResult as any)?._sum?.amount || 0;

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? "+100%" : "0%";
      const change = ((current - previous) / previous) * 100;
      return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
    };

    return {
      totalUsers: {
        value: totalUsers,
        change: `${calculateChange(totalUsers, totalUsersLastMonth)} from last month`,
        trend: totalUsers >= totalUsersLastMonth ? "up" : "down",
      },
      activeJobs: {
        value: activeJobs,
        change: `${calculateChange(activeJobs, activeJobsLastMonth)} from last month`,
        trend: activeJobs >= activeJobsLastMonth ? "up" : "down",
      },
      pendingApprovals: {
        value: pendingApprovals + unverifiedCompanies,
        change: "Awaiting review",
        trend: "neutral",
      },
      globalRevenue: {
        value: totalRevenue,
        change: `${calculateChange(totalRevenue, totalRevenueLastMonth)} from last month`,
        trend: totalRevenue >= totalRevenueLastMonth ? "up" : "down",
      },
    };
  },

  getRecentUsers: async (limit = 5) => {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.fullName,
      email: u.email,
      role: u.role,
      status: u.isVerified ? "Verified" : "New",
      joinedAt: u.createdAt,
    }));
  },

  getModerationQueue: async (limit = 5) => {
    const jobs = await prisma.job.findMany({
      where: { status: "DRAFT", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        company: { select: { name: true } },
      },
    });

    return jobs.map((j: any) => ({
      id: j.id,
      title: j.title,
      company: j.company?.name || "Unknown",
      status: j.status,
      createdAt: j.createdAt,
    }));
  },

  getSystemSettings: async () => {
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {},
      });
    }
    return settings;
  },

  updateSystemSettings: async (data: any) => {
    const settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      return prisma.systemSettings.create({
        data,
      });
    }
    return prisma.systemSettings.update({
      where: { id: settings.id },
      data,
    });
  },

  getJobReports: async (query: any) => {
    const { page = 1, limit = 10, status, severity, q } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (q) {
      where.OR = [
        { job: { title: { contains: q, mode: "insensitive" } } },
        { job: { company: { name: { contains: q, mode: "insensitive" } } } },
        { reason: { contains: q, mode: "insensitive" } },
      ];
    }

    const [reports, total] = await Promise.all([
      prisma.jobReport.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              company: { select: { name: true, logoUrl: true } },
            },
          },
          reporter: {
            select: {
              fullName: true,
            },
          },
        },
      }),
      prisma.jobReport.count({ where }),
    ]);

    return {
      data: (reports as any[]).map((r) => ({
        id: r.id,
        jobId: r.job.id,
        title: r.job.title,
        company: r.job.company.name,
        logo: r.job.company.logoUrl,
        reporter: r.reporter.fullName,
        reason: r.reason,
        severity: r.severity,
        reportedAt: r.createdAt,
        comment: r.comment,
        status: r.status,
      })),
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
      },
    };
  },

  getJobReportStats: async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [open, pending, resolvedToday, critical] = await Promise.all([
      prisma.jobReport.count({ where: { status: "OPEN" } }),
      prisma.jobReport.count({ where: { status: "PENDING" } }),
      prisma.jobReport.count({
        where: {
          status: "RESOLVED",
          updatedAt: { gte: today },
        },
      }),
      prisma.jobReport.count({ where: { severity: "CRITICAL", status: "OPEN" } }),
    ]);

    return {
      openReports: open,
      pendingReview: pending,
      resolvedToday,
      criticalAlerts: critical,
    };
  },

  updateJobReportStatus: async (reportId: string, status: any) => {
    return await prisma.jobReport.update({
      where: { id: reportId },
      data: { status },
    });
  },

  deactivateJob: async (jobId: string) => {
    return await prisma.job.update({
      where: { id: jobId },
      data: { status: "CLOSED" },
    });
  },

  deleteJobListing: async (jobId: string) => {
    return await prisma.job.update({
      where: { id: jobId },
      data: { deletedAt: new Date() },
    });
  },
};

export default adminService;
