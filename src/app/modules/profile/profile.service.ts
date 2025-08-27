import httpStatus from "http-status";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";
import type { IProfile, ISkill } from "./profile.interface.js";

const createProfile = async (payload: IProfile) => {
  const isUserExits = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
  });

  if (!isUserExits || !isUserExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found to create profile`);
  }

  const isProfileExists = await prisma.profile.findUnique({
    where: {
      userId: payload.userId,
    },
  });

  if (isProfileExists) {
    throw new AppError(httpStatus.BAD_REQUEST, `User already has a profile`);
  }

  const result = await prisma.$transaction(async (transactor) => {
    const userProfile = await transactor.profile.create({
      data: {
        userId: payload.userId,
        bio: payload.bio || "",
        location: payload.location || "",
        avatarUrl: payload.avatarUrl || "",
        coverUrl: payload.coverUrl || "",
        resumeUrl: payload.resumeUrl || "",
        linkedInUrl: payload.linkedInUrl || "",
        websiteUrl: payload.websiteUrl || "",
      },
    });

    if (!userProfile) {
      throw new AppError(httpStatus.BAD_REQUEST, "Failed to create profile");
    }

    let skillSet;
    if (payload.skills?.length) {
      skillSet = await transactor.skill.createMany({
        data: payload.skills?.map((skill: ISkill) => ({
          skillName: skill.skillName,
          profileId: userProfile.id,
          experienceYears: skill.experienceYears,
        })),
      });

      if (!skillSet) {
        throw new AppError(httpStatus.BAD_REQUEST, "Failed to create profile");
      }
    }

    let userPreference;
    if (payload.preference) {
      userPreference = await transactor.preference.create({
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
    if (!userPreference) {
      throw new AppError(httpStatus.BAD_REQUEST, "Failed to create profile");
    }

    return { userProfile, skillSet, userPreference };
  });

  return result;
};

const profileService = {
  createProfile,
};

export default profileService;
