/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Response } from 'express';
import httpStatus from 'http-status';
import { Prisma } from '../../../generated/prisma/index.js';
import { streamPdfToClient } from '../../../services/file/fileStream.service.js';
import AppError from '../../error/AppError.js';
import prisma from '../../../utils/prismaClient.js';
import { maintenanceCache } from '../../../lib/maintenanceCache.js';
import { getIO } from '../../../socket/index.js';

type EmployerStatus = 'Verified' | 'Pending' | 'Suspended';
type JobSeekerStatus = 'Hired' | 'Looking' | 'Active' | 'Suspended';

const RECENT_APPLICATION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const recentApplicationCutoff = () => new Date(Date.now() - RECENT_APPLICATION_WINDOW_MS);

const acceptedApplicationWhere = {
  status: 'ACCEPTED' as const,
  deletedAt: null,
};

const recentApplicationWhere = (since: Date) => ({
  deletedAt: null,
  createdAt: { gte: since },
});

const buildJobSeekerStatusWhere = (status: JobSeekerStatus): Prisma.UserWhereInput => {
  const since = recentApplicationCutoff();

  switch (status) {
    case 'Suspended':
      return { isActive: false };
    case 'Hired':
      return {
        isActive: true,
        applications: { some: acceptedApplicationWhere },
      };
    case 'Looking':
      return {
        isActive: true,
        AND: [
          { applications: { none: acceptedApplicationWhere } },
          { applications: { some: recentApplicationWhere(since) } },
        ],
      };
    case 'Active':
      return {
        isActive: true,
        AND: [
          { applications: { none: acceptedApplicationWhere } },
          { applications: { none: recentApplicationWhere(since) } },
        ],
      };
  }
};

