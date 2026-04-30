import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import { projectController } from "./project.controller.js";

const router = express.Router();

router.post("/add", authValidator(UserRole.JOB_SEEKER), projectController.addProject);

router.patch(
  "/update/:projectId",
  authValidator(UserRole.JOB_SEEKER),
  projectController.updateProject,
);

router.delete(
  "/delete/:projectId",
  authValidator(UserRole.JOB_SEEKER),
  projectController.deleteProject,
);

export default router;
