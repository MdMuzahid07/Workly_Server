import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import requestValidator from "../../middleware/requestValidator.js";
import resumeController from "./resume.controller.js";
import resumeValidation from "./resume.validation.js";
// import multerUpload from "../../middleware/multerUpload.js"; // Uncomment and use your multer middleware

const router = express.Router();

// List resumes
router.get(
  "/resumes",
  authValidator(UserRole.JOB_SEEKER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  resumeController.listResumes,
);

// Upload resume (expects file upload middleware)
router.post(
  "/resumes",
  authValidator(UserRole.JOB_SEEKER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  // multerUpload.single("file"), // Uncomment and use your multer middleware
  requestValidator(resumeValidation.uploadResume),
  resumeController.uploadResume,
);

// Set default resume
router.patch(
  "/resumes/:resumeId/default",
  authValidator(UserRole.JOB_SEEKER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  requestValidator(resumeValidation.setDefaultResume),
  resumeController.setDefaultResume,
);

// Delete resume
router.delete(
  "/resumes/:resumeId",
  authValidator(UserRole.JOB_SEEKER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  requestValidator(resumeValidation.deleteResume),
  resumeController.deleteResume,
);

const resumeRoute = router;
export default resumeRoute;
