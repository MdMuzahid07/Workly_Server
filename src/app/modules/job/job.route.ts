import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import jobController from "./job.controller.js";

const router = express.Router();

router.post(
  "/create",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN),
  //   requestValidator(),
  jobController.createJob,
);

const jobRoute = router;
export default jobRoute;
