import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import { workExperienceController } from "./workExperience.controller.js";

const router = express.Router();

router.post("/add", authValidator(UserRole.JOB_SEEKER), workExperienceController.addWorkExperience);

router.patch(
  "/update/:experienceId",
  authValidator(UserRole.JOB_SEEKER),
  workExperienceController.updateWorkExperience,
);

router.delete(
  "/delete/:experienceId",
  authValidator(UserRole.JOB_SEEKER),
  workExperienceController.deleteWorkExperience,
);

export default router;
