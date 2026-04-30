import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import { followController } from "./follow.controller.js";

const router = express.Router();

router.post("/:companyId", authValidator(UserRole.JOB_SEEKER), followController.followCompany);

router.delete("/:companyId", authValidator(UserRole.JOB_SEEKER), followController.unfollowCompany);

router.get(
  "/my-follows",
  authValidator(UserRole.JOB_SEEKER),
  followController.getFollowedCompanies,
);

router.get(
  "/status/:companyId",
  authValidator(UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  followController.isFollowing,
);

export const followRoute = router;
