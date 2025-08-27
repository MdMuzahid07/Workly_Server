import httpStatus from "http-status";
import type { Profile } from "../../../generated/prisma/index.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";
import type { IPreference, IProfile, ISkill } from "./profile.interface.js";

const createProfile = async (payload: IProfile) => {
  const isUserExits = await prisma.user.findUnique({
    where: {
      id: payload.userId,
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

    await transactor.user.update({
      where: {
        id: payload.userId,
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

    if (payload.skills?.length) {
      await transactor.skill.updateMany({
        where: {
          profileId: userProfile.id,
        },
        data: payload.skills?.map((skill: ISkill) => ({
          skillName: skill.skillName,
          profileId: userProfile.id,
          experienceYears: skill.experienceYears,
        })),
      });
    }

    if (payload.preference) {
      await transactor.preference.update({
        where: {
          profileId: userProfile.id,
        },
        data: {
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
