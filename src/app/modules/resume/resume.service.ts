import type { Response } from "express";
import httpStatus from "http-status";
import { streamPdfToClient } from "../../../services/file/fileStream.service.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";
import { uploadBufferToCloudinary } from "../upload/upload.service.js";

const listResumes = async (userId: string) => {
  return prisma.resume.findMany({ where: { userId }, orderBy: { uploadDate: "desc" } });
};

const uploadResume = async (userId: string, file: Express.Multer.File, isDefault?: boolean) => {
  let fileUrl = (file as any).path;

  if (!fileUrl && file.buffer) {
    const { secure_url } = await uploadBufferToCloudinary(file.buffer, {
      folder: "workly-job/resumes",
      mimetype: file.mimetype,
    });
    fileUrl = secure_url;
  }

  if (!fileUrl) {
    throw new Error("Failed to upload resume to Cloudinary");
  }

  // Premium validation
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true },
  });

  if (!user?.isPremium) {
    const resumeCount = await prisma.resume.count({ where: { userId } });
    if (resumeCount >= 1) {
      throw new Error(
        "Free users can only maintain one resume version. Upgrade to Premium for unlimited uploads!",
      );
    }
  }

  const resume = await prisma.resume.create({
    data: {
      userId,
      fileName: file.originalname,
      fileUrl,
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

const streamResumeFile = async (userId: string, resumeId: string, res: Response) => {
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId, deletedAt: null },
  });

  if (!resume) {
    throw new AppError(httpStatus.NOT_FOUND, "Resume not found");
  }

  await streamPdfToClient({
    res,
    fileUrl: resume.fileUrl,
    filename: resume.fileName,
  });
};

export const resumeService = {
  listResumes,
  uploadResume,
  setDefaultResume,
  deleteResume,
  streamResumeFile,
};
