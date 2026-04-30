import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import { jobViewController } from "./jobView.controller.js";

const router = express.Router();

router.post(
  "/log/:jobId",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  jobViewController.logJobView,
);

router.get("/history", authValidator(UserRole.JOB_SEEKER), jobViewController.getJobViewHistory);

export const jobViewRoute = router;
