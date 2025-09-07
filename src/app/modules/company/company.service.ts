import httpStatus from "http-status";
import type { Benefits, Company, SocialLink, UserRole } from "../../../generated/prisma/index.js";
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

const updateCompanyById = async (
  userId: string,
  companyId: string,
  payload: Partial<Company> & { socialLinks: SocialLink[]; benefits: Benefits[] },
) => {
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

  const { socialLinks, benefits, ...companyData } = payload;

  const result = await prisma.$transaction(async (transactor) => {
    const company = await transactor.company.update({
      where: { id: companyId, deletedAt: null },
      data: companyData,
    });

    if (payload.socialLinks !== undefined && payload.socialLinks.length > 0) {
      const currentLinkIds = payload.socialLinks
        .filter((link): link is SocialLink & { id: string } => !!link.id)
        .map((link: SocialLink) => link.id);

      await transactor.socialLink.deleteMany({
        where: {
          companyId: company.id,
          NOT: {
            id: {
              in: currentLinkIds,
            },
          },
        },
      });

      for (const link of payload.socialLinks) {
        if (link.id) {
          await transactor.socialLink.upsert({
            where: {
              id: link.id,
            },
            update: {
              platform: link.platform,
              url: link.url,
            },
            create: {
              platform: link.platform,
              url: link.url,
              companyId: company.id,
            },
          });
        } else {
          await transactor.socialLink.create({
            data: {
              platform: link.platform,
              url: link.url,
              companyId: company.id,
            },
          });
        }
      }
    }

    if (payload.benefits !== undefined && payload.benefits.length > 0) {
      const currentBenefitIds = payload.benefits
        .filter((benefit): benefit is Benefits & { id: string } => !!benefit.id)
        .map((benefit: Benefits) => benefit.id);

      await transactor.benefits.deleteMany({
        where: {
          companyId: company.id,
          NOT: {
            id: {
              in: currentBenefitIds,
            },
          },
        },
      });

      for (const benefit of payload.benefits) {
        if (benefit.id) {
          await transactor.benefits.upsert({
            where: {
              id: benefit.id,
            },
            update: {
              title: benefit.title,
              description: benefit.description,
              icon: benefit.icon,
              category: benefit.category,
            },
            create: {
              title: benefit.title,
              description: benefit.description,
              icon: benefit.icon,
              category: benefit.category,
              companyId: company.id,
            },
          });
        } else {
          await transactor.benefits.create({
            data: {
              title: benefit.title,
              description: benefit.description,
              icon: benefit.icon,
              category: benefit.category,
              companyId: company.id,
            },
          });
        }
      }
    }

    return company;
  });

  return result;
};

const addEmployee = async (
  companyId: string,
  adminId: string,
  employeeEmail: string,
  role: UserRole,
) => {
  const admin = await prisma.user.findUnique({
    where: { id: adminId, isActive: true },
    include: { company: true },
  });

  if (
    !admin ||
    admin.companyId !== companyId ||
    (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "Not authorized to add employees");
  }

  const employee = await prisma.user.findUnique({
    where: { email: employeeEmail, isActive: true },
  });

  if (!employee) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (employee.companyId) {
    throw new AppError(httpStatus.BAD_REQUEST, "User already belongs to a company");
  }

  return await prisma.user.update({
    where: { id: employee.id },
    data: {
      companyId,
      role: role as UserRole,
    },
  });
};

const companyService = {
  createCompany,
  getCompanyBySlug,
  deleteCompanyById,
  updateCompanyById,
  addEmployee,
};
export default companyService;
