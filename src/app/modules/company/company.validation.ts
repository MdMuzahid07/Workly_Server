import { z } from "zod";

const benefitsSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  icon: z.string().max(100).optional().nullable(),
  isActive: z.boolean().default(true),
});

const createCompany = z.object({
  name: z
    .string()
    .min(1, "Company name is required")
    .max(255, "Company name cannot exceed 255 characters"),
  slug: z.string().min(1, "Slug is required").max(255, "Slug cannot exceed 255 characters"),
  description: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val.length <= 1000, "Description cannot exceed 1000 characters"),
  websiteUrl: z
    .string()
    .regex(/^https?:\/\/.+/, "Please enter a valid website URL")
    .optional()
    .nullable()
    .refine((val) => !val || val.length <= 500, "Website URL cannot exceed 500 characters"),
  logoUrl: z
    .string()
    .regex(/^https?:\/\/.+/, "Please enter a valid logo URL")
    .optional()
    .nullable()
    .refine((val) => !val || val.length <= 500, "Logo URL cannot exceed 500 characters"),
  coverUrl: z
    .string()
    .regex(/^https?:\/\/.+/, "Please enter a valid cover image URL")
    .optional()
    .nullable()
    .refine((val) => !val || val.length <= 500, "Cover image URL cannot exceed 500 characters"),
  location: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val.length <= 255, "Location cannot exceed 255 characters"),
  industryId: z.string().uuid("Invalid industry ID").optional().nullable(),
  size: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val.length <= 50, "Size cannot exceed 50 characters"),
  contactEmail: z
    .string()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address")
    .optional()
    .nullable()
    .refine((val) => !val || val.length <= 255, "Contact email cannot exceed 255 characters"),
  contactPhone: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val.length <= 50, "Contact phone cannot exceed 50 characters"),
  founded: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val.length <= 100, "Founded year cannot exceed 100 characters"),
  mission: z.string().max(1000, "Mission cannot exceed 1000 characters").optional().nullable(),
  values: z.array(z.string()).optional().nullable(),
  benefits: z.array(benefitsSchema).optional().nullable(),
});

const updateCompany = createCompany.partial();

const companyValidation = {
  createCompany,
  updateCompany,
};

export default companyValidation;
