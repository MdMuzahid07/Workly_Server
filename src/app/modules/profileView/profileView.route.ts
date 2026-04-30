import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import { profileViewController } from "./profileView.controller.js";

const router = express.Router();

router.post(
  "/log/:viewedUserId",
  // Optional auth: we want to log even anonymous views if possible
  // but if user is logged in, we capture their ID
  // So we don't strictly require a role here if we want to track all views
  // But usually, we only track views from other users.
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
