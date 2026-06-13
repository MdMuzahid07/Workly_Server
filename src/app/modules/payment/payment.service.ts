import crypto from "crypto";
import httpStatus from "http-status";
import SSLCommerzPayment from "sslcommerz-lts";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";
import config from "../../../config/index.js";
import {
  PaymentCategory,
  PaymentStatus,
  SubscriptionStatus,
} from "../../../generated/prisma/index.js";
import { InitiatePaymentPayload } from "./payment.interface.js";
import notificationService from "../notification/notification.service.js";

// Initialize SSLCommerz instance
const sslcz = new SSLCommerzPayment(
  config.sslcommerz.store_id,
  config.sslcommerz.store_passwd,
  config.sslcommerz.is_live,
);

/**
 * Initiates a new payment session
 */
const initiatePayment = async (
  payload: InitiatePaymentPayload,
  userId: string,
  companyId?: string,
) => {
  // Generate transaction ID: strictly <= 30 chars
  // TXN-[13 char epoch]-[4 char random] => 22 chars
  const tranId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Find user details to ensure accuracy
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // Pre-check plan or subscription info based on category
  let productName = "Premium Upgrade";
  if (payload.category === PaymentCategory.EMPLOYER_PLAN) {
    productName = `Employer ${payload.planId} Subscription`;
  } else {
    productName = `Seeker ${payload.planId} Premium Package`;
  }

  // Save the pending transaction in database
  const transaction = await prisma.paymentTransaction.create({
    data: {
      tranId,
      userId,
      companyId: payload.category === PaymentCategory.EMPLOYER_PLAN ? companyId || null : null,
      amount: typeof payload.amount === "string" ? parseFloat(payload.amount) : payload.amount,
      currency: payload.currency || "BDT",
      status: PaymentStatus.PENDING,
      category: payload.category,
      planId: payload.planId,
    },
  });

  // Backend callback endpoints
  const redirectFrontendUrl = encodeURIComponent(payload.frontendUrl || config.frontend_url);
  const successUrl = `${config.backend_url}/api/v1/payments/success?frontend_url=${redirectFrontendUrl}`;
  const failUrl = `${config.backend_url}/api/v1/payments/fail?frontend_url=${redirectFrontendUrl}`;
  const cancelUrl = `${config.backend_url}/api/v1/payments/cancel?frontend_url=${redirectFrontendUrl}`;
  const ipnUrl = `${config.backend_url}/api/v1/payments/ipn`;

  // SSLCommerz payment data structure
  const paymentData = {
    total_amount: payload.amount,
    currency: payload.currency || "BDT",
    tran_id: tranId,
    success_url: successUrl,
    fail_url: failUrl,
    cancel_url: cancelUrl,
    ipn_url: ipnUrl,
    // mandatory digital product attributes
    shipping_method: "NO",
    product_profile: "non-physical-goods",
    product_name: productName,
    product_category: "Digital Service",
    num_of_item: 1,
    // customer details
    cus_name: payload.cusName || user.fullName,
    cus_email: payload.cusEmail || user.email,
    cus_phone: payload.cusPhone || user.phone || "01700000000",
    cus_add1: payload.cusAdd1 || user.profile?.location || "Dhaka",
    cus_city: payload.cusCity || "Dhaka",
    cus_postcode: payload.cusPostcode || "1000",
    cus_country: payload.cusCountry || "Bangladesh",
  };

  try {
    const apiResponse = await sslcz.init(paymentData);

    if (apiResponse?.status === "SUCCESS" && apiResponse?.GatewayPageURL) {
      // Save sessionKey to database for independent query recoveries
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { sessionKey: apiResponse.sessionkey },
      });

      return {
        gatewayUrl: apiResponse.GatewayPageURL,
        tranId,
      };
    } else {
      console.error("SSLCommerz Init Error response:", apiResponse);
      const failedReason = apiResponse?.failedreason || "";
      let errorMessage = failedReason || "Failed to initialize secure payment session";

      if (
        failedReason.toLowerCase().includes("credential") ||
        failedReason.toLowerCase().includes("de-active") ||
        config.sslcommerz.store_id === "testbox"
      ) {
        errorMessage =
          "SSLCommerz Sandbox credentials are not configured or have expired. Please register for a free sandbox account at https://developer.sslcommerz.com/registration/ and set your SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWD in the server's .env file.";
      }

      throw new AppError(httpStatus.BAD_REQUEST, errorMessage);
    }
  } catch (error: any) {
    console.error("SSLCommerz Integration Exception:", error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error?.message || "Failed to contact payment gateway provider",
    );
  }
};

/**
 * Verifies callback payload signature to prevent request-forgery
 */
