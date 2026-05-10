import { z } from "zod";

export const employerAdminListQuery = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  q: z.string().optional(),
  status: z.enum(["Verified", "Pending", "Suspended"]).optional(),
});

export const companyIdParams = z.object({
  companyId: z.string().min(1),
});

export const userIdParams = z.object({
  userId: z.string().min(1),
});

export const jobSeekerAdminListQuery = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  q: z.string().optional(),
  status: z.enum(["Hired", "Looking", "Active", "Suspended"]).optional(),
});

export const adminJobListQuery = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  q: z.string().optional(),
  type: z.string().optional(),
});

export const staffAdminListQuery = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  q: z.string().optional(),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]).optional(),
});

export const createStaffZodSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email").min(1, "Email is required"),
  role: z.enum(["ADMIN", "SUPER_ADMIN"], { message: "Role is required" }),
  phone: z.string().optional(),
});

export const auditLogQuery = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  entityType: z.string().optional(),
  action: z.string().optional(),
});
