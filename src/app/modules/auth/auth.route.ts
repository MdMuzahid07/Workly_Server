import express from "express";
import authController from "./auth.controller.js";

const router = express.Router();

router
  .post("/register", authController.register)
  .post("/login", authController.login)
  .post("/logout", authController.logout)
  .post("/refresh", authController.refresh)
  .post("/forgot-password", authController.forgotPassword)
  .post("/reset-password", authController.resetPassword)
  .post("/verify-email", authController.verifyEmail)
  .post("/resend-verification-email", authController.resendVerificationEmail);

const authRoute = router;

export default authRoute;