const verifyCallbackSignature = (payload: any): boolean => {
  const { verify_sign, verify_key } = payload;

  if (!verify_sign || !verify_key) {
    return false;
  }

  try {
    // 1. Split keys specified by verify_key
    const keys = verify_key.split(",");

    // 2. Sort the keys alphabetically
    keys.sort();

    // 3. Build a query string of key=value pairs
    const queryParts = keys.map((key: string) => {
      return `${key}=${payload[key] || ""}`;
    });

    // 4. Calculate MD5 hash of our store password
    const storePasswdHash = crypto
      .createHash("md5")
      .update(config.sslcommerz.store_passwd)
      .digest("hex");

    // 5. Append the password MD5 hash to the end of the parameters query string
    const stringToVerify = queryParts.join("&") + `&store_passwd=${storePasswdHash}`;

    // 6. Calculate MD5 of the final string
    const computedSignature = crypto.createHash("md5").update(stringToVerify).digest("hex");

    // 7. Match against the verify_sign from callback
    return computedSignature.toLowerCase() === verify_sign.toLowerCase();
  } catch (error) {
    console.error("Signature Validation Error:", error);
    return false;
  }
};

/**
 * Validates a payment transaction and upgrades user/company benefits
 */
const validatePayment = async (tranId: string, valId: string, payload: any) => {
  // 1. Fetch transaction record from DB
  const transaction = await prisma.paymentTransaction.findUnique({
    where: { tranId },
    include: { user: true },
  });

  if (!transaction) {
    throw new AppError(httpStatus.NOT_FOUND, "Transaction record not found in system");
  }

  // If already validated, bypass to avoid double upgrades
  if (transaction.status === PaymentStatus.VALIDATED) {
    return transaction;
  }

  // 2. Signature verification (Enforced in production; warnings only in sandbox)
  const isSignatureValid = verifyCallbackSignature(payload);
  if (!isSignatureValid) {
    console.warn("Callback signature mismatch detected!");
    if (config.sslcommerz.is_live) {
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Security Violation: Callback signature mismatch!",
      );
    } else {
      console.warn("Sandbox Mode: Bypassing signature mismatch for local testing.");
    }
  }

  // 3. Server-to-server transaction validation query
  const validationResult = await sslcz.validate({ val_id: valId });

  if (validationResult?.status !== "VALID" && validationResult?.status !== "VALIDATED") {
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: PaymentStatus.FAILED },
    });
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Transaction is invalid according to gateway validation",
    );
  }

  // 4. Multi-point checks: Strict amount and currency match
  const validatedAmount = Number(validationResult.amount);
  const validatedCurrency = validationResult.currency;

  if (validatedAmount !== transaction.amount || validatedCurrency !== transaction.currency) {
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: PaymentStatus.FAILED },
    });
    throw new AppError(httpStatus.BAD_REQUEST, "Security Violation: Amount or Currency mismatch!");
  }

  // 5. Check risk level
  const riskLevel = Number(validationResult.risk_level || 0);
  const targetStatus = riskLevel === 1 ? PaymentStatus.PENDING_REVIEW : PaymentStatus.VALIDATED;

  // 6. Upgrade privileges inside a secure database transaction
  const updatedTransaction = await prisma.$transaction(async (tx: any) => {
    // Update the transaction record
    const updatedTx = await tx.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: targetStatus,
        valId,
        cardType: validationResult.card_type,
        bankTranId: validationResult.bank_tran_id,
        storeAmount: Number(validationResult.store_amount || 0),
        riskLevel,
      },
    });

    // If marked for manual risk review, do not upgrade automatically
    if (targetStatus === PaymentStatus.PENDING_REVIEW) {
      console.warn(
        `SECURITY: Transaction ${tranId} marked as high risk. Upgrades held for manual audit.`,
      );
      return updatedTx;
    }

    // Allocate benefits
    if (transaction.category === PaymentCategory.EMPLOYER_PLAN) {
      if (!transaction.companyId) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "Company identification missing for corporate upgrade",
        );
      }

      // Ensure Plan exists in database
      let dbPlan = await tx.plan.findUnique({
        where: { name: transaction.planId },
      });

      if (!dbPlan) {
        const plans = {
          free: { maxActiveJobs: 1, maxUsers: 1 },
          starter: { maxActiveJobs: 5, maxUsers: 2 },
          pro: { maxActiveJobs: 15, maxUsers: 5 },
          enterprise: { maxActiveJobs: 9999, maxUsers: 9999 },
          emp_free: { maxActiveJobs: 1, maxUsers: 1 },
          emp_starter: { maxActiveJobs: 5, maxUsers: 2 },
          emp_pro: { maxActiveJobs: 15, maxUsers: 5 },
        };

        const planName = transaction.planId as keyof typeof plans;
        const planConfig = plans[planName] || { maxActiveJobs: 1, maxUsers: 1 };

        dbPlan = await tx.plan.create({
          data: {
            name: transaction.planId,
            description: `${transaction.planId} plan`,
            price: transaction.amount,
            currency: transaction.currency,
            features: planConfig.maxActiveJobs
              ? [
                  `${planConfig.maxActiveJobs} Active Job Listings`,
                  `Up to ${planConfig.maxUsers} Users`,
                ]
              : [],
            maxActiveJobs: planConfig.maxActiveJobs,
            maxUsers: planConfig.maxUsers,
          },
        });
      }

      const subscriptionStart = new Date();
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + 30); // 30-day billing cycle

      await tx.subscription.upsert({
        where: { companyId: transaction.companyId },
        update: {
          planId: dbPlan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate: subscriptionStart,
          endDate: subscriptionEnd,
        },
        create: {
          companyId: transaction.companyId,
          planId: dbPlan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate: subscriptionStart,
          endDate: subscriptionEnd,
        },
      });

      // Update User Premium Status
      await tx.user.update({
        where: { id: transaction.userId },
        data: { isPremium: true },
      });
    } else if (transaction.category === PaymentCategory.SEEKER_PREMIUM) {
      // Job Seeker Upgrade
      await tx.user.update({
        where: { id: transaction.userId },
        data: { isPremium: true },
      });
    }

    return updatedTx;
  });

  // Trigger Notifications after transaction commits successfully
  if (updatedTransaction.status === PaymentStatus.VALIDATED) {
    try {
      if (updatedTransaction.category === PaymentCategory.EMPLOYER_PLAN) {
        await notificationService.createNotification({
          userId: updatedTransaction.userId,
          type: "SYSTEM_ANNOUNCEMENT",
          title: "Business Subscription Activated! 🚀",
          message: `Congratulations! Your company's subscription has been activated successfully. Transaction: ${updatedTransaction.tranId}`,
        });
      } else if (updatedTransaction.category === PaymentCategory.SEEKER_PREMIUM) {
        await notificationService.createNotification({
          userId: updatedTransaction.userId,
          type: "SYSTEM_ANNOUNCEMENT",
          title: "Premium Subscription Activated! 👑",
          message: `Congratulations! Your Pro Candidate subscription has been activated successfully. Transaction: ${updatedTransaction.tranId}`,
        });
      }
    } catch (error) {
      console.error("Failed to send post-payment notification:", error);
    }
  }

  return updatedTransaction;
};

