import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import requestValidator from "../../middleware/requestValidator.js";
import companyController from "./company.controller.js";
import companyValidation from "./company.validation.js";

const router = express.Router();

router.post(
  "/new-company",
  authValidator(UserRole.EMPLOYER),
  requestValidator(companyValidation.createCompany),
  companyController.createCompany,
);

const companyRoute = router;
export default companyRoute;
