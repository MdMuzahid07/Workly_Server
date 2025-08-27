import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import profileController from "./profile.controller.js";

const router = express.Router();

router
  .post(
    "/create-profile",
    //   requestValidator(profileValidation.createProfile),
    profileController.createProfile,
  )
  .get(
    "/my-profile",
    authValidator(UserRole.ADMIN, UserRole.JOB_SEEKER, UserRole.EMPLOYER),
    profileController.myProfile,
  );

const profileRoute = router;

export default profileRoute;
