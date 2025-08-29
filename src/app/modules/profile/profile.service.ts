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
    },
    include: {
      profile: {
        include: {
          skills: true,
          preference: true,
        },
      },
      company: true,
      jobsPosted: true,
      applications: true,
      savedJobs: true,
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Profile not found");
  }

  return result;
};

const updateMyProfile = async (
  userId: string,
  payload: Profile & { skills: ISkill[]; preference: IPreference },
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
    const userProfile = await transactor.profile.update({
      where: {
        userId: userId,
      },
      data: {
        bio: payload.bio || "",
        location: payload.location || "",
        avatarUrl: payload.avatarUrl || "",
        coverUrl: payload.coverUrl || "",
        resumeUrl: payload.resumeUrl || "",
        linkedInUrl: payload.linkedInUrl || "",
        websiteUrl: payload.websiteUrl || "",
      },
    });

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

const profileService = {
  createProfile,
  myProfile,
  updateMyProfile,
};

export default profileService;
