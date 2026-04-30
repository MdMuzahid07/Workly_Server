import httpStatus from "http-status";
import factoryFunctions from "../../../utils/FactoryFunctionsWithFilterEngine.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

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

  const job = await prisma.job.findFirst({
    where: {
      id: payload.jobId,
      status: "ACTIVE",
      deletedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!job) {
    throw new AppError(httpStatus.BAD_REQUEST, "Job not found, inactive, or expired");
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

  if (job.maxApplications) {
    const applicationCount = await prisma.application.count({
      where: { jobId: payload.jobId },
    });

    if (applicationCount >= job.maxApplications) {
      throw new AppError(httpStatus.BAD_REQUEST, "This job has reached maximum applications");
    }
  }

  // try {
  const result = await prisma.application.create({
    data: {
      jobId: payload.jobId,
      applicantId: userId,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      resumeUrl: payload.resumeFile, // Map frontend resumeFile to resumeUrl
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
          company: { select: { id: true, name: true, logoUrl: true } },
        },
      },
      applicant: { select: { id: true, fullName: true, email: true } },
    },
  });

  return { data, meta: pagination };
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

const getJobApplications = async (employerId: string, jobId: string, query: any) => {
  if (!employerId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  await assertEmployerOwnsJob(employerId, jobId);

  const applicationFilter = factoryFunctions.createApplicationFilter(prisma);
  const filterOptions: any = {
    where: { jobId },
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 10,
    sortBy: query.sortBy || "createdAt",
    sortOrder: (query.sortOrder as "asc" | "desc") || "desc",
  };

  if (query.status) {
    filterOptions.where.status = query.status;
  }

  if (query.q) {
    filterOptions.search = query.q;
    filterOptions.searchIn = ["applicant.fullName", "applicant.email"];
  }

  const { where, orderBy, skip, take, pagination } = await applicationFilter.filter(filterOptions);

  const data = await prisma.application.findMany({
    where,
    orderBy,
    skip,
    take,
    include: {
      applicant: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          profile: { select: { skills: true, preference: true } },
        },
      },
    },
  });

  return { data, meta: pagination };
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

  const employer = await prisma.user.findUnique({
    where: { id: employerId, isActive: true },
    select: { companyId: true, role: true },
  });

  if (!employer || !employer.companyId) {
    throw new AppError(httpStatus.FORBIDDEN, "Not authorized or no company associated");
  }

  const applicationFilter = factoryFunctions.createApplicationFilter(prisma);
  const filterOptions: any = {
    where: {
      job: {
        companyId: employer.companyId,
      },
      deletedAt: null,
    },
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 10,
    sortBy: query.sortBy || "createdAt",
    sortOrder: (query.sortOrder as "asc" | "desc") || "desc",
  };

  if (query.status) {
    filterOptions.where.status = query.status;
  }

  if (query.jobId) {
    filterOptions.where.jobId = query.jobId;
  }

  if (query.q) {
    filterOptions.search = query.q;
    filterOptions.searchIn = ["applicant.fullName", "applicant.email"];
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
        },
      },
      applicant: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          profile: { select: { skills: true, preference: true } },
        },
      },
    },
  });

  return { data, meta: pagination };
};

const applicationService = {
  createApplication,
  getMyApplications,
  getJobApplications,
  getMyCompanyApplications,
  getApplicationById,
  updateStatus,
  withdraw,
  scheduleInterview,
  updateNotes,
  getJobSummary,
};

export default applicationService;
