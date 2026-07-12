import httpStatus from 'http-status';
import { Prisma } from '../../../generated/prisma/index.js';
import generateUniqueSlug from '../../../utils/generateUniqueSlug.js';
import prisma from '../../../utils/prismaClient.js';
import AppError from '../../error/AppError.js';
import {
  CategoryPayload,
  CategoryStatisticsResponse,
  CategoryWithStats,
  QueryParams,
  Summary,
} from './category.interface.js';

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

  const [existingName, existingSlug] = await Promise.all([
    prisma.industry.findFirst({ where: { name: payload.name, isDeleted: false } }),
    prisma.industry.findFirst({ where: { slug: payload.slug, isDeleted: false } }),
  ]);

  if (existingName) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Category with this name already exists');
  }

  if (existingSlug) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Category with this slug already exists');
  }

  const slug = await generateUniqueSlug(payload.slug || payload.name, 'industry');

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
  const search = (query.search as string)?.trim() ?? '';
  const type = query.type as string;

  const where: Prisma.IndustryWhereInput = {
    isDeleted: false,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { subcategories: { has: search.toLowerCase() } },
      ],
    }),
  };

  if (type === 'company') {
    where.companies = { some: { deletedAt: null } };
  } else if (type === 'job') {
    where.jobs = { some: { deletedAt: null } };
  }

  const result = await prisma.industry.findMany({
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
              status: 'ACTIVE',
              deletedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        },
      },
    },
  });

  // Sort by active job count in descending order
  result.sort(
    (a: { _count?: { jobs?: number } }, b: { _count?: { jobs?: number } }) =>
      (b._count?.jobs ?? 0) - (a._count?.jobs ?? 0),
  );

  return result;
};

const getCategoryBySlug = async (slug: string) => {
  const category = await prisma.industry.findFirst({
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
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  }

  return category;
};

const updateCategory = async (categoryId: string, payload: Partial<CategoryPayload>) => {
  const existing = await prisma.industry.findFirst({ where: { id: categoryId, isDeleted: false } });
  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  }

  if (payload.name) {
    const duplicateName = await prisma.industry.findFirst({
      where: { name: payload.name },
    });
    if (duplicateName && duplicateName.id !== categoryId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Category with this name already exists');
    }
  }

  if (payload.slug) {
    const duplicateSlug = await prisma.industry.findFirst({
      where: { slug: payload.slug },
    });
    if (duplicateSlug && duplicateSlug.id !== categoryId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Category with this slug already exists');
    }
  }

  const nextSlug =
    payload.slug !== undefined
      ? await generateUniqueSlug(payload.slug || payload.name || existing.name, 'industry')
      : existing.slug;

  const updated = await prisma.$transaction(async (tx) => {
    const category = await tx.industry.update({
      where: { id: categoryId, isDeleted: false },
      data: {
        name: payload.name ?? existing.name,
        icon: payload.icon ?? existing.icon,
        slug: nextSlug,
        description: payload.description ?? existing.description,
        subcategories: payload.subcategories
          ? normalizeSubcategories(payload.subcategories)
          : undefined,
      },
    });

    if (payload.skills !== undefined) {
      const normalizedSkills = normalizeSkills(payload.skills);
      await tx.taxonomySkill.deleteMany({ where: { industryId: categoryId } });
      if (normalizedSkills.length > 0) {
        await tx.taxonomySkill.createMany({
          data: normalizedSkills.map((skillName) => ({
            name: skillName,
            industryId: categoryId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return category;
  });

  return updated;
};

const deleteCategory = async (categoryId: string) => {
  const existing = await prisma.industry.findFirst({ where: { id: categoryId, isDeleted: false } });
  if (!existing || existing.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  }

  const activeJobsCount = await prisma.job.count({
    where: {
      industryId: categoryId,
      status: 'ACTIVE',
      deletedAt: null,
    },
  });

  if (activeJobsCount > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete category: there are ${activeJobsCount} active job listings referencing it. Please update or close those listings first.`,
    );
  }

  await prisma.industry.update({
    where: { id: categoryId },
    data: { isDeleted: true, deletedAt: new Date(), active: false },
  });

  return { id: categoryId };
};

const toggleCategoryStatus = async (categoryId: string) => {
  const existing = await prisma.industry.findFirst({ where: { id: categoryId, isDeleted: false } });
  if (!existing || existing.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  }

  const updated = await prisma.industry.update({
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
  const { search, active = 'all', sortBy = 'createdAt', sortOrder = 'desc' } = params;

  // ==== build where clause ====>
  const where: Prisma.IndustryWhereInput = {
    isDeleted: false,
  };

  // Active filter
  if (active === 'true') {
    where.active = true;
  } else if (active === 'false') {
    where.active = false;
  }

  // ===== search filter ===>
  if (search?.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: 'insensitive' } },
      { slug: { contains: search.trim(), mode: 'insensitive' } },
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
      sortBy === 'createdAt' || sortBy === 'name'
        ? { [sortBy]: sortOrder }
        : { createdAt: sortOrder },
  });

  // ====  process categories and calculate statistics ====>
  // @ts-expect-error — Prisma's inferred return type for this complex include doesn't surface
  // the nested relations in the static type, but they are present at runtime.
  const processedCategories: CategoryWithStats[] = categories.map((cat) => {
    const totalJobs = (cat.jobs as { status: string; _count: { applications: number } }[]).length;
    const activeJobs = (cat.jobs as { status: string; _count: { applications: number } }[]).filter(
      (job) => job.status === 'ACTIVE',
    ).length;
    const totalApplications = (
      cat.jobs as { status: string; _count: { applications: number } }[]
    ).reduce((sum, job) => sum + job._count.applications, 0);

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
  if (sortBy === 'totalJobs' || sortBy === 'totalApplications') {
    processedCategories.sort((a, b) => {
      const diff = a[sortBy] - b[sortBy];
      return sortOrder === 'asc' ? diff : -diff;
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
  const activeCategories = allCategories.filter((c) => c.active).length;
  const totalJobs = allCategories.reduce(
    (sum, c) => sum + (c.jobs as { status: string; _count: { applications: number } }[]).length,
    0,
  );
  const activeJobs = allCategories.reduce(
    (sum, c) =>
      sum +
      (c.jobs as { status: string; _count: { applications: number } }[]).filter(
        (j) => j.status === 'ACTIVE',
      ).length,
    0,
  );
  const totalApplications = allCategories.reduce(
    (sum, c) =>
      sum +
      (c.jobs as { status: string; _count: { applications: number } }[]).reduce(
        (s, j) => s + j._count.applications,
        0,
      ),
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
