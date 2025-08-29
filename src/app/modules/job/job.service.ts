import httpStatus from "http-status";
import { type Job } from "../../../generated/prisma/index.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const createJob = async (userId: string, payload: Job) => {
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
    throw new AppError(httpStatus.BAD_REQUEST, `User not found to create a job`);
  }

  if (isUserExits && !isUserExits?.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not verified`);
  }

  if (isUserExits.role !== "ADMIN" && isUserExits.role !== "EMPLOYER") {
    throw new AppError(httpStatus.FORBIDDEN, "Only employers and admins can create jobs");
  }

  if (isUserExits.role === "EMPLOYER" || isUserExits.role === "ADMIN") {
    if (!isUserExits.companyId || isUserExits.companyId !== payload.companyId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You are not authorized to create jobs for this company",
      );
    }
  }

  const isCompanyExists = await prisma.company.findUnique({
    where: {
      id: payload.companyId,
      isVerified: true,
      deletedAt: null,
    },
  });

  if (!isCompanyExists) {
    throw new AppError(httpStatus.BAD_REQUEST, "Company not found or not verified");
  }

  const existingJob = await prisma.job.findFirst({
    where: { jobType: payload.jobType, title: payload.title },
  });

  if (existingJob) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A job with this title already exists. Please choose a different title.",
    );
  }

  const result = await prisma.job.create({
    data: {
      ...payload,
      postedById: userId,
      companyId: payload.companyId,
    },
  });

  return result;
};

const jobService = {
  createJob,
};

export default jobService;
