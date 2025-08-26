import httpStatus from "http-status";
import type { Profile } from "../../../generated/prisma/index.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const createProfile = async (payload: Profile) => {
  const isUserExits = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
  });

  if (!isUserExits || !isUserExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found to create profile`);
  }

  const profile = await prisma.profile.create({
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

  if (!profile) {
    throw new AppError(httpStatus.BAD_REQUEST, "Failed to create profile");
  }

  return profile;
};

const profileService = {
  createProfile,
};
export default profileService;
