import httpStatus from "http-status";
import { type Job, type JobSkill } from "../../../generated/prisma/index.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const createJob = async (userId: string, payload: Job & { skillsRequired: JobSkill[] }) => {
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

  const { skillsRequired, ...rest } = payload;

  const result = await prisma.$transaction(async (transactor) => {
    const job = await transactor.job.create({
      data: {
        ...rest,
        postedById: userId,
        companyId: rest.companyId,
      },
    });

    if (skillsRequired && skillsRequired.length > 0) {
      await transactor.jobSkill.createMany({
        data: skillsRequired.map((skill) => ({
          jobId: job.id,
          skillId: skill.id,
          experienceYears: skill.experienceYears,
          skillName: skill.skillName,
          isRequired: skill.isRequired,
          priority: skill.priority,
          description: skill.description,
        })),
      });
    }

    const updatedJob = await transactor.job.findUnique({
      where: {
        id: job.id,
      },
      include: {
        skillsRequired: true,
        postedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        company: true,
      },
    });

    return updatedJob;
  });

  return result;
};

const jobService = {
  createJob,
};

export default jobService;
