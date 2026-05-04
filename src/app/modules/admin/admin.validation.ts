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
