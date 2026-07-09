import { z } from "zod";

const subcategoriesSchema = z
  .array(z.string().trim().min(1, "Subcategory cannot be empty"))
  .optional()
  .default([]);

const skillsSchema = z
  .array(z.string().trim().min(1, "Skill cannot be empty"))
  .optional()
  .default([]);

const createCategory = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(255, "Name cannot exceed 255 characters"),
  icon: z.string().trim().min(1, "Icon is required").max(50, "Icon cannot exceed 50 characters"),
  active: z.boolean().default(true),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(255, "Slug cannot exceed 255 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric and hyphenated"),
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => !val || val.length <= 500, "Description cannot exceed 500 characters"),
  subcategories: subcategoriesSchema,
  skills: skillsSchema,
});

const updateCategory = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(255, "Name cannot exceed 255 characters")
    .optional(),
  icon: z
    .string()
    .trim()
    .min(1, "Icon is required")
    .max(50, "Icon cannot exceed 50 characters")
    .optional(),
  active: z.boolean().optional(),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(255, "Slug cannot exceed 255 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric and hyphenated")
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .nullable(),
  subcategories: z.array(z.string().trim().min(1, "Subcategory cannot be empty")).optional(),
  skills: z.array(z.string().trim().min(1, "Skill cannot be empty")).optional(),
});

const categoryValidation = {
  createCategory,
  updateCategory,
};

export default categoryValidation;
