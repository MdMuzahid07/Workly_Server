import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import requestValidator from "../../middleware/requestValidator.js";
import applicationController from "./application.controller.js";
import applicationValidation from "./application.validation.js";

const router = express.Router();

router.post(
  "/create",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  requestValidator(applicationValidation.createApplication),
  applicationController.createApplication,
);

router.get("/me", authValidator(UserRole.JOB_SEEKER), applicationController.getMyApplications);
router.get(
  "/me/summary",
  authValidator(UserRole.JOB_SEEKER),
  applicationController.getMyApplicationSummary,
);
router.get("/stats", authValidator(UserRole.JOB_SEEKER), applicationController.getApplicationStats);

router.get(
  "/job/:jobId",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  applicationController.getJobApplications,
);

router.get(
  "/my-company-applications",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  applicationController.getMyCompanyApplications,
);

router.get(
  "/my-company-summary",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  applicationController.getMyCompanyApplicationSummary,
);

router.get(
  "/:id/resume",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  applicationController.streamApplicationResume,
);

router.get(
  "/:id",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  applicationController.getApplicationById,
);

router.patch(
  "/:id/status",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  requestValidator(applicationValidation.updateStatus),
  applicationController.updateStatus,
);

router.patch(
  "/:id/withdraw",
  authValidator(UserRole.JOB_SEEKER),
  requestValidator(applicationValidation.withdraw),
  applicationController.withdraw,
);

router.patch(
  "/:id/interview",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  requestValidator(applicationValidation.scheduleInterview),
  applicationController.scheduleInterview,
);

router.patch(
  "/:id/notes",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  requestValidator(applicationValidation.updateNotes),
  applicationController.updateNotes,
);

const applicationRoute = router;
export default applicationRoute;