const buildJobSeekerListWhere = (query: {
  q?: string;
  status?: JobSeekerStatus;
}): Prisma.UserWhereInput => {
  const baseWhere: Prisma.UserWhereInput = {
    role: 'JOB_SEEKER',
    deletedAt: null,
  };

  const filters: Prisma.UserWhereInput[] = [baseWhere];

  if (query.q) {
    filters.push({
      OR: [
        { fullName: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ],
    });
  }

  if (query.status) {
    filters.push(buildJobSeekerStatusWhere(query.status));
  }

  return filters.length === 1 ? baseWhere : { AND: filters };
};

const deriveJobSeekerStatus = (
  user: { isActive: boolean; id: string },
  acceptedByApplicant: Map<string, number>,
  recentByApplicant: Map<string, number>,
): JobSeekerStatus => {
  if (!user.isActive) return 'Suspended';
  if ((acceptedByApplicant.get(user.id) ?? 0) > 0) return 'Hired';
  if ((recentByApplicant.get(user.id) ?? 0) > 0) return 'Looking';
  return 'Active';
};

const companyStatusFrom = (company: { isVerified: boolean }, owner: { isActive: boolean }) => {
  if (!owner.isActive) return 'Suspended' as const;
  return company.isVerified ? ('Verified' as const) : ('Pending' as const);
};

const getEmployerStats = async () => {
  const [totalEmployers, verifiedCompanies, pendingVerification, activeJobs] = await Promise.all([
    prisma.company.count({ where: { deletedAt: null } }),
    prisma.company.count({ where: { deletedAt: null, isVerified: true } }),
    prisma.company.count({ where: { deletedAt: null, isVerified: false } }),
    prisma.job.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
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
      { name: { contains: q, mode: 'insensitive' } },
      { contactEmail: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where: companyWhere,
      orderBy: { createdAt: 'desc' },
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
        employees: {
          where: { role: 'EMPLOYER', deletedAt: null },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { id: true, fullName: true, email: true, isActive: true, createdAt: true },
        },
      },
    }),
    prisma.company.count({ where: companyWhere }),
  ]);

  const companyIds = companies.map((c) => c.id);
  const activeJobCounts =
    companyIds.length > 0
      ? await prisma.job.groupBy({
          by: ['companyId'],
          where: {
            companyId: { in: companyIds },
            deletedAt: null,
            status: 'ACTIVE',
          },
          _count: {
            id: true,
          },
        })
      : [];

  const jobCountMap = new Map(activeJobCounts.map((item) => [item.companyId, item._count.id]));

  const rows = companies.map((c) => {
    const owner = c.employees[0] || null;
    const activeJobs = jobCountMap.get(c.id) ?? 0;

    const safeOwner =
      owner ??
      ({
        id: null,
        fullName: '—',
        email: '—',
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
      logo: c.logoUrl ?? '',
      industry: c.industry?.name ?? '—',
      ownerId: safeOwner.id,
      ownerName: safeOwner.fullName,
      ownerEmail: safeOwner.email,
      status,
      activeJobs,
      joinedDate: c.createdAt,
      isCompanyVerified: c.isVerified,
      isOwnerActive: safeOwner.isActive,
    };
  });

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
    throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
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
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.role !== 'EMPLOYER') {
    throw new AppError(httpStatus.BAD_REQUEST, 'User is not an employer');
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
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.role !== 'EMPLOYER') {
    throw new AppError(httpStatus.BAD_REQUEST, 'User is not an employer');
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
          where: { role: 'JOB_SEEKER', deletedAt: null },
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
    const q = query.q?.trim() || undefined;
    const where = buildJobSeekerListWhere({ q, status: query.status });

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
              resumeUrl: true,
              skills: {
                select: { skillName: true },
                take: 1,
                orderBy: { experienceYears: 'desc' },
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

    const [acceptedAgg, recentAgg, resumeRows] = await Promise.all([
      prisma.application.groupBy({
        by: ['applicantId'],
        where: { applicantId: { in: userIds }, status: 'ACCEPTED', deletedAt: null },
        _count: { id: true },
      }),
      prisma.application.groupBy({
        by: ['applicantId'],
        where: {
          applicantId: { in: userIds },
          deletedAt: null,
          createdAt: { gte: recentApplicationCutoff() },
        },
        _count: { id: true },
      }),
      userIds.length
        ? prisma.resume.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds }, deletedAt: null },
          })
        : Promise.resolve([]),
    ]);

    for (const r of acceptedAgg) acceptedByApplicant.set(r.applicantId, r._count.id);
    for (const r of recentAgg) recentByApplicant.set(r.applicantId, r._count.id);

    const usersWithResume = new Set(resumeRows.map((r) => r.userId));

    const data = users.map((u) => {
      const p = u.profile;
      const primarySkill = p?.skills?.[0]?.skillName ?? '—';
      const experience = p?.preference?.workExperience || p?.headline || '—';
      const location = p?.location || 'Remote';
      const status = deriveJobSeekerStatus(u, acceptedByApplicant, recentByApplicant);
      const hasResume = usersWithResume.has(u.id) || Boolean(p?.resumeUrl);

      return {
        id: u.id,
        name: u.fullName,
        avatar: p?.avatarUrl ?? '',
        email: u.email,
        location,
        status,
        experience,
        primarySkill,
        joinedDate: u.createdAt,
        hasResume,
        socials: {
          github: p?.githubUrl ?? undefined,
          linkedin: p?.linkedInUrl ?? undefined,
          portfolio: p?.websiteUrl ?? undefined,
        },
      };
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit) || 1,
      },
    };
  },

  suspendJobSeeker: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    if (user.role !== 'JOB_SEEKER')
      throw new AppError(httpStatus.BAD_REQUEST, 'User is not a job seeker');
    return prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  },

  reactivateJobSeeker: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    if (user.role !== 'JOB_SEEKER')
      throw new AppError(httpStatus.BAD_REQUEST, 'User is not a job seeker');
    return prisma.user.update({ where: { id: userId }, data: { isActive: true } });
  },

  deleteJobSeeker: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    if (user.role !== 'JOB_SEEKER')
      throw new AppError(httpStatus.BAD_REQUEST, 'User is not a job seeker');
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: false, deletedAt: new Date() },
    });
  },

  streamJobSeekerResume: async (userId: string, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        deletedAt: true,
        fullName: true,
        profile: { select: { resumeUrl: true } },
      },
    });

    if (!user || user.deletedAt) {
      throw new AppError(httpStatus.NOT_FOUND, 'Job seeker not found');
    }
    if (user.role !== 'JOB_SEEKER') {
      throw new AppError(httpStatus.BAD_REQUEST, 'User is not a job seeker');
    }

    const resume = await prisma.resume.findFirst({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { uploadDate: 'desc' }],
    });

    if (resume) {
      await streamPdfToClient({
        res,
        fileUrl: resume.fileUrl,
        filename: resume.fileName,
      });
      return;
    }

    if (user.profile?.resumeUrl) {
      await streamPdfToClient({
        res,
        fileUrl: user.profile.resumeUrl,
        filename: `${user.fullName.replace(/\s+/g, '-')}-resume.pdf`,
      });
      return;
    }

    throw new AppError(httpStatus.NOT_FOUND, 'No resume found for this candidate');
  },

  getActiveJobsStats: async () => {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));

    const [totalActiveJobs, newToday, totalApplications, expiringSoon] = await Promise.all([
      prisma.job.count({
        where: { status: 'ACTIVE', deletedAt: null },
      }),
      prisma.job.count({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
          createdAt: { gte: today },
        },
      }),
      prisma.application.count({
        where: { deletedAt: null },
      }),
      prisma.job.count({
        where: {
          status: 'ACTIVE',
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

  getActiveJobsList: async (query: {
    page: number;
    limit: number;
    q?: string;
    type?: string;
    status?: any;
  }) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;
    const q = query.q?.trim();

    const where: any = {
      status: query.status || 'ACTIVE',
      deletedAt: null,
    };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (query.type) {
      where.jobType = query.type;
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          company: {
            select: {
              name: true,
              logoUrl: true,
            },
          },
          postedBy: {
            select: {
              fullName: true,
              email: true,
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

    // Backend Security & Spam Detection Scanner
    const scanJob = (j: {
      title: string;
      description: string;
      postedBy?: { email: string } | null;
    }) => {
      const title = (j.title || '').toLowerCase();
      const description = (j.description || '').toLowerCase();
      const recruiterEmail = (j.postedBy?.email || '').toLowerCase();

      const rules: string[] = [];
      let score = 0;

      if (/bkash|nagad|rocket|fee|charge|payment|deposit|pay/i.test(description)) {
        rules.push('Mobile Financial Service (MFS) or deposit/payment keywords detected');
        score += 45;
      }
      if (/@gmail\.com|@yahoo\.com|@outlook\.com|@hotmail\.com/i.test(recruiterEmail)) {
        rules.push('Recruiter registered using a public personal email domain (@gmail.com/etc.)');
        score += 25;
      }
      if (/telegram|whatsapp|\+880/i.test(description)) {
        rules.push('Direct external chat redirection (Telegram/WhatsApp/Mobile) detected');
        score += 30;
      }
      if (/data entry|typing|form filling|work from home/i.test(title)) {
        rules.push('High-risk category (Data Entry/Typing) keyword detected');
        score += 20;
      }

      if (rules.length === 0) {
        rules.push('Algorithmic filter flagged for manual metadata check');
        score = 15;
      }

      return {
        riskScore: Math.min(score, 100),
        triggeredRules: rules,
        priority: score >= 60 ? 'Emergency' : score >= 40 ? 'Medium' : 'Normal',
      };
    };

    const rows = jobs.map((job) => {
      const analysis = scanJob({
        title: job.title,
        description: job.description,
        postedBy: job.postedBy,
      });

      return {
        id: job.id,
        title: job.title,
        company: job.company?.name || 'Unknown Company',
        logo: job.company?.logoUrl ?? '',
        location: job.location,
        type: job.jobType,
        category: job.discipline,
        posted: job.createdAt,
        expires: job.expiresAt,
        views: job.viewCount,
        applications: job._count.applications,
        status: job.status,
        description: job.description,
        postedBy: job.postedBy
          ? {
              fullName: job.postedBy.fullName,
              email: job.postedBy.email,
            }
          : null,
        // Enriched backend risk indicators
        riskScore: analysis.riskScore,
        triggeredRules: analysis.triggeredRules,
        priority: analysis.priority,
      };
    });

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
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, deletedAt: null },
      }),
      prisma.user.count({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          deletedAt: null,
          isActive: true,
          lastLogin: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // Active in last 30 mins
        },
      }),
      prisma.auditLog.count(),
      prisma.user.count({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          deletedAt: null,
          isActive: false,
        },
      }),
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
    role?: 'ADMIN' | 'SUPER_ADMIN';
  }) => {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const q = query.q?.trim() || undefined;

    const where: Prisma.UserWhereInput = {
      role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      deletedAt: null,
    };

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
      status: u.isActive ? 'Active' : 'Inactive',
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
    if (actor.role === 'ADMIN' && payload.role === 'SUPER_ADMIN') {
      throw new AppError(httpStatus.FORBIDDEN, 'Admins can only create other Admins');
    }

    const isExists = await prisma.user.findUnique({ where: { email: payload.email } });
    if (isExists) {
      throw new AppError(httpStatus.BAD_REQUEST, 'User already exists with this email');
    }

    // Hash a placeholder password since they will use magic link
    const placeholderPassword = 'TemporaryPassword123!';
    const passwordHash = await (await import('bcrypt')).hash(placeholderPassword, 12);

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
        entityType: 'Staff',
        entityId: user.id,
        action: 'CREATE',
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
    if (!user || user.deletedAt) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new AppError(httpStatus.BAD_REQUEST, 'User is not a staff member');
    }

    // Role logic: Admins cannot deactivate/activate Super Admins
    if (actor.role === 'ADMIN' && user.role === 'SUPER_ADMIN') {
      throw new AppError(httpStatus.FORBIDDEN, 'Admins cannot manage Super Administrators');
    }
    if (userId === actor.id && !isActive) {
      throw new AppError(httpStatus.BAD_REQUEST, 'You cannot deactivate your own account');
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: { isActive } });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        entityType: 'Staff',
        entityId: userId,
        action: isActive ? 'ACTIVATE' : 'DEACTIVATE',
        oldValues: { isActive: user.isActive },
        newValues: { isActive },
        userId: actor.id,
      },
    });

    return updated;
  },

  setStaffRole: async (
    userId: string,
    role: 'ADMIN' | 'SUPER_ADMIN',
    actor: { id: string; role: string },
  ) => {
    if (actor.role !== 'SUPER_ADMIN') {
      throw new AppError(httpStatus.FORBIDDEN, 'Only Super Administrators can change staff roles');
    }

    if (userId === actor.id) {
      throw new AppError(httpStatus.BAD_REQUEST, 'You cannot change your own role');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new AppError(httpStatus.BAD_REQUEST, 'User is not a staff member');
    }

    if (user.role === role) {
      return user;
    }

    if (user.role === 'SUPER_ADMIN' && role === 'ADMIN') {
      const activeSuperAdmins = await prisma.user.count({
        where: {
          role: 'SUPER_ADMIN',
          deletedAt: null,
          isActive: true,
        },
      });
      if (activeSuperAdmins <= 1) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Cannot demote the last active Super Administrator',
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'Staff',
        entityId: userId,
        action: 'ROLE_UPDATE',
        oldValues: { role: user.role },
        newValues: { role },
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
    staffId?: string;
  }) => {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};
    if (query.entityType) where.entityType = query.entityType;
    if (query.action) where.action = query.action;
    if (query.staffId) {
      where.OR = [{ entityId: query.staffId }, { userId: query.staffId }];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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

    const staffEntityIds = [
      ...new Set(logs.filter((log) => log.entityType === 'Staff').map((log) => log.entityId)),
    ];

    const staffTargets =
      staffEntityIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: staffEntityIds } },
            select: { id: true, fullName: true, email: true },
          })
        : [];

    const staffTargetMap = new Map(
      staffTargets.map((user) => [user.id, `${user.fullName} (${user.email})`]),
    );

    const resolveTarget = (log: (typeof logs)[number]) => {
      if (log.entityType === 'Staff') {
        return staffTargetMap.get(log.entityId) ?? log.entityId;
      }

      const newValues = log.newValues as { email?: string; title?: string } | null;
      if (newValues?.email) return newValues.email;
      if (newValues?.title) return newValues.title;

      return log.entityId;
    };

    const rows = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      target: resolveTarget(log),
      actor: log.user?.fullName || 'System',
      actorRole: log.user?.role || 'SYSTEM',
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
      prisma.job.count({ where: { status: 'ACTIVE', deletedAt: null } }).catch(() => 0),
      prisma.job
        .count({ where: { status: 'ACTIVE', deletedAt: null, createdAt: { lt: lastMonth } } })
        .catch(() => 0),
      prisma.job.count({ where: { status: 'DRAFT', deletedAt: null } }).catch(() => 0),
      prisma.company.count({ where: { isVerified: false, deletedAt: null } }).catch(() => 0),
      prisma.invoice
        .aggregate({
          where: { status: 'PAID' },
          _sum: { amount: true },
        })
        .catch(() => ({ _sum: { amount: 0 } })),
      prisma.invoice
        .aggregate({
          where: { status: 'PAID', paidAt: { lt: lastMonth } },
          _sum: { amount: true },
        })
        .catch(() => ({ _sum: { amount: 0 } })),
    ]);

    const totalRevenue = (totalRevenueResult as any)?._sum?.amount || 0;
    const totalRevenueLastMonth = (totalRevenueLastMonthResult as any)?._sum?.amount || 0;

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const change = ((current - previous) / previous) * 100;
      return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
    };

    return {
      totalUsers: {
        value: totalUsers,
        change: `${calculateChange(totalUsers, totalUsersLastMonth)} from last month`,
        trend: totalUsers >= totalUsersLastMonth ? 'up' : 'down',
      },
      activeJobs: {
        value: activeJobs,
        change: `${calculateChange(activeJobs, activeJobsLastMonth)} from last month`,
        trend: activeJobs >= activeJobsLastMonth ? 'up' : 'down',
      },
      pendingApprovals: {
        value: pendingApprovals + unverifiedCompanies,
        change: 'Awaiting review',
        trend: 'neutral',
      },
      globalRevenue: {
        value: totalRevenue,
        change: `${calculateChange(totalRevenue, totalRevenueLastMonth)} from last month`,
        trend: totalRevenue >= totalRevenueLastMonth ? 'up' : 'down',
      },
    };
  },

  getRecentUsers: async (limit = 5) => {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
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
      status: u.isVerified ? 'Verified' : 'New',
      joinedAt: u.createdAt,
    }));
  },

  getModerationQueue: async (limit = 5) => {
    const jobs = await prisma.job.findMany({
      where: { status: 'DRAFT', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        company: { select: { name: true } },
      },
    });

    return jobs.map((j: any) => ({
      id: j.id,
      title: j.title,
      company: j.company?.name || 'Unknown',
      status: j.status,
      createdAt: j.createdAt,
    }));
  },

  getSystemSettings: async () => {
    return prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
    });
  },

  getPublicSystemSettings: async () => {
    return prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
      select: {
        siteName: true,
        siteSlogan: true,
        siteLogo: true,
        supportEmail: true,
        qrCodeUrl: true,
        footerSocials: true,
        maintenanceMode: true,
      },
    });
  },

  updateSystemSettings: async (data: any) => {
    // Strip id if passed to prevent prisma errors trying to change primary key
    const { maintenanceEstimatedEnd, ...updateData } = data;
    delete (updateData as any).id;

    const formattedUpdateData: any = { ...updateData };

    if (data.maintenanceMode !== undefined) {
      formattedUpdateData.maintenanceSetAt = data.maintenanceMode ? new Date() : null;
      formattedUpdateData.maintenanceEstimatedEnd =
        data.maintenanceMode && maintenanceEstimatedEnd ? new Date(maintenanceEstimatedEnd) : null;
    } else if (maintenanceEstimatedEnd !== undefined) {
      formattedUpdateData.maintenanceEstimatedEnd = maintenanceEstimatedEnd
        ? new Date(maintenanceEstimatedEnd)
        : null;
    }

    const settings = await prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        ...formattedUpdateData,
      },
      update: formattedUpdateData,
    });

    // Sync cache immediately so the server/edge queries see the update instantly
    maintenanceCache.set(
      settings.maintenanceMode,
      settings.maintenanceMessage,
      settings.maintenanceSetAt,
      settings.maintenanceEstimatedEnd,
    );

    // If maintenanceMode was updated, emit Socket.io events
    if (updateData.maintenanceMode !== undefined) {
      const io = getIO();
      if (io) {
        if (settings.maintenanceMode) {
          io.emit('maintenance:warning', {
            gracePeriodMs: 10_000,
            message: settings.maintenanceMessage,
          });
          setTimeout(() => {
            io.emit('maintenance:change', {
              enabled: true,
              message: settings.maintenanceMessage,
              setAt: settings.maintenanceSetAt,
              estimatedEnd: settings.maintenanceEstimatedEnd,
            });
          }, 10_000);
        } else {
          io.emit('maintenance:change', {
            enabled: false,
            message: null,
            setAt: null,
            estimatedEnd: null,
          });
        }
      }
    }

    return settings;
  },

  getJobReports: async (query: any) => {
    const { page = 1, limit = 10, status, severity, q } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (q) {
      where.OR = [
        { job: { title: { contains: q, mode: 'insensitive' } } },
        { job: { company: { name: { contains: q, mode: 'insensitive' } } } },
        { reason: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [reports, total] = await Promise.all([
      prisma.jobReport.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
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
      prisma.jobReport.count({ where: { status: 'OPEN' } }),
      prisma.jobReport.count({ where: { status: 'PENDING' } }),
      prisma.jobReport.count({
        where: {
          status: 'RESOLVED',
          updatedAt: { gte: today },
        },
      }),
      prisma.jobReport.count({ where: { severity: 'CRITICAL', status: 'OPEN' } }),
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
      data: { status: 'CLOSED' },
    });
  },

  approveJob: async (jobId: string) => {
    return await prisma.job.update({
      where: { id: jobId },
      data: { status: 'ACTIVE' },
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
