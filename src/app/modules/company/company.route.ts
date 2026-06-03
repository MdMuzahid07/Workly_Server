import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import requestValidator from "../../middleware/requestValidator.js";
import companyController from "./company.controller.js";
import companyValidation from "./company.validation.js";

const router = express.Router();

router.get("/companies", companyController.getCompanies);

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
  "/add-team-member/:companyId",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  // requestValidator(companyValidation.addTeamMember),
  companyController.addTeamMember,
);

router.delete(
  "/remove-team-member/:companyId/:memberId",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  companyController.removeTeamMember,
);

router.get(
  "/overview-statistics",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  companyController.getCompanyOverviewStatistics,
);

router.get(
  "/my-company",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  companyController.getMyCompany,
);

router.get(
  "/employer-analytics",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  companyController.getEmployerAnalytics,
);

// Company settings routes
router.get(
  "/:companyId/settings",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  companyController.getSettings,
);
router.patch(
  "/:companyId/settings",
  authValidator(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  // requestValidator(companyValidation.updateSettings), // Uncomment if you add validation
  companyController.updateSettings,
);

const companyRoute = router;
export default companyRoute;
