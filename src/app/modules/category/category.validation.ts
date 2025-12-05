import { z } from "zod";

const subcategoriesSchema = z
  .array(z.string().trim().min(1, "Subcategory cannot be empty"))
  .optional()
  .default([]);

const createCategory = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(255, "Name cannot exceed 255 characters"),
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
    .refine((val) => !val || val.length <= 1000, "Description cannot exceed 1000 characters"),
  subcategories: subcategoriesSchema,
});

const updateCategory = createCategory.partial();

const categoryValidation = {
  createCategory,
  updateCategory,
};

export default categoryValidation;
