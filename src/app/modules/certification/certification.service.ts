import httpStatus from "http-status";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const addCertification = async (userId: string, data: any) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, "Profile not found");

  return prisma.certification.create({
    data: {
      ...data,
      profileId: profile.id,
      issueDate: data.issueDate ? new Date(data.issueDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
    },
  });
};

const updateCertification = async (userId: string, certificationId: string, data: any) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, "Profile not found");

  const certification = await prisma.certification.findFirst({
    where: { id: certificationId, profileId: profile.id },
  });
  if (!certification) throw new AppError(httpStatus.NOT_FOUND, "Certification not found");

  return prisma.certification.update({
    where: { id: certificationId },
    data: {
      ...data,
      issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
    },
  });
};

const deleteCertification = async (userId: string, certificationId: string) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, "Profile not found");

  const certification = await prisma.certification.findFirst({
    where: { id: certificationId, profileId: profile.id },
  });
  if (!certification) throw new AppError(httpStatus.NOT_FOUND, "Certification not found");

  await prisma.certification.delete({ where: { id: certificationId } });
  return { success: true };
};

export const certificationService = { addCertification, updateCertification, deleteCertification };
