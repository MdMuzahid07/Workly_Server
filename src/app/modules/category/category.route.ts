import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import requestValidator from "../../middleware/requestValidator.js";
import categoryController from "./category.controller.js";
import categoryValidation from "./category.validation.js";

const router = express.Router();

router.get("/categories", categoryController.getCategories);
router.get("/categories/:slug", categoryController.getCategoryBySlug);

router.post(
  "/categories",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  requestValidator(categoryValidation.createCategory),
  categoryController.createCategory,
);

router.patch(
  "/categories/:categoryId",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  requestValidator(categoryValidation.updateCategory),
  categoryController.updateCategory,
);

router.delete(
  "/categories/:categoryId",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  categoryController.deleteCategory,
);

const categoryRoute = router;
export default categoryRoute;
