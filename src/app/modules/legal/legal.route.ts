import express from "express";
import requestValidator from "../../middleware/requestValidator.js";
import legalController from "./legal.controller.js";
import legalValidation from "./legal.validation.js";
import authValidator from "../../middleware/authValidator.js";
import { UserRole } from "../../../generated/prisma/index.js";

const router = express.Router();

router.get("/:slug", legalController.getLegalDocument);

router.patch(
  "/:slug",
  authValidator(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  requestValidator(legalValidation.upsertLegalDocumentZodSchema),
  legalController.upsertLegalDocument,
);

const legalRoute = router;
export default legalRoute;
