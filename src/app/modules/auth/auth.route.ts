import express from "express";
import config from "../../../config/index.js";
import passport from "../../../config/passport.config.js";
import { authLimiter } from "../../../lib/rateLimiters.js";
import authValidator from "../../middleware/authValidator.js";
import requestValidator from "../../middleware/requestValidator.js";
import authController from "./auth.controller.js";
import authValidation from "./auth.validation.js";

const router = express.Router();

// P1: authLimiter applied to all sensitive auth endpoints.
// skipSuccessfulRequests=true means only failed attempts count toward the limit.
router
  .post(
    "/register",
    authLimiter,
    requestValidator(authValidation.register),
    authController.register,
  )
  .post("/login", authLimiter, authController.login)
  .post("/logout", authController.logout)
  .post("/refresh", authController.refresh)
  .post("/forgot-password", authLimiter, authController.forgotPassword)
  .post("/reset-password", authLimiter, authController.resetPassword)
  .post("/verify-email", requestValidator(authValidation.verifyEmail), authController.verifyEmail)
  .post("/change-password", authValidator(), authController.changePassword)
  .get("/me", authValidator(), authController.getCurrentUser);

// Google OAuth routes - check if strategy is configured
const googleAuthMiddleware = (
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (!config.google_client_id || !config.google_client_secret) {
    res.status(503).json({
      success: false,
      message:
        "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.",
    });
    return;
  }
  return next();
};

router.get("/google", googleAuthMiddleware, (req, res, next) => {
  // Pass state parameter to Passport (contains role information)
  const state = req.query.state as string | undefined;
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state: state, // Pass state through OAuth flow
  })(req, res, next);
});

router.get(
  "/google/callback",
  googleAuthMiddleware,
  passport.authenticate("google", { session: false }),
  authController.googleOAuth,
);

const authRoute = router;

export default authRoute;
