import { z } from "zod";

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
  industry: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val.length <= 100, "Industry cannot exceed 100 characters"),
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
  benefits: z.any().optional().nullable().describe("Company benefits in JSON format"),
});

const updateCompany = createCompany.partial();

const companyValidation = {
  createCompany,
  updateCompany,
};

export default companyValidation;
