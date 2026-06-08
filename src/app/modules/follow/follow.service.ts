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

const getFollowedCompanies = async (userId: string, query: any = {}) => {
  const { search, industry } = query;

  // 1. Get all user follows to find the full list of industries followed
  const allFollows = await prisma.follow.findMany({
    where: { userId },
    select: {
      company: {
        select: {
          industry: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const uniqueIndustries = Array.from(
    new Set(allFollows.map((f) => f.company.industry?.name).filter(Boolean)),
  ) as string[];

  // 2. Query with filters
  const whereClause: any = {
    userId,
  };

  if ((search && search.trim()) || (industry && industry !== "all")) {
    const companyWhere: any = {};
    if (search && search.trim()) {
      companyWhere.name = {
        contains: search.trim(),
        mode: "insensitive",
      };
    }
    if (industry && industry !== "all") {
      companyWhere.industry = {
        name: industry,
      };
    }
    whereClause.company = companyWhere;
  }

  const followedCompanies = await prisma.follow.findMany({
    where: whereClause,
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

  return {
    data: followedCompanies,
    meta: {
      industries: uniqueIndustries,
    },
  };
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
