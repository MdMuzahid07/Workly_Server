import express from "express";
import authValidator from "../../middleware/authValidator.js";
import requestValidator from "../../middleware/requestValidator.js";
import authController from "./auth.controller.js";
import authValidation from "./auth.validation.js";

const router = express.Router();

router
  .post("/register", requestValidator(authValidation.register), authController.register)
  .post("/login", authController.login)
  .post("/logout", authController.logout)
  .post("/refresh", authController.refresh)
  .post("/forgot-password", authController.forgotPassword)
  .post("/reset-password", authController.resetPassword)
  .post("/verify-email", requestValidator(authValidation.verifyEmail), authController.verifyEmail)
  .get("/me", authValidator(), authController.getCurrentUser);

const authRoute = router;

export default authRoute;
