import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import { certificationController } from "./certification.controller.js";

const router = express.Router();

router.post("/add", authValidator(UserRole.JOB_SEEKER), certificationController.addCertification);

router.patch(
  "/update/:certificationId",
  authValidator(UserRole.JOB_SEEKER),
  certificationController.updateCertification,
);

router.delete(
  "/delete/:certificationId",
  authValidator(UserRole.JOB_SEEKER),
  certificationController.deleteCertification,
);

export default router;
