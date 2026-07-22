import express from 'express';
import { UserRole } from '../../../generated/prisma/index.js';
import authValidator from '../../middleware/authValidator.js';
import requestValidator from '../../middleware/requestValidator.js';
import planController from './plan.controller.js';
import { createPlanZodSchema, updatePlanZodSchema } from './plan.validation.js';

const router = express.Router();

// Fetch plans is publicly open (Seekers and Employers must see pricing options)
router.get('/', planController.getPlansList);

// Admin-only management endpoints
router.post(
  '/',
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  requestValidator(createPlanZodSchema),
  planController.createPlan,
);

router.patch(
  '/:id',
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  requestValidator(updatePlanZodSchema),
  planController.updatePlan,
);

router.patch(
  '/:id/toggle',
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  planController.togglePlanStatus,
);

router.delete(
  '/:id',
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  planController.deletePlan,
);

export default router;
