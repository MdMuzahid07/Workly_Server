import httpStatus from "http-status";
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

  const job = await prisma.job.findUnique({
    where: {
      id: payload.jobId,
      isActive: true,
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

  const result = await prisma.application.create({
    data: {
      jobId: payload.jobId,
      applicantId: userId,
      coverLetter: payload.coverLetter,
      preferredContactMethod: payload.preferredContactMethod || "email",
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

const applicationService = {
  createApplication,
};

export default applicationService;
