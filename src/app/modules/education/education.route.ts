import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import educationController from "./education.controller.js";
// import educationValidation from "./profile-education.validation.js"; // Uncomment if you have validation

const router = express.Router();

// Add education
router.post(
  "/education",
  authValidator(UserRole.JOB_SEEKER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  // requestValidator(educationValidation.addEducation),
  educationController.addEducation,
);

// Update education
router.patch(
  "/education/:educationId",
  authValidator(UserRole.JOB_SEEKER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  // requestValidator(educationValidation.updateEducation),
  educationController.updateEducation,
);

// Delete education
router.delete(
  "/education/:educationId",
  authValidator(UserRole.JOB_SEEKER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  educationController.deleteEducation,
);

const educationRoute = router;
export default educationRoute;
