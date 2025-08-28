import httpStatus from "http-status";
import type { Company } from "../../../generated/prisma/index.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const createCompany = async (userId: string, payload: Company) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const isUserExits = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      company: true,
    },
  });

  if (!isUserExits || !isUserExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found to create a company`);
  }

  if (isUserExits && !isUserExits?.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not verified`);
  }

  if (isUserExits?.companyId) {
    throw new AppError(httpStatus.BAD_REQUEST, `User already has a company`);
  }

  const [isCompanyWithSameName, isSlugExists] = await Promise.all([
    prisma.company.findUnique({
      where: {
        name: payload.name,
      },
    }),
    prisma.company.findUnique({
      where: {
        slug: payload.slug,
      },
    }),
  ]);

  if (isCompanyWithSameName) {
    throw new AppError(httpStatus.BAD_REQUEST, `Company with same name already exists`);
  }

  if (isSlugExists) {
    throw new AppError(httpStatus.BAD_REQUEST, `Company with same slug already exists`);
  }

  const result = await prisma.$transaction(async (transactor) => {
    const company = await transactor.company.create({
      data: {
        ...payload,
        benefits: payload.benefits || [],
      },
    });

    await transactor.user.update({
      where: {
        id: userId,
      },
      data: {
        companyId: company.id,
      },
    });

    return company;
  });

  return result;
};

const companyService = {
  createCompany,
};
export default companyService;
