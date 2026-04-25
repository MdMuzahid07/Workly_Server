import httpStatus from "http-status";
import type { Profile } from "../../../generated/prisma/index.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";
import type { IPreference, IProfile, ISkill } from "./profile.interface.js";

const createProfile = async (userId: string, payload: IProfile) => {
  const isUserExits = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!isUserExits || !isUserExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found to create profile`);
  }

  if (isUserExits && !isUserExits?.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not verified`);
  }

  const isProfileExists = await prisma.profile.findUnique({
    where: {
      userId: userId,
    },
  });

  if (isProfileExists) {
    throw new AppError(httpStatus.BAD_REQUEST, `User already has a profile`);
  }

  const result = await prisma.$transaction(async (transactor) => {
    const userProfile = await transactor.profile.create({
      data: {
        userId: userId,
        bio: payload.bio || "",
        location: payload.location || "",
        avatarUrl: payload.avatarUrl || "",
        coverUrl: payload.coverUrl || "",
        resumeUrl: payload.resumeUrl || "",
        linkedInUrl: payload.linkedInUrl || "",
        websiteUrl: payload.websiteUrl || "",
      },
    });

    await transactor.user.update({
      where: {
        id: userId,
      },
      data: {
        profileId: userProfile.id,
      },
    });

    if (payload.skills?.length) {
      await transactor.skill.createMany({
        data: payload.skills?.map((skill: ISkill) => ({
          skillName: skill.skillName,
          profileId: userProfile.id,
          experienceYears: skill.experienceYears,
        })),
      });
    }

    if (payload.preference) {
      await transactor.preference.create({
        data: {
          profileId: userProfile.id,
          jobType: payload.preference.jobType || "FULL_TIME",
          expectedSalary: payload.preference.expectedSalary || 0,
          preferredLocation: payload.preference.preferredLocation || "",
          remoteWork: payload.preference.remoteWork || false,
          industry: payload.preference.industry || "",
          workExperience: payload.preference.workExperience || "",
        },
      });
    }

    return userProfile;
  });

  return result;
};

const myProfile = async (userId: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const result = await prisma.user.findUnique({
    where: {
      id: userId,
      isActive: true,
      deletedAt: null,
      isVerified: true,
    },
    include: {
      profile: {
        include: {
          skills: true,
          preference: true,
          education: true,
          workExperiences: true,
          certifications: true,
        },
      },
      company: true,
      jobsPosted: true,
      applications: true,
      savedJobs: true,
      resumes: true,
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Profile not found");
  }

  const { passwordHash, ...rest } = result;

  return rest;
};

const updateMyProfile = async (
  userId: string,
  payload: Profile & { skills: ISkill[]; preference: IPreference; phone?: string },
) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const isUserExits = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!isUserExits || !isUserExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found to update profile`);
  }

  if (isUserExits && !isUserExits?.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not verified`);
  }

  const result = await prisma.$transaction(async (transactor) => {
    if (payload.phone !== undefined) {
      await transactor.user.update({
        where: {
          id: userId,
        },
        data: {
          phone: payload.phone,
        },
      });
    }

    const userProfile = await transactor.profile.upsert({
      where: {
        userId: userId,
      },
      update: {
        bio: payload.bio || "",
        location: payload.location || "",
        avatarUrl: payload.avatarUrl || "",
        coverUrl: payload.coverUrl || "",
        resumeUrl: payload.resumeUrl || "",
        linkedInUrl: payload.linkedInUrl || "",
        websiteUrl: payload.websiteUrl || "",
        headline: payload.headline ?? undefined,
        totalExperienceYears: payload.totalExperienceYears ?? undefined,
      },
      create: {
        userId: userId,
        bio: payload.bio || "",
        location: payload.location || "",
        avatarUrl: payload.avatarUrl || "",
        coverUrl: payload.coverUrl || "",
        resumeUrl: payload.resumeUrl || "",
        linkedInUrl: payload.linkedInUrl || "",
        websiteUrl: payload.websiteUrl || "",
        headline: payload.headline ?? undefined,
        totalExperienceYears: payload.totalExperienceYears ?? undefined,
      },
    });

    if (!isUserExits.profileId) {
      await transactor.user.update({
        where: {
          id: userId,
        },
        data: {
          profileId: userProfile.id,
        },
      });
    }

    if (payload.skills !== undefined && payload.skills.length > 0) {
      const currentSkillIds = payload.skills
        .filter((skill): skill is ISkill & { id: string } => !!skill.id)
        .map((skill: ISkill) => skill.id);

      await transactor.skill.deleteMany({
        where: {
          profileId: userProfile.id,
          NOT: {
            id: {
              in: currentSkillIds,
            },
          },
        },
      });

      for (const skill of payload.skills) {
        if (skill.id) {
          await transactor.skill.upsert({
            where: {
              id: skill.id,
            },
            update: {
              skillName: skill.skillName,
              experienceYears: skill.experienceYears,
            },
            create: {
              skillName: skill.skillName,
              experienceYears: skill.experienceYears,
              profileId: userProfile.id,
            },
          });
        } else {
          await transactor.skill.create({
            data: {
              skillName: skill.skillName,
              experienceYears: skill.experienceYears,
              profileId: userProfile.id,
            },
          });
        }
      }
    }

    if (payload.preference) {
      await transactor.preference.upsert({
        where: {
          profileId: userProfile.id,
        },
        update: {
          jobType: payload.preference.jobType || "FULL_TIME",
          expectedSalary: payload.preference.expectedSalary || 0,
          preferredLocation: payload.preference.preferredLocation || "",
          remoteWork: payload.preference.remoteWork || false,
          industry: payload.preference.industry || "",
          workExperience: payload.preference.workExperience || "",
        },
        create: {
          profileId: userProfile.id,
          jobType: payload.preference.jobType || "FULL_TIME",
          expectedSalary: payload.preference.expectedSalary || 0,
          preferredLocation: payload.preference.preferredLocation || "",
          remoteWork: payload.preference.remoteWork || false,
          industry: payload.preference.industry || "",
          workExperience: payload.preference.workExperience || "",
        },
      });
    }

    return userProfile;
  });

  return result;
};

