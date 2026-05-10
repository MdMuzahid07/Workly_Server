import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import notificationController from "./notification.controller.js";

const router = express.Router();

router.get(
  "/my",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  notificationController.getMyNotifications,
);

router.get(
  "/unread-count",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  notificationController.getUnreadCount,
);

router.patch(
  "/:id/read",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  notificationController.markAsRead,
);

router.patch(
  "/mark-all-read",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  notificationController.markAllAsRead,
);

router.delete(
  "/:id",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  notificationController.deleteNotification,
);

export default router;
