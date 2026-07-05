import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/index.js";
import generateUniqueSlug from "../../../utils/generateUniqueSlug.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";
import {
  CategoryPayload,
  CategoryStatisticsResponse,
  CategoryWithStats,
  QueryParams,
  Summary,
} from "./category.interface.js";

const normalizeSubcategories = (subs?: string[] | null) => {
  if (!subs || subs.length === 0) return [];
  const normalized = subs
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase());
  return Array.from(new Set(normalized));
};

const normalizeSkills = (skills?: string[] | null) => {
  if (!skills || skills.length === 0) return [];
  const normalized = skills.map((item) => item.trim()).filter(Boolean);
  return Array.from(new Set(normalized));
};

const createCategory = async (payload: CategoryPayload) => {
  const normalizedSubs = normalizeSubcategories(payload.subcategories);
  const normalizedSkills = normalizeSkills(payload.skills);

  const categoryClient = (prisma as any).industry;

  const [existingName, existingSlug] = await Promise.all([
    categoryClient.findFirst({ where: { name: payload.name, isDeleted: false } }),
    categoryClient.findFirst({ where: { slug: payload.slug, isDeleted: false } }),
  ]);

  if (existingName) {
    throw new AppError(httpStatus.BAD_REQUEST, "Category with this name already exists");
  }

  if (existingSlug) {
    throw new AppError(httpStatus.BAD_REQUEST, "Category with this slug already exists");
  }

  const slug = await generateUniqueSlug(payload.slug || payload.name, "industry");

  const result = await prisma.$transaction(async (tx) => {
    const category = await tx.industry.create({
      data: {
        name: payload.name,
        icon: payload.icon,
        slug,
        description: payload.description,
        subcategories: normalizedSubs,
      },
    });

    if (normalizedSkills.length > 0) {
      await tx.taxonomySkill.createMany({
        data: normalizedSkills.map((skillName) => ({
          name: skillName,
          industryId: category.id,
        })),
        skipDuplicates: true,
      });
    }

    return category;
  });

  return result;
};

