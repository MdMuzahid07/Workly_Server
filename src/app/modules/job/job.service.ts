import httpStatus from "http-status";
import { type Job, type JobSkill } from "../../../generated/prisma/index.js";
import factoryFunctions from "../../../utils/FactoryFunctionsWithFilterEngine.js";
import generateUniqueSlug from "../../../utils/generateUniqueSlug.js";
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

  const allowedRoles = ["ADMIN", "EMPLOYER", "SUPER_ADMIN"];
  if (!allowedRoles.includes(isUserExits.role)) {
    throw new AppError(httpStatus.FORBIDDEN, "Only employers and admins can create jobs");
  }

  if (isUserExits.role !== "SUPER_ADMIN") {
    if (!isUserExits.company || isUserExits.companyId !== payload.companyId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You are not authorized to post jobs for this company",
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
    where: { jobType: payload.jobType, title: payload.title, companyId: payload.companyId },
  });

  if (existingJob) {
    throw new AppError(httpStatus.CONFLICT, "This job is already posted for this company");
  }

  const { skillsRequired, ...rest } = payload;

  const slug = await generateUniqueSlug(payload.title, "job");

  const result = await prisma.$transaction(async (transactor) => {
    const job = await transactor.job.create({
      data: {
        ...rest,
        postedById: userId,
        companyId: rest.companyId,
        slug,
      },
    });

    if (skillsRequired && skillsRequired.length > 0) {
      await transactor.jobSkill.createMany({
        data: skillsRequired.map((skill) => ({
          jobId: job.id,
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
        JobSkill: true,
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

const getJobs = async (query: any) => {
  const jobFilter = factoryFunctions.createJobFilter(prisma);
  const { where, orderBy, skip, take, pagination } = await jobFilter.filter(query);

  if (query.skills && query.skills.length > 0) {
    where.JobSkill = {
      some: {
        skillName: { in: query.skills, mode: "insensitive" },
      },
    };
  }

  const result = await prisma.job.findMany({
    where,
    orderBy,
    skip,
    take,
    include: {
      JobSkill: true,
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

  return { data: result, meta: pagination };
};

const getJobById = async (jobId: string) => {
  const result = await prisma.job.findUnique({
    where: {
      id: jobId,
    },
    include: {
      JobSkill: true,
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

  return result;
};

const updateJob = async (
  userId: string,
  jobId: string,
  payload: Job & { skillsRequired: JobSkill[] },
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  if (!user || !user.isActive || !user.isVerified) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not authorized");
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId, deletedAt: null },
    include: { company: true },
  });

  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, "Job not found");
  }

  const isUserCanUpdate = job.postedById === userId || user.companyId === job.companyId;

  if (!isUserCanUpdate) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to update this job");
  }

  const { skillsRequired, ...jobData } = payload;

  const result = await prisma.$transaction(async (transactor) => {
    await transactor.job.update({
      where: { id: jobId },
      data: {
        ...jobData,
        updatedAt: new Date(),
      },
    });

    if (skillsRequired !== undefined && skillsRequired.length >= 0) {
      const currentSkillIds = skillsRequired
        .filter((skill): skill is JobSkill & { id: string } => !!skill.id)
        .map((skill: JobSkill) => skill.id);

      await transactor.jobSkill.deleteMany({
        where: {
          jobId,
          NOT: {
            id: {
              in: currentSkillIds,
            },
          },
        },
      });

      for (const skill of skillsRequired) {
        if (skill.id) {
          await transactor.jobSkill.upsert({
            where: {
              id: skill.id,
            },
            update: {
              skillName: skill.skillName,
              experienceYears: skill.experienceYears,
              isRequired: skill.isRequired ?? true,
              priority: skill.priority ?? "HIGH",
              description: skill.description,
            },
            create: {
              jobId,
              skillName: skill.skillName,
              experienceYears: skill.experienceYears,
              isRequired: skill.isRequired ?? true,
              priority: skill.priority ?? "HIGH",
              description: skill.description,
            },
          });
        } else {
          await transactor.jobSkill.create({
            data: {
              jobId,
              skillName: skill.skillName,
              experienceYears: skill.experienceYears,
              isRequired: skill.isRequired ?? true,
              priority: skill.priority ?? "HIGH",
              description: skill.description,
            },
          });
        }
      }
    }

    return transactor.job.findUnique({
      where: { id: jobId },
      include: {
        JobSkill: true,
        company: true,
        postedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  });

  return result;
};

const deleteJob = async (userId: string, jobId: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const isUserExits = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!isUserExits || !isUserExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found`);
  }

  if (isUserExits && !isUserExits?.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not verified`);
  }

  const isJobExists = await prisma.job.findUnique({
    where: {
      id: jobId,
      deletedAt: null,
    },
  });

  if (!isJobExists) {
    throw new AppError(httpStatus.NOT_FOUND, "Job not found");
  }

  if (isJobExists.postedById !== userId && isJobExists.companyId !== isUserExits.companyId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to delete this job");
  }

  if (isJobExists?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, "Job is active, cannot delete");
  }

  const result = await prisma.job.update({
    where: {
      id: jobId,
    },
    data: {
      deletedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return result;
};

const jobService = {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
};

export default jobService;
