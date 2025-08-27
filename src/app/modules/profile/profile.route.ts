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
    requestValidator(profileValidation.createProfile),
    profileController.createProfile,
  )
  .get(
    "/profile",
    authValidator(UserRole.ADMIN, UserRole.JOB_SEEKER, UserRole.EMPLOYER),
    profileController.myProfile,
  )
  .patch(
    "/update",
    authValidator(UserRole.ADMIN, UserRole.JOB_SEEKER, UserRole.EMPLOYER),
    requestValidator(profileValidation.updateProfile),
    profileController.updateMyProfile,
  );

const profileRoute = router;

export default profileRoute;
