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
  .get("/jobs", jobController.getJobs);

router.get("/job/:id", jobController.getJobById);

router.patch(
  "/update/:id",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  requestValidator(jobValidation.updateJob),
  jobController.updateJob,
);

const jobRoute = router;
export default jobRoute;