/**
 * Sets transaction status as failed
 */
const failPayment = async (tranId: string) => {
  return prisma.paymentTransaction.updateMany({
    where: { tranId, status: PaymentStatus.PENDING },
    data: { status: PaymentStatus.FAILED },
  });
};

/**
 * Sets transaction status as cancelled
 */
const cancelPayment = async (tranId: string) => {
  return prisma.paymentTransaction.updateMany({
    where: { tranId, status: PaymentStatus.PENDING },
    data: { status: PaymentStatus.CANCELLED },
  });
};

/**
 * Lazily expires stale PENDING transactions older than the given TTL (default 24h).
 * Runs non-blocking (fire-and-forget) so it never adds latency to the response.
 * Only expires transactions that never received a success/fail/cancel callback from SSLCommerz.
 */
const expireStaleTransactions = async (ttlHours = 24): Promise<void> => {
  const cutoff = new Date(Date.now() - ttlHours * 60 * 60 * 1000);
  await prisma.paymentTransaction.updateMany({
    where: {
      status: PaymentStatus.PENDING,
      createdAt: { lt: cutoff },
    },
    data: { status: PaymentStatus.CANCELLED },
  });
};

/**
 * Retrieves transactions for users or full stats for admins.
 *
 * Status filter mapping (UI → DB):
 *   PAID       → VALIDATED
 *   ABANDONED  → PENDING   (orphaned checkouts where user never completed payment)
 *   OVERDUE    → PENDING_REVIEW
 *   REFUNDED   → FAILED
 *   CANCELLED  → CANCELLED
 *
 * For admin roles, raw PENDING rows are excluded from the default view (no status filter)
 * because they represent in-flight or soon-to-be-expired abandoned checkouts — not
 * actionable data. Admins can explicitly filter by ABANDONED to inspect them.
 */
