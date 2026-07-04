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

router.get(
  "/job-seekers/stats",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.getJobSeekerStats,
);

router.get(
  "/job-seekers",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.getJobSeekersList,
);

router.get(
  "/job-seekers/:userId/resume",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.streamJobSeekerResume,
);

router.patch(
  "/job-seekers/:userId/suspend",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.suspendJobSeeker,
);

router.patch(
  "/job-seekers/:userId/reactivate",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.reactivateJobSeeker,
);

router.delete(
  "/job-seekers/:userId",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.deleteJobSeeker,
);

router.get(
  "/jobs/stats",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.getActiveJobsStats,
);

router.get(
  "/jobs",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.getActiveJobsList,
);

router.get(
  "/staff/stats",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.getStaffStats,
);

router.get(
  "/staff",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.getStaffList,
);

router.post(
  "/staff",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.createStaff,
);

router.patch(
  "/staff/:userId/status",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.setStaffStatus,
);

router.patch(
  "/staff/:userId/role",
  authValidator(UserRole.SUPER_ADMIN),
  adminController.setStaffRole,
);

router.get(
  "/overview/stats",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.getDashboardOverviewStats,
);

router.get(
  "/overview/recent-users",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.getRecentUsers,
);

router.get(
  "/overview/moderation-queue",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.getModerationQueue,
);

router.get(
  "/audit-logs",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.getAuditLogs,
);

router.get(
  "/job-reports/stats",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.getJobReportStats,
);

router.get(
  "/job-reports",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.getJobReports,
);

router.patch(
  "/job-reports/:reportId",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.updateJobReportStatus,
);

router.patch(
  "/jobs/:jobId/deactivate",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.deactivateJob,
);

router.patch(
  "/jobs/:jobId/approve",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.approveJob,
);

router.delete(
  "/jobs/:jobId",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.deleteJobListing,
);

router.get("/settings/public", adminController.getPublicSystemSettings);

router.get(
  "/settings",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.getSystemSettings,
);

router.patch(
  "/settings",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  adminController.updateSystemSettings,
);

export default router;
