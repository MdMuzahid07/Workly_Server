import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import adminController from "./admin.controller.js";

const router = express.Router();

router.get(
  "/employers/stats",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.getEmployerStats,
);

router.get(
  "/employers",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.getEmployersList,
);

router.patch(
  "/companies/:companyId/verify",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.verifyCompany,
);

router.patch(
  "/employers/:userId/suspend",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.suspendEmployer,
);

router.patch(
  "/employers/:userId/reactivate",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.reactivateEmployer,
);

router.delete(
  "/employers/:userId",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.deleteEmployer,
);

export default router;