const getTransactions = async (
  userId: string,
  role: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
) => {
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  // Fire-and-forget stale expiry for admin requests only.
  // No await — never blocks the response.
  if (isAdmin) {
    expireStaleTransactions(24).catch((err) => console.error("[payment] stale expiry error:", err));
  }

  const skip = (page - 1) * limit;

  const whereQuery: any = {};
  if (!isAdmin) {
    whereQuery.userId = userId;
  }

  if (status) {
    if (status === "PAID") {
      whereQuery.status = PaymentStatus.VALIDATED;
    } else if (status === "ABANDONED") {
      // Abandoned = user started checkout but never completed it
      whereQuery.status = PaymentStatus.PENDING;
    } else if (status === "OVERDUE") {
      whereQuery.status = PaymentStatus.PENDING_REVIEW;
    } else if (status === "REFUNDED") {
      whereQuery.status = PaymentStatus.FAILED;
    } else if (status === "CANCELLED") {
      whereQuery.status = PaymentStatus.CANCELLED;
    } else {
      // Direct DB enum pass-through (for non-admin user history queries)
      whereQuery.status = status;
    }
  } else if (isAdmin) {
    // Default admin view: exclude raw PENDING (in-flight / abandoned checkouts).
    // Admins can still see them by explicitly selecting the ABANDONED filter.
    whereQuery.status = {
      not: PaymentStatus.PENDING,
    };
  }

  if (search) {
    whereQuery.OR = [
      {
        tranId: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        user: {
          fullName: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        user: {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        company: {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  const transactions = await prisma.paymentTransaction.findMany({
    where: whereQuery,
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { fullName: true, email: true },
      },
      company: {
        select: { name: true, logoUrl: true },
      },
    },
  });

  const total = await prisma.paymentTransaction.count({ where: whereQuery });

  return {
    transactions,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Gets payment statistics for admin overview — all computed via targeted DB aggregates
 */
const getPaymentStats = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Run all aggregates in parallel for minimum DB round-trips
  const [
    totalRevenueAgg,
    monthlyVolumeAgg,
    pendingAgg,
    validatedCount,
    failedCancelledCount,
    categoryBreakdown,
    cardBreakdown,
  ] = await Promise.all([
    // Total revenue: sum of all VALIDATED payments ever
    prisma.paymentTransaction.aggregate({
      where: { status: PaymentStatus.VALIDATED },
      _sum: { amount: true },
      _count: { id: true },
    }),
    // Monthly volume: sum of VALIDATED payments this calendar month
    prisma.paymentTransaction.aggregate({
      where: {
        status: PaymentStatus.VALIDATED,
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    }),
    // Pending: count + sum of PENDING transactions (unpaid invoices)
    prisma.paymentTransaction.aggregate({
      where: { status: PaymentStatus.PENDING },
      _sum: { amount: true },
      _count: { id: true },
    }),
    // Validated count for success rate numerator
    prisma.paymentTransaction.count({
      where: { status: PaymentStatus.VALIDATED },
    }),
    // Failed + Cancelled for success rate denominator
    prisma.paymentTransaction.count({
      where: { status: { in: [PaymentStatus.FAILED, PaymentStatus.CANCELLED] } },
    }),
    // Revenue by payment category
    prisma.paymentTransaction.groupBy({
      by: ["category"],
      where: { status: PaymentStatus.VALIDATED },
      _sum: { amount: true },
    }),
    // Payment method breakdown (card types)
    prisma.paymentTransaction.groupBy({
      by: ["cardType"],
      where: { status: PaymentStatus.VALIDATED, cardType: { not: null } },
      _count: { id: true },
    }),
  ]);

  const totalEarnings = totalRevenueAgg._sum.amount ?? 0;
  const totalValidatedCount = totalRevenueAgg._count.id ?? 0;
  const monthlyVolume = monthlyVolumeAgg._sum.amount ?? 0;
  const pendingAmount = pendingAgg._sum.amount ?? 0;
  const pendingCount = pendingAgg._count.id ?? 0;

  const totalAttempted = validatedCount + failedCancelledCount;
  const successRate = totalAttempted > 0 ? (validatedCount / totalAttempted) * 100 : 100;

  const categorySummary = categoryBreakdown.reduce((acc: any, row: any) => {
    acc[row.category] = row._sum.amount ?? 0;
    return acc;
  }, {});

  const cardSummary = cardBreakdown.reduce((acc: any, row: any) => {
    if (row.cardType) {
      acc[row.cardType] = row._count.id ?? 0;
    }
    return acc;
  }, {});

  return {
    totalEarnings,
    totalCount: totalValidatedCount,
    monthlyVolume,
    pendingAmount,
    pendingCount,
    successRate: Math.round(successRate * 10) / 10,
    categorySummary,
    cardSummary,
  };
};

export default {
  initiatePayment,
  validatePayment,
  failPayment,
  cancelPayment,
  getTransactions,
  getPaymentStats,
};
