import express from "express";
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
  .post(
    "/resend-verification-email",
    requestValidator(authValidation.resendVerificationEmail),
    authController.resendVerificationEmail,
  );

const authRoute = router;

export default authRoute;
