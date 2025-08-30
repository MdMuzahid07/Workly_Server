import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import requestValidator from "../../middleware/requestValidator.js";
import applicationController from "./application.controller.js";
import applicationValidation from "./application.validation.js";

const router = express.Router();

router.post(
  "/create",
  authValidator(UserRole.JOB_SEEKER),
  requestValidator(applicationValidation.createApplication),
  applicationController.createApplication,
);

const applicationRoute = router;
export default applicationRoute;
