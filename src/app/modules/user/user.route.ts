import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import userController from "./user.controller.js";

const router = express.Router();

router.post(
  "/push-token",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  userController.registerPushToken,
);

router.delete(
  "/push-token",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  userController.deregisterPushToken,
);

router.get(
  "/notification-preferences",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  userController.getNotificationPreferences,
);

router.patch(
  "/notification-preferences",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  userController.updateNotificationPreferences,
);

export default router;
