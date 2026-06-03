import express from "express";
import { UserRole } from "../../../generated/prisma/index.js";
import authValidator from "../../middleware/authValidator.js";
import paymentController from "./payment.controller.js";

const router = express.Router();

// Initiate checkout (authenticated employers & job seekers)
router.post(
  "/initiate",
  authValidator(UserRole.EMPLOYER, UserRole.JOB_SEEKER),
  paymentController.initiatePayment,
);

// Callback endpoints called by SSLCommerz server (MUST be publicly accessible)
router.post("/success", paymentController.paymentSuccess);
router.post("/fail", paymentController.paymentFail);
router.post("/cancel", paymentController.paymentCancel);
router.post("/ipn", paymentController.paymentIpn);

// Transaction history (authenticated users & admins)
router.get(
  "/transactions",
  authValidator(UserRole.EMPLOYER, UserRole.JOB_SEEKER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  paymentController.getTransactionsList,
);

// Revenue stats (admins only)
router.get(
  "/stats",
  authValidator(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  paymentController.getPaymentStatsOverview,
);

export default router;