const saveJobs = async (userId: string, jobId: string) => {
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

  const jobExists = await prisma.job.findUnique({
    where: {
      id: jobId,
      status: "ACTIVE",
      deletedAt: null,
    },
  });

  if (!jobExists) {
    throw new AppError(httpStatus.NOT_FOUND, "Job not found");
  }

  const existingSavedJob = await prisma.savedJob.findUnique({
    where: {
      userId_jobId: {
        userId: userId,
        jobId: jobId,
      },
    },
  });

  if (existingSavedJob) {
    await prisma.savedJob.delete({
      where: {
        userId_jobId: {
          userId: userId,
          jobId: jobId,
        },
      },
    });

    return {
      action: "unsaved",
      message: "Job removed from saved jobs",
      savedJob: null,
    };
  } else {
    const result = await prisma.savedJob.create({
      data: {
        userId: userId,
        jobId: jobId,
      },
      include: {
        job: {
          include: {
            company: true,
            JobSkill: true,
          },
        },
      },
    });

    return {
      action: "saved",
      message: "Job saved successfully",
      savedJob: result,
    };
  }
};

const getSavedJobs = async (userId: string, query: any = {}) => {
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

  const { page = 1, limit = 10, folderName } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const whereClause: any = {
    userId: userId,
    job: {
      isActive: true,
      deletedAt: null,
    },
  };

  if (folderName) {
    whereClause.folderName = folderName;
  }

  const [savedJobs, total] = await Promise.all([
    prisma.savedJob.findMany({
      where: whereClause,
      include: {
        job: {
          include: {
            company: true,
            JobSkill: true,
            postedBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
      skip,
      take: Number(limit),
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.savedJob.count({
      where: whereClause,
    }),
  ]);

  return {
    savedJobs,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const updateSavedJob = async (
  userId: string,
  jobId: string,
  payload: { folderName?: string; notes?: string },
) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  if (!jobId) {
    throw new Error("Job ID is required");
  }

  const isUserExits = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!isUserExits || !isUserExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found`);
  }

  const savedJob = await prisma.savedJob.findUnique({
    where: {
      userId_jobId: {
        userId: userId,
        jobId: jobId,
      },
    },
  });

  if (!savedJob) {
    throw new AppError(httpStatus.NOT_FOUND, "Saved job not found");
  }

  const updateData: any = {};
  if (payload.folderName !== undefined) {
    updateData.folderName = payload.folderName;
  }
  if (payload.notes !== undefined) {
    updateData.notes = payload.notes;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "No valid fields provided. Please provide 'folderName' or 'notes' to update.",
    );
  }

  const result = await prisma.savedJob.update({
    where: {
      userId_jobId: {
        userId: userId,
        jobId: jobId,
      },
    },
    data: updateData,
    include: {
      job: {
        include: {
          company: true,
          JobSkill: true,
        },
      },
    },
  });

  return result;
};

//****  for employee (saved profiles) ==========================> ****//

const profileService = {
  createProfile,
  myProfile,
  updateMyProfile,
  saveJobs,
  getSavedJobs,
  updateSavedJob,
};

export default profileService;
