import httpStatus from "http-status";
import generateUniqueSlug from "../../../utils/generateUniqueSlug.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

type CategoryPayload = {
  name: string;
  slug: string;
  description?: string | null;
  subcategories?: string[];
};

const normalizeSubcategories = (subs?: string[] | null) => {
  if (!subs || subs.length === 0) return [];
  const normalized = subs
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase());
  return Array.from(new Set(normalized));
};

const getCategories = async (query: Record<string, unknown>) => {
  const search = (query.search as string)?.trim() ?? "";

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
          { subcategories: { has: search.toLowerCase() } },
        ],
      }
    : {};

  const categoryClient = (prisma as any).category;

  const result = await categoryClient.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return result;
};

const getCategoryBySlug = async (slug: string) => {
  const categoryClient = (prisma as any).category;

  const category = await categoryClient.findUnique({
    where: { slug },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  return category;
};

const createCategory = async (payload: CategoryPayload) => {
  const normalizedSubs = normalizeSubcategories(payload.subcategories);

  const categoryClient = (prisma as any).category;

  const [existingName, existingSlug] = await Promise.all([
    categoryClient.findUnique({ where: { name: payload.name } }),
    categoryClient.findUnique({ where: { slug: payload.slug } }),
  ]);

  if (existingName) {
    throw new AppError(httpStatus.BAD_REQUEST, "Category with this name already exists");
  }

  if (existingSlug) {
    throw new AppError(httpStatus.BAD_REQUEST, "Category with this slug already exists");
  }

  const slug = await generateUniqueSlug(payload.slug || payload.name, "category");

  const created = await categoryClient.create({
    data: {
      name: payload.name,
      slug,
      description: payload.description,
      subcategories: normalizedSubs,
    },
  });

  return created;
};

const updateCategory = async (categoryId: string, payload: Partial<CategoryPayload>) => {
  const categoryClient = (prisma as any).category;

  const existing = await categoryClient.findUnique({ where: { id: categoryId } });
  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  if (payload.name) {
    const duplicateName = await categoryClient.findUnique({
      where: { name: payload.name },
    });
    if (duplicateName && duplicateName.id !== categoryId) {
      throw new AppError(httpStatus.BAD_REQUEST, "Category with this name already exists");
    }
  }

  if (payload.slug) {
    const duplicateSlug = await categoryClient.findUnique({
      where: { slug: payload.slug },
    });
    if (duplicateSlug && duplicateSlug.id !== categoryId) {
      throw new AppError(httpStatus.BAD_REQUEST, "Category with this slug already exists");
    }
  }

  const nextSlug =
    payload.slug !== undefined
      ? await generateUniqueSlug(payload.slug || payload.name || existing.name, "category")
      : existing.slug;

  const updated = await categoryClient.update({
    where: { id: categoryId },
    data: {
      name: payload.name ?? existing.name,
      slug: nextSlug,
      description: payload.description ?? existing.description,
      subcategories:
        payload.subcategories !== undefined
          ? normalizeSubcategories(payload.subcategories)
          : existing.subcategories,
    },
  });

  return updated;
};

const deleteCategory = async (categoryId: string) => {
  const categoryClient = (prisma as any).category;
  const existing = await categoryClient.findUnique({ where: { id: categoryId } });
  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  await categoryClient.delete({
    where: { id: categoryId },
  });

  return { id: categoryId };
};

const toggleCategoryStatus = async (categoryId: string) => {
  const categoryClient = (prisma as any).category;

  const existing = await categoryClient.findUnique({ where: { id: categoryId } });
  if (!existing) {
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

const categoryService = {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
};

export default categoryService;
