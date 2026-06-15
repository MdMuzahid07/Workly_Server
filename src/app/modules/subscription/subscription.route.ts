import express from "express";
import authValidator from "../../middleware/authValidator.js";
import { UserRole } from "../../../generated/prisma/index.js";
import subscriptionController from "./subscription.controller.js";

const router = express.Router();

router.get(
  "/me",
  authValidator(UserRole.EMPLOYER, UserRole.JOB_SEEKER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  subscriptionController.getMySubscription,
);

router.post(
  "/cancel",
  authValidator(UserRole.EMPLOYER, UserRole.JOB_SEEKER),
  subscriptionController.cancelSubscription,
);

router.post(
  "/admin/assign",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  subscriptionController.adminAssignPlan,
);

export default router;
