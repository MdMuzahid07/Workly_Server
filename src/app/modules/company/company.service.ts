import httpStatus from "http-status";
import type { Benefits, Company, SocialLink } from "../../../generated/prisma/index.js";
import generateUniqueSlug from "../../../utils/generateUniqueSlug.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const createCompany = async (
  userId: string,
  payload: Company & { socialLinks: SocialLink[]; benefits: Benefits[] },
) => {
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

  const { socialLinks, benefits: companyBenefits, isVerified, ...companyData } = payload;

  const slug = await generateUniqueSlug(companyData.name, "company");

  const result = await prisma.$transaction(async (transactor) => {
    const company = await transactor.company.create({
      data: {
        ...companyData,
        isVerified: true,
        slug,
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

    if (socialLinks && socialLinks.length > 0) {
      await transactor.socialLink.createMany({
        data: socialLinks.map((link) => ({
          platform: link.platform,
          url: link.url,
          companyId: company.id,
        })),
      });
    }

    if (companyBenefits && companyBenefits.length > 0) {
      await transactor.benefits.createMany({
        data: companyBenefits.map((benefit: Benefits) => ({
          title: benefit.title,
          description: benefit.description,
          category: benefit.category,
          icon: benefit.icon,
          isActive: benefit.isActive ?? true,
          companyId: company.id,
        })),
      });
    }

    return company;
  });

  return result;
};

const getCompanyBySlug = async (slug: string) => {
  const result = await prisma.company.findUnique({
    where: {
      slug,
      isVerified: true,
      deletedAt: null,
    },
    include: {
      socialLinks: true,
      benefits: true,
      employees: {
        where: { isActive: true, deletedAt: null },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          lastLogin: true,
        },
      },
      jobs: {
        where: {
          isActive: true,
          deletedAt: null,
          expiresAt: { gt: new Date() },
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          employees: true,
          jobs: {
            where: {
              isActive: true,
              deletedAt: null,
              expiresAt: { gt: new Date() },
            },
          },
        },
      },
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Company not found");
  }

  return result;
};

const deleteCompanyById = async (userId: string, companyId: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true, isVerified: true },
    include: { company: true },
  });

  if (!user || user.companyId !== companyId) {
    throw new AppError(httpStatus.FORBIDDEN, "Not authorized to delete this company");
  }

  return await prisma.$transaction(async (transactor) => {
    const company = await transactor.company.update({
      where: { id: companyId },
      data: { deletedAt: new Date() },
    });

    await transactor.job.updateMany({
      where: { companyId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return company;
  });
};

const companyService = {
  createCompany,
  getCompanyBySlug,
  deleteCompanyById,
};
export default companyService;
