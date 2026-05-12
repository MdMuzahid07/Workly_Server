import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import requestValidator from "../../middleware/requestValidator.js";
import profileController from "./profile.controller.js";
import profileValidation from "./profile.validation.js";

const router = express.Router();

router
  .post(
    "/create-profile",
    authValidator(UserRole.ADMIN, UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.SUPER_ADMIN),
    requestValidator(profileValidation.createProfile),
    profileController.createProfile,
  )
  .get(
    "/profile",
    authValidator(UserRole.ADMIN, UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.SUPER_ADMIN),
    profileController.myProfile,
  )
  .patch(
    "/update-profile",
    authValidator(UserRole.ADMIN, UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.SUPER_ADMIN),
    requestValidator(profileValidation.updateProfile),
    profileController.updateProfile,
  )
  .post(
    "/save-job",
    authValidator(UserRole.JOB_SEEKER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    requestValidator(profileValidation.saveJob),
    profileController.saveJob,
  )
  .get(
    "/saved-jobs",
    authValidator(UserRole.JOB_SEEKER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    profileController.getSavedJobs,
  )

  .patch(
    "/saved-jobs/:jobId",
    authValidator(UserRole.JOB_SEEKER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    requestValidator(profileValidation.updateSavedJob),
    profileController.updateSavedJob,
  )
  .get(
    "/settings",
    authValidator(UserRole.ADMIN, UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.SUPER_ADMIN),
    profileController.getUserSettings,
  )
  .patch(
    "/settings",
    authValidator(UserRole.ADMIN, UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.SUPER_ADMIN),
    profileController.updateUserSettings,
  );

const profileRoute = router;

export default profileRoute;
