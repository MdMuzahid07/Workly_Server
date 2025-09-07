import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import requestValidator from "../../middleware/requestValidator.js";
import companyController from "./company.controller.js";
import companyValidation from "./company.validation.js";

const router = express.Router();

router.post(
  "/new-company",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  requestValidator(companyValidation.createCompany),
  companyController.createCompany,
);

router.get("/company/:slug", companyController.getCompanyBySlug);

router.delete(
  "/delete/:companyId",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  companyController.deleteCompanyById,
);

router.patch(
  "/update/:companyId",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  requestValidator(companyValidation.updateCompany),
  companyController.updateCompanyById,
);

router.post(
  "/add-employee/:companyId",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  // requestValidator(companyValidation.addEmployee),
  companyController.addEmployee,
);

router.delete(
  "/remove-employee/:companyId/:employeeId",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  companyController.removeEmployee,
);

const companyRoute = router;
export default companyRoute;