const getCategories = async (query: Record<string, unknown>) => {
  const search = (query.search as string)?.trim() ?? "";
  const type = query.type as string;

  const where: any = {
    isDeleted: false,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { subcategories: { has: search.toLowerCase() } },
      ],
    }),
  };

  if (type === "company") {
    where.companies = { some: { deletedAt: null } };
  } else if (type === "job") {
    where.jobs = { some: { deletedAt: null } };
  }

  const categoryClient = (prisma as any).industry;

  const result = await categoryClient.findMany({
    where,
    include: {
      taxonomySkills: {
        select: {
          id: true,
          name: true,
          active: true,
        },
      },
      _count: {
        select: {
          jobs: {
            where: {
              status: "ACTIVE",
              deletedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        },
      },
    },
  });

  // Sort by active job count in descending order
  result.sort((a: any, b: any) => (b._count?.jobs || 0) - (a._count?.jobs || 0));

  return result;
};

const getCategoryBySlug = async (slug: string) => {
  const categoryClient = (prisma as any).industry;

  const category = await categoryClient.findFirst({
    where: { slug, isDeleted: false },
    include: {
      taxonomySkills: {
        select: {
          id: true,
          name: true,
          active: true,
        },
      },
    },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  return category;
};

const updateCategory = async (categoryId: string, payload: Partial<CategoryPayload>) => {
  const categoryClient = (prisma as any).industry;

  const existing = await categoryClient.findFirst({ where: { id: categoryId, isDeleted: false } });
  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  if (payload.name) {
    const duplicateName = await categoryClient.findFirst({
      where: { name: payload.name },
    });
    if (duplicateName && duplicateName.id !== categoryId) {
      throw new AppError(httpStatus.BAD_REQUEST, "Category with this name already exists");
    }
  }

  if (payload.slug) {
    const duplicateSlug = await categoryClient.findFirst({
      where: { slug: payload.slug },
    });
    if (duplicateSlug && duplicateSlug.id !== categoryId) {
      throw new AppError(httpStatus.BAD_REQUEST, "Category with this slug already exists");
    }
  }

  const nextSlug =
    payload.slug !== undefined
      ? await generateUniqueSlug(payload.slug || payload.name || existing.name, "industry")
      : existing.slug;

  const updated = await prisma.$transaction(async (tx) => {
    const category = await tx.industry.update({
      where: { id: categoryId, isDeleted: false },
      data: {
        name: payload.name ?? existing.name,
        slug: nextSlug,
        icon: payload.icon ?? existing.icon,
        description: payload.description ?? existing.description,
        subcategories:
          payload.subcategories !== undefined
            ? normalizeSubcategories(payload.subcategories)
            : existing.subcategories,
      },
    });

    if (payload.skills !== undefined) {
      const normalizedSkills = normalizeSkills(payload.skills);

      // Fetch existing taxonomy skills
      const existingSkills = await tx.taxonomySkill.findMany({
        where: { industryId: categoryId },
        select: { name: true },
      });
      const existingNames = existingSkills.map((s) => s.name);

      const toAdd = normalizedSkills.filter((name) => !existingNames.includes(name));
      const toRemove = existingNames.filter((name) => !normalizedSkills.includes(name));

      if (toRemove.length > 0) {
        await tx.taxonomySkill.deleteMany({
          where: {
            industryId: categoryId,
            name: { in: toRemove },
          },
        });
      }

      if (toAdd.length > 0) {
        await tx.taxonomySkill.createMany({
          data: toAdd.map((name) => ({
            name,
            industryId: categoryId,
          })),
        });
      }
    }

    return category;
  });

  return updated;
};

const deleteCategory = async (categoryId: string) => {
  const categoryClient = (prisma as any).industry;
  const existing = await categoryClient.findFirst({ where: { id: categoryId, isDeleted: false } });
  if (!existing || existing.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  await categoryClient.update({
    where: { id: categoryId },
    data: { isDeleted: true, deletedAt: new Date(), active: false },
  });

  return { id: categoryId };
};

const toggleCategoryStatus = async (categoryId: string) => {
  const categoryClient = (prisma as any).industry;

  const existing = await categoryClient.findFirst({ where: { id: categoryId, isDeleted: false } });
  if (!existing || existing.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  const updated = await categoryClient.update({
    where: { id: categoryId },
    data: {
      active: !existing.active,
    },
  });

  return updated;
};

// ==================== statistics ====================>

export const getCategoryStatistics = async (
  params: QueryParams = {},
): Promise<CategoryStatisticsResponse> => {
  const { search, active = "all", sortBy = "createdAt", sortOrder = "desc" } = params;

  // ==== build where clause ====>
  const where: Prisma.IndustryWhereInput = {
    isDeleted: false,
  };

  // Active filter
  if (active === "true") {
    where.active = true;
  } else if (active === "false") {
    where.active = false;
  }

  // ===== search filter ===>
  if (search?.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: "insensitive" } },
      { slug: { contains: search.trim(), mode: "insensitive" } },
      { subcategories: { has: search.trim().toLowerCase() } },
    ];
  }

  // ====  fetch categories with related jobs and applications count ====>
  const categories = await prisma.industry.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      description: true,
      icon: true,
      subcategories: true,
      createdAt: true,
      updatedAt: true,
      taxonomySkills: {
        select: {
          id: true,
          name: true,
          active: true,
        },
      },
      jobs: {
        where: {
          deletedAt: null,
        },
        select: {
          status: true,
          _count: {
            select: {
              applications: true,
            },
          },
        },
      },
    },
    orderBy:
      sortBy === "createdAt" || sortBy === "name"
        ? { [sortBy]: sortOrder }
        : { createdAt: sortOrder },
  });

  // ====  process categories and calculate statistics ====>
  //@ts-ignore
  const processedCategories: CategoryWithStats[] = categories.map((cat: any) => {
    const totalJobs = cat.jobs.length;
    const activeJobs = cat.jobs.filter((job: any) => job.status === "ACTIVE").length;
    const totalApplications = cat.jobs.reduce(
      (sum: number, job: any) => sum + job._count.applications,
      0,
    );

    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      active: cat.active,
      description: cat.description,
      icon: cat.icon,
      subcategories: cat.subcategories,
      taxonomySkills: cat.taxonomySkills,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      totalJobs,
      activeJobs,
      totalApplications,
    };
  });

  // ====  sort by computed fields if needed ====>
  if (sortBy === "totalJobs" || sortBy === "totalApplications") {
    processedCategories.sort((a, b) => {
      const diff = a[sortBy] - b[sortBy];
      return sortOrder === "asc" ? diff : -diff;
    });
  }

  // ====== calculate summer from all categories (ignore filters for summary) ======>
  const allCategories = await prisma.industry.findMany({
    where: { isDeleted: false },
    select: {
      active: true,
      jobs: {
        where: {
          deletedAt: null,
        },
        select: {
          status: true,
          _count: {
            select: {
              applications: true,
            },
          },
        },
      },
    },
  });

  const totalCategories = allCategories.length;
  const activeCategories = allCategories.filter((c: any) => c.active).length;
  const totalJobs = allCategories.reduce((sum: number, c: any) => sum + c.jobs.length, 0);
  const activeJobs = allCategories.reduce(
    (sum: number, c: any) => sum + c.jobs.filter((j: any) => j.status === "ACTIVE").length,
    0,
  );
  const totalApplications = allCategories.reduce(
    (sum: number, c: any) =>
      sum + c.jobs.reduce((s: number, j: any) => s + j._count.applications, 0),
    0,
  );

  const summary: Summary = {
    totalCategories,
    activeCategories,
    inactiveCategories: totalCategories - activeCategories,
    totalJobs,
    activeJobs,
    totalApplications,
    averageApplicationsPerCategory:
      totalCategories > 0 ? Math.round(totalApplications / totalCategories) : 0,
  };

  return {
    categories: processedCategories,
    summary,
  };
};

const categoryService = {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  getCategoryStatistics,
};

export default categoryService;
