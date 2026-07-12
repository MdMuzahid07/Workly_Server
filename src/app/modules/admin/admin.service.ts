import type { Response } from 'express';
import os from 'os';
import httpStatus from 'http-status';
import crypto from 'crypto';
import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { sendBroadcastEmail } from '../../../utils/emailService.js';
import {
  Prisma,
  JobStatus,
  ReportStatus,
  NotificationType,
} from '../../../generated/prisma/index.js';
import { streamPdfToClient } from '../../../services/file/fileStream.service.js';
import AppError from '../../error/AppError.js';
import prisma from '../../../utils/prismaClient.js';
import { maintenanceCache } from '../../../lib/maintenanceCache.js';
import { getIO } from '../../../socket/index.js';

import {
  AdminActor,
  SystemSettingsUpdate,
  EmployerStatus,
  JobSeekerStatus,
  EmployerOwner,
  GetJobReportsQuery,
  SystemMetrics,
} from './admin.interface.js';

const RECENT_APPLICATION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const recentApplicationCutoff = () => new Date(Date.now() - RECENT_APPLICATION_WINDOW_MS);

const logAdminAction = async (params: {
  tx?: Prisma.TransactionClient;
  entityType: string;
  entityId: string;
  action: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  userId?: string | null;
}) => {
  const client = params.tx || prisma;
  return await client.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      oldValues: params.oldValues || null,
      newValues: params.newValues || null,
      userId: params.userId || null,
    },
  });
};

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
  const companyWhere: Prisma.CompanyWhereInput = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { contactEmail: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

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
          select: {
            id: true,
            fullName: true,
            email: true,
            isActive: true,
            failedLoginAttempts: true,
            lockedUntil: true,
            createdAt: true,
          },
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

    const safeOwner: EmployerOwner = owner
      ? {
          id: owner.id,
          fullName: owner.fullName,
          email: owner.email,
          isActive: owner.isActive,
          failedLoginAttempts: owner.failedLoginAttempts,
          lockedUntil: owner.lockedUntil,
          createdAt: owner.createdAt,
        }
      : {
          id: null,
          fullName: '—',
          email: '—',
          isActive: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
          createdAt: c.createdAt,
        };

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
      failedLoginAttempts: safeOwner.failedLoginAttempts,
      lockedUntil: safeOwner.lockedUntil,
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

const verifyCompany = async (companyId: string, actor?: { userId?: string }) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company || company.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.company.update({
      where: { id: companyId },
      data: { isVerified: true, verifiedAt: new Date() },
    });

    await logAdminAction({
      tx,
      entityType: 'Company',
      entityId: companyId,
      action: 'VERIFY',
      oldValues: { isVerified: company.isVerified },
      newValues: { isVerified: true },
      userId: actor?.userId,
    });

    return updated;
  });
};

const setEmployerActive = async (
  userId: string,
  isActive: boolean,
  actor?: { userId?: string },
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.role !== 'EMPLOYER') {
    throw new AppError(httpStatus.BAD_REQUEST, 'User is not an employer');
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { isActive },
    });

    await logAdminAction({
      tx,
      entityType: 'User',
      entityId: userId,
      action: isActive ? 'REACTIVATE' : 'SUSPEND',
      oldValues: { isActive: user.isActive },
      newValues: { isActive },
      userId: actor?.userId,
    });

    return updated;
  });
};

