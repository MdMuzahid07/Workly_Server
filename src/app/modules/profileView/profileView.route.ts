import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import { profileViewController } from "./profileView.controller.js";

const router = express.Router();

router.post(
  "/log/:viewedUserId",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN),
  profileViewController.logProfileView,
);

router.get(
  "/stats",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER),
  profileViewController.getProfileViewStats,
);

router.get(
  "/recent-visitors",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER),
  profileViewController.getRecentVisitors,
);

export const profileViewRoute = router;
