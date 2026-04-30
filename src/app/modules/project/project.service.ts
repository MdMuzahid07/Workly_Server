import httpStatus from "http-status";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const addProject = async (userId: string, data: any) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, "Profile not found");

  return prisma.project.create({
    data: {
      ...data,
      profileId: profile.id,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });
};

const updateProject = async (userId: string, projectId: string, data: any) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, "Profile not found");

  const project = await prisma.project.findFirst({
    where: { id: projectId, profileId: profile.id },
  });
  if (!project) throw new AppError(httpStatus.NOT_FOUND, "Project not found");

  return prisma.project.update({
    where: { id: projectId },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
};

const deleteProject = async (userId: string, projectId: string) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, "Profile not found");

  const project = await prisma.project.findFirst({
    where: { id: projectId, profileId: profile.id },
  });
  if (!project) throw new AppError(httpStatus.NOT_FOUND, "Project not found");

  await prisma.project.delete({ where: { id: projectId } });
  return { success: true };
};

export const projectService = { addProject, updateProject, deleteProject };
