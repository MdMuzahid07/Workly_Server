// resume.service.ts
import prisma from "../../../utils/prismaClient.js";

const listResumes = async (userId: string) => {
  return prisma.resume.findMany({ where: { userId } });
};

const uploadResume = async (userId: string, file: Express.Multer.File, isDefault?: boolean) => {
  // Assuming file is already uploaded to Cloudinary and URL is available
  const resume = await prisma.resume.create({
    data: {
      userId,
      fileName: file.originalname,
      fileUrl: file.path, // Cloudinary URL
      fileSize: file.size,
      isDefault: isDefault || false,
    },
  });
  if (isDefault) {
    await prisma.resume.updateMany({
      where: { userId, id: { not: resume.id } },
      data: { isDefault: false },
    });
  }
  return resume;
};

const setDefaultResume = async (userId: string, resumeId: string) => {
  await prisma.$transaction([
    prisma.resume.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.resume.update({ where: { id: resumeId, userId }, data: { isDefault: true } }),
  ]);
  return { success: true };
};

const deleteResume = async (userId: string, resumeId: string) => {
  await prisma.resume.delete({ where: { id: resumeId, userId } });
  return { success: true };
};

export const resumeService = { listResumes, uploadResume, setDefaultResume, deleteResume };
