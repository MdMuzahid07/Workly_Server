import httpStatus from "http-status";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const followCompany = async (userId: string, companyId: string) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId, deletedAt: null },
  });

  if (!company) {
    throw new AppError(httpStatus.NOT_FOUND, "Company not found");
  }

  const existingFollow = await prisma.follow.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  if (existingFollow) {
    throw new AppError(httpStatus.BAD_REQUEST, "Already following this company");
  }

  const result = await prisma.follow.create({
    data: {
      userId,
      companyId,
    },
    include: {
      company: true,
    },
  });

  return result;
};

const unfollowCompany = async (userId: string, companyId: string) => {
  const existingFollow = await prisma.follow.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  if (!existingFollow) {
    throw new AppError(httpStatus.NOT_FOUND, "You are not following this company");
  }

  await prisma.follow.delete({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  return { message: "Unfollowed successfully" };
};

const getFollowedCompanies = async (userId: string) => {
  const followedCompanies = await prisma.follow.findMany({
    where: { userId },
    include: {
      company: {
        include: {
          industry: true,
          _count: {
            select: {
              jobs: {
                where: {
                  status: "ACTIVE",
                  deletedAt: null,
                  expiresAt: { gt: new Date() },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      followedAt: "desc",
    },
  });

  return followedCompanies;
};

const isFollowing = async (userId: string, companyId: string) => {
  const follow = await prisma.follow.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  return !!follow;
};

export const followService = {
  followCompany,
  unfollowCompany,
  getFollowedCompanies,
  isFollowing,
};
