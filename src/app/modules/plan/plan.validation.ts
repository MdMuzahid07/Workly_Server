import { z } from 'zod';
import { PlanType } from '../../../generated/prisma/index.js';

export const createPlanZodSchema = z.object({
  name: z
    .string({
      message: 'Plan name is required',
    })
    .min(1, 'Plan name cannot be empty'),
  planType: z.nativeEnum(PlanType, {
    message: 'planType is required and must be either EMPLOYER or JOB_SEEKER',
    invalid_type_error: 'planType must be either EMPLOYER or JOB_SEEKER',
  }),
  isCustom: z.boolean({
    message: 'isCustom is required as a boolean value',
    invalid_type_error: 'isCustom must be a boolean value',
  }),
  description: z.string().optional(),
  price: z.union([z.number(), z.string()]).transform((val) => Number(val)),
  currency: z.string().optional().default('BDT'),
  interval: z.string().optional().default('month'),
  features: z.unknown().optional(),
  maxActiveJobs: z.union([z.number(), z.string(), z.null()]).optional(),
  maxUsers: z.union([z.number(), z.string(), z.null()]).optional(),
  isActive: z.boolean().optional().default(true),
  createdByAdminId: z.string().nullable().optional(),
});

export const updatePlanZodSchema = z.object({
  name: z.string().optional(),
  planType: z.nativeEnum(PlanType).optional(),
  description: z.string().optional(),
  price: z.union([z.number(), z.string()]).optional(),
  currency: z.string().optional(),
  interval: z.string().optional(),
  isActive: z.boolean().optional(),
  isCustom: z.boolean().optional(),
  maxActiveJobs: z.union([z.number(), z.string(), z.null()]).optional(),
  maxUsers: z.union([z.number(), z.string(), z.null()]).optional(),
  features: z.unknown().optional(),
  firstTimeDiscountPercent: z.union([z.number(), z.string()]).optional(),
});