const deleteEmployer = async (userId: string, actor?: { userId?: string }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.role !== 'EMPLOYER') {
    throw new AppError(httpStatus.BAD_REQUEST, 'User is not an employer');
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { isActive: false, deletedAt: new Date() },
    });

    let companyId = user.companyId;
    if (!companyId) {
      const company = await tx.company.findFirst({
        where: { ownerId: userId, deletedAt: null },
      });
      if (company) {
        companyId = company.id;
      }
    }

    if (companyId) {
      await tx.company.update({
        where: { id: companyId },
        data: { deletedAt: new Date() },
      });

      await tx.job.updateMany({
        where: { companyId },
        data: {
          status: 'CLOSED',
          deletedAt: new Date(),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        entityType: 'User',
        entityId: userId,
        action: 'DELETE',
        oldValues: { email: user.email, role: user.role, companyId: user.companyId },
        newValues: { isActive: false, deletedAt: new Date() },
        userId: actor?.userId || null,
      },
    });

    return updatedUser;
  });

  return result;
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
          failedLoginAttempts: true,
          lockedUntil: true,
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
        failedLoginAttempts: u.failedLoginAttempts,
        lockedUntil: u.lockedUntil,
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

  suspendJobSeeker: async (userId: string, actor?: { userId?: string }) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    if (user.role !== 'JOB_SEEKER')
      throw new AppError(httpStatus.BAD_REQUEST, 'User is not a job seeker');
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: userId }, data: { isActive: false } });
      await logAdminAction({
        tx,
        entityType: 'User',
        entityId: userId,
        action: 'SUSPEND',
        oldValues: { isActive: user.isActive },
        newValues: { isActive: false },
        userId: actor?.userId,
      });
      return updated;
    });
  },

  reactivateJobSeeker: async (userId: string, actor?: { userId?: string }) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    if (user.role !== 'JOB_SEEKER')
      throw new AppError(httpStatus.BAD_REQUEST, 'User is not a job seeker');
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: userId }, data: { isActive: true } });
      await logAdminAction({
        tx,
        entityType: 'User',
        entityId: userId,
        action: 'REACTIVATE',
        oldValues: { isActive: user.isActive },
        newValues: { isActive: true },
        userId: actor?.userId,
      });
      return updated;
    });
  },

  deleteJobSeeker: async (userId: string, actor?: { userId?: string }) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    if (user.role !== 'JOB_SEEKER')
      throw new AppError(httpStatus.BAD_REQUEST, 'User is not a job seeker');
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { isActive: false, deletedAt: new Date() },
      });
      await logAdminAction({
        tx,
        entityType: 'User',
        entityId: userId,
        action: 'DELETE',
        oldValues: { email: user.email, role: user.role },
        newValues: { isActive: false, deletedAt: new Date() },
        userId: actor?.userId,
      });
      return updated;
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
    status?: JobStatus;
  }) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;
    const q = query.q?.trim();

    const where: Prisma.JobWhereInput = {
      status: query.status || 'ACTIVE',
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { company: { name: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(query.type ? { jobType: query.type } : {}),
    };

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
        isFeatured: job.isFeatured,
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

  createStaff: async (
    payload: { fullName: string; email: string; role: 'ADMIN' | 'SUPER_ADMIN'; phone?: string },
    actor: AdminActor,
  ) => {
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
        userId: actor.userId || actor.id || null,
      },
    });

    return user;
  },

  setStaffStatus: async (
    userId: string,
    isActive: boolean,
    actor: { id?: string; userId?: string; role: string },
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
    const actorId = actor.userId || actor.id;
    if (userId === actorId && !isActive) {
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
        userId: actorId || null,
      },
    });

    return updated;
  },

  setStaffRole: async (
    userId: string,
    role: 'ADMIN' | 'SUPER_ADMIN',
    actor: { id?: string; userId?: string; role: string },
  ) => {
    if (actor.role !== 'SUPER_ADMIN') {
      throw new AppError(httpStatus.FORBIDDEN, 'Only Super Administrators can change staff roles');
    }

    const actorId = actor.userId || actor.id;
    if (userId === actorId) {
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
        userId: actorId || null,
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
    startDate?: string;
    endDate?: string;
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

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
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

    const totalRevenue =
      (totalRevenueResult as { _sum: { amount: number | null } })?._sum?.amount || 0;
    const totalRevenueLastMonth =
      (totalRevenueLastMonthResult as { _sum: { amount: number | null } })?._sum?.amount || 0;

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

    return jobs.map((j) => ({
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

  updateSystemSettings: async (data: SystemSettingsUpdate, actor?: { userId?: string }) => {
    // Strip id if passed to prevent prisma errors trying to change primary key
    const { maintenanceEstimatedEnd, ...updateData } = data;
    delete (updateData as Record<string, unknown>).id;

    const formattedUpdateData: Record<string, unknown> = { ...updateData };

    if (data.maintenanceMode !== undefined) {
      formattedUpdateData.maintenanceSetAt = data.maintenanceMode ? new Date() : null;
      formattedUpdateData.maintenanceEstimatedEnd =
        data.maintenanceMode && maintenanceEstimatedEnd ? new Date(maintenanceEstimatedEnd) : null;
    } else if (maintenanceEstimatedEnd !== undefined) {
      formattedUpdateData.maintenanceEstimatedEnd = maintenanceEstimatedEnd
        ? new Date(maintenanceEstimatedEnd)
        : null;
    }

    const existing = await prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
    });

    const settings = await prisma.$transaction(async (tx) => {
      const updated = await tx.systemSettings.upsert({
        where: { id: 'singleton' },
        create: {
          id: 'singleton',
          ...formattedUpdateData,
        },
        update: formattedUpdateData,
      });

      await logAdminAction({
        tx,
        entityType: 'SystemSettings',
        entityId: 'singleton',
        action: 'UPDATE',
        oldValues: existing,
        newValues: formattedUpdateData,
        userId: actor?.userId,
      });

      return updated;
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

  getJobReports: async (query: GetJobReportsQuery) => {
    const { page = 1, limit = 10, status, severity, q } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.JobReportWhereInput = {
      ...(status ? { status } : {}),
      ...(severity ? { severity: severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } : {}),
      ...(q
        ? {
            OR: [
              { job: { title: { contains: q, mode: 'insensitive' } } },
              { job: { company: { name: { contains: q, mode: 'insensitive' } } } },
              { reason: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

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
      data: reports.map((r) => ({
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

  updateJobReportStatus: async (reportId: string, status: ReportStatus) => {
    return await prisma.jobReport.update({
      where: { id: reportId },
      data: { status },
    });
  },

  deactivateJob: async (jobId: string, actor?: { userId?: string }) => {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new AppError(httpStatus.NOT_FOUND, 'Job listing not found');
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id: jobId },
        data: { status: 'CLOSED' },
      });
      await logAdminAction({
        tx,
        entityType: 'Job',
        entityId: jobId,
        action: 'DEACTIVATE',
        oldValues: { status: job.status },
        newValues: { status: 'CLOSED' },
        userId: actor?.userId,
      });
      return updated;
    });
  },

  approveJob: async (jobId: string, actor?: { userId?: string }) => {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new AppError(httpStatus.NOT_FOUND, 'Job listing not found');
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id: jobId },
        data: { status: 'ACTIVE' },
      });
      await logAdminAction({
        tx,
        entityType: 'Job',
        entityId: jobId,
        action: 'APPROVE',
        oldValues: { status: job.status },
        newValues: { status: 'ACTIVE' },
        userId: actor?.userId,
      });
      return updated;
    });
  },

  deleteJobListing: async (jobId: string, actor?: { userId?: string }) => {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new AppError(httpStatus.NOT_FOUND, 'Job listing not found');
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id: jobId },
        data: { deletedAt: new Date() },
      });
      await logAdminAction({
        tx,
        entityType: 'Job',
        entityId: jobId,
        action: 'DELETE',
        oldValues: { title: job.title, status: job.status },
        newValues: { deletedAt: new Date() },
        userId: actor?.userId,
      });
      return updated;
    });
  },

  broadcastNotification: async (
    payload: {
      title: string;
      message: string;
      targetAudience: 'all' | 'job-seekers' | 'employers';
    },
    actor: { userId: string },
  ) => {
    const { title, message, targetAudience } = payload;

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(targetAudience === 'job-seekers'
          ? { role: 'JOB_SEEKER' }
          : targetAudience === 'employers'
            ? { role: 'EMPLOYER' }
            : { role: { in: ['JOB_SEEKER', 'EMPLOYER'] } }),
        OR: [
          { notificationPreference: null },
          { notificationPreference: { systemAnnouncements: true } },
        ],
      },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    if (users.length === 0) {
      return { success: true, count: 0 };
    }

    const notifications = users.map((u) => {
      const id = crypto.randomUUID();
      return {
        id,
        userId: u.id,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title,
        message,
        sentVia: ['in_app', 'push', 'email'],
      };
    });

    await prisma.$transaction(async (tx) => {
      await tx.notification.createMany({
        data: notifications.map((n) => ({
          id: n.id,
          userId: n.userId,
          type: n.type,
          title: n.title,
          message: n.message,
          sentVia: n.sentVia,
        })),
      });

      await tx.auditLog.create({
        data: {
          entityType: 'Notification',
          entityId: 'broadcast',
          action: 'BROADCAST',
          newValues: { title, targetAudience, userCount: users.length },
          userId: actor.userId,
        },
      });
    });

    const pushTokens = await prisma.pushToken.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        isActive: true,
      },
      select: {
        userId: true,
        expoPushToken: true,
      },
    });

    if (pushTokens.length > 0) {
      const expo = new Expo();
      const messages: ExpoPushMessage[] = [];
      const ticketMetadata: { notificationId: string; userId: string; pushToken: string }[] = [];

      for (const token of pushTokens) {
        if (!Expo.isExpoPushToken(token.expoPushToken)) continue;
        const userNotification = notifications.find((n) => n.userId === token.userId);
        if (!userNotification) continue;

        messages.push({
          to: token.expoPushToken,
          channelId: 'system',
          sound: 'default',
          title,
          body: message,
          data: {
            type: 'SYSTEM_ANNOUNCEMENT',
            notificationId: userNotification.id,
          },
          badge: 1,
        });

        ticketMetadata.push({
          notificationId: userNotification.id,
          userId: token.userId,
          pushToken: token.expoPushToken,
        });
      }

      if (messages.length > 0) {
        (async () => {
          try {
            const chunks = expo.chunkPushNotifications(messages);
            const tickets: ExpoPushTicket[] = [];

            for (const chunk of chunks) {
              const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
              tickets.push(...chunkTickets);
            }

            const receiptRows = tickets.map((ticket, i) => {
              const meta = ticketMetadata[i];
              return {
                ticketId: ticket.status === 'ok' ? ticket.id : `unknown-${Date.now()}-${i}`,
                notificationId: meta?.notificationId ?? '',
                userId: meta?.userId ?? '',
                pushToken: meta?.pushToken ?? '',
                status: ticket.status === 'ok' ? 'pending' : 'error',
                errorCode: ticket.status === 'error' ? (ticket.details?.error ?? null) : null,
              };
            });

            await prisma.pushReceipt.createMany({ data: receiptRows });
          } catch (err) {
            console.error('[BroadcastPush] Error in dispatch:', err);
          }
        })();
      }
    }

    (async () => {
      const batchSize = 50;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map((u) =>
            sendBroadcastEmail(u.email, u.fullName, title, message).catch((err) =>
              console.error(`[BroadcastEmail] Failed for ${u.email}:`, err),
            ),
          ),
        );
      }
    })();

    return { success: true, count: users.length };
  },

  clearUserLockout: async (userId: string, actor?: { userId?: string }) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      await logAdminAction({
        tx,
        entityType: 'User',
        entityId: userId,
        action: 'CLEAR_LOCKOUT',
        oldValues: {
          failedLoginAttempts: user.failedLoginAttempts,
          lockedUntil: user.lockedUntil,
        },
        newValues: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
        userId: actor?.userId,
      });

      return updated;
    });
  },

  toggleJobFeatured: async (jobId: string, isFeatured: boolean, actor?: { userId?: string }) => {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new AppError(httpStatus.NOT_FOUND, 'Job listing not found');

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id: jobId },
        data: { isFeatured },
      });

      await logAdminAction({
        tx,
        entityType: 'Job',
        entityId: jobId,
        action: 'TOGGLE_FEATURED',
        oldValues: { isFeatured: job.isFeatured },
        newValues: { isFeatured },
        userId: actor?.userId,
      });

      return updated;
    });
  },

  getSecurityMetadata: async () => {
    // ========================= Fetch active refresh token sessions for staff members (ADMIN, SUPER_ADMIN) ========================
    const staffTokens = await prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gte: new Date() },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        },
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeSessions = staffTokens.map((token) => ({
      id: token.id,
      userId: token.userId,
      fullName: token.user.fullName,
      email: token.user.email,
      role: token.user.role,
      ipAddress: token.ipAddress || 'Unknown',
      userAgent: token.userAgent || 'Unknown',
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
    }));

    // ========================= Fetch rate limit status/metadata ========================
    const { checkRedisHealth } = await import('../../../lib/rateLimitStore.js');
    const redisStatus = await checkRedisHealth();

    const rateLimits = {
      global: {
        windowMs: 15 * 60 * 1000,
        limit: 100,
        store: redisStatus === 'UP' ? 'RedisStore' : 'MemoryStore',
        redisStatus,
      },
      auth: {
        windowMs: 15 * 60 * 1000,
        limit: 5,
        store: redisStatus === 'UP' ? 'RedisStore' : 'MemoryStore',
        redisStatus,
      },
    };

    return {
      activeSessions,
      rateLimits,
    };
  },

  getSystemMetrics: async (): Promise<SystemMetrics> => {
    // ========================= Calculate Event Loop Lag ========================
    const start = Date.now();
    const eventLoopLagMs = await new Promise<number>((resolve) => {
      setTimeout(() => {
        resolve(Math.max(0, Date.now() - start));
      }, 0);
    });

    // ========================= DB Health & Latency check ========================
    const dbStart = Date.now();
    let dbStatus: 'UP' | 'DOWN' = 'UP';
    let dbLatencyMs = 0;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
    } catch {
      dbStatus = 'DOWN';
    }

    // ========================= Redis Health check ========================
    const { checkRedisHealth } = await import('../../../lib/rateLimitStore.js');
    const redisStatus = await checkRedisHealth();

    // ========================= System Resources ========================
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memRatio = Math.round((usedMem / totalMem) * 1000) / 10;

    const processHeap = process.memoryUsage();

    // Node exposes internal handle/request counts via private APIs — typed explicitly
    // to avoid unsafe `any` while acknowledging these are undocumented internals.
    interface NodeProcessInternals {
      _getActiveHandles?: () => unknown[];
      _getActiveRequests?: () => unknown[];
    }
    const proc = process as typeof process & NodeProcessInternals;
    const activeHandles =
      typeof proc._getActiveHandles === 'function' ? proc._getActiveHandles().length : 0;
    const activeRequests =
      typeof proc._getActiveRequests === 'function' ? proc._getActiveRequests().length : 0;

    return {
      server: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: os.uptime(),
        processUptime: process.uptime(),
        pid: process.pid,
        currentTime: new Date().toISOString(),
      },
      resources: {
        cpuLoad: os.loadavg(),
        memory: {
          total: totalMem,
          free: freeMem,
          used: usedMem,
          ratio: memRatio,
          processHeap: {
            rss: processHeap.rss,
            heapTotal: processHeap.heapTotal,
            heapUsed: processHeap.heapUsed,
            external: processHeap.external,
          },
        },
      },
      performance: {
        eventLoopLagMs,
        activeHandles,
        activeRequests,
      },
      dependencies: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        redis: {
          status: redisStatus === 'UP' ? 'UP' : 'DOWN',
          store: redisStatus === 'UP' ? 'RedisStore' : 'MemoryStore',
        },
      },
    };
  },
};

export default adminService;
