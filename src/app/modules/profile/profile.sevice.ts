import httpStatus from "http-status";
import type { Profile, Skill } from "../../../generated/prisma/index.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const createProfile = async (payload: Profile & { skills?: Skill[] }) => {
  const isUserExits = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
  });

  if (!isUserExits || !isUserExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found to create profile`);
  }

  const result = await prisma.$transaction(async (transactor) => {
    const userProfile = await transactor.profile.create({
      data: {
        userId: payload.userId,
        bio: payload.bio,
        location: payload.location,
        avatarUrl: payload.avatarUrl,
        coverUrl: payload.coverUrl,
        resumeUrl: payload.resumeUrl,
        linkedInUrl: payload.linkedInUrl,
        websiteUrl: payload.websiteUrl,
      },
    });

    if (!userProfile) {
      throw new AppError(httpStatus.BAD_REQUEST, "Failed to create profile");
    }

    if (payload.skills?.length) {
      const skillSet = await transactor.skill.createMany({
        data: payload.skills?.map((skill: Skill) => ({
          skillName: skill.skillName,
          profileId: userProfile.id,
          experienceYears: skill.experienceYears,
        })),
      });

      if (!skillSet) {
        throw new AppError(httpStatus.BAD_REQUEST, "Failed to create profile");
      }
    }

    return userProfile;
  });

  return result;
};

const profileService = {
  createProfile,
};

export default profileService;
