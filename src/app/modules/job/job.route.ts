import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import requestValidator from "../../middleware/requestValidator.js";
import jobController from "./job.controller.js";
import jobValidation from "./job.validation.js";

const router = express.Router();

router
  .post(
    "/create",
    authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    requestValidator(jobValidation.createJob),
    jobController.createJob,
  )
  .get(
    "/jobs",
    authValidator(UserRole.ADMIN, UserRole.EMPLOYER, UserRole.JOB_SEEKER, UserRole.SUPER_ADMIN),
    jobController.getJobs,
  );

const jobRoute = router;
export default jobRoute;
