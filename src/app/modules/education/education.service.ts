import httpStatus from "http-status";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const addEducation = async (userId: string, data: any) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, "Profile not found");
  return prisma.education.create({
    data: { ...data, profileId: profile.id },
  });
};

const updateEducation = async (userId: string, educationId: string, data: any) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, "Profile not found");
  const education = await prisma.education.findFirst({
    where: { id: educationId, profileId: profile.id },
  });
  if (!education) throw new AppError(httpStatus.NOT_FOUND, "Education entry not found");
  return prisma.education.update({
    where: { id: educationId },
    data,
  });
};

const deleteEducation = async (userId: string, educationId: string) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, "Profile not found");
  const education = await prisma.education.findFirst({
    where: { id: educationId, profileId: profile.id },
  });
  if (!education) throw new AppError(httpStatus.NOT_FOUND, "Education entry not found");
  await prisma.education.delete({ where: { id: educationId } });
  return { success: true };
};

export const educationService = { addEducation, updateEducation, deleteEducation };
