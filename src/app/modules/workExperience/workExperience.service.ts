import httpStatus from "http-status";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const addWorkExperience = async (userId: string, data: any) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, "Profile not found");

  return prisma.workExperience.create({
    data: {
      ...data,
      profileId: profile.id,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });
};

const updateWorkExperience = async (userId: string, experienceId: string, data: any) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, "Profile not found");

  const experience = await prisma.workExperience.findFirst({
    where: { id: experienceId, profileId: profile.id },
  });
  if (!experience) throw new AppError(httpStatus.NOT_FOUND, "Work experience entry not found");

  return prisma.workExperience.update({
    where: { id: experienceId },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
};

const deleteWorkExperience = async (userId: string, experienceId: string) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, "Profile not found");

  const experience = await prisma.workExperience.findFirst({
    where: { id: experienceId, profileId: profile.id },
  });
  if (!experience) throw new AppError(httpStatus.NOT_FOUND, "Work experience entry not found");

  await prisma.workExperience.delete({ where: { id: experienceId } });
  return { success: true };
};

export const workExperienceService = {
  addWorkExperience,
  updateWorkExperience,
  deleteWorkExperience,
};
