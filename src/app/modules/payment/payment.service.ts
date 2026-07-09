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
  PlanType,
} from "../../../generated/prisma/index.js";
import { InitiatePaymentPayload } from "./payment.interface.js";
import notificationService from "../notification/notification.service.js";
import { EntitlementService } from "../../../services/entitlement.service.js";

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

  // ── First-time package discount calculated 100% from backend ────────────────
  // Lookup target plan configuration in database to obtain price & discount configs
  const mappedPlanId =
    payload.planId === "cand_starter"
      ? "Starter"
      : payload.planId === "cand_pro"
        ? "Pro"
        : payload.planId === "cand_elite" || payload.planId === "cand_job_seeker_max"
          ? "Premium"
          : payload.planId;

  const dbPlan = await prisma.plan.findFirst({
    where: {
      name: {
        equals: mappedPlanId,
        mode: "insensitive",
      },
      planType:
        payload.category === PaymentCategory.EMPLOYER_PLAN
          ? PlanType.EMPLOYER
          : PlanType.JOB_SEEKER,
    },
  });

  // ── Production-grade safety check: Validate target plan purchase eligibility ──
  if (payload.category === PaymentCategory.EMPLOYER_PLAN) {
    if (!companyId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Company identification is required to purchase subscriptions.",
      );
    }
  }

  let finalAmount =
    typeof payload.amount === "string" ? parseFloat(payload.amount) : payload.amount;

  if (dbPlan && payload.category === PaymentCategory.SEEKER_PREMIUM) {
    const planFeatures = dbPlan.features as any;
    const discountPercent = Number(planFeatures?.firstTimeDiscountPercent || 0);

    if (discountPercent > 0) {
      // Check if user qualifies (zero previously validated SEEKER_PREMIUM packages)
      const prevValidatedCount = await prisma.paymentTransaction.count({
        where: {
          userId,
          category: PaymentCategory.SEEKER_PREMIUM,
          status: PaymentStatus.VALIDATED,
        },
      });

      if (prevValidatedCount === 0) {
        // Apply the discount percent and round to flat integer (no fractions allowed)
        const discountAmount = dbPlan.price * (discountPercent / 100);
        finalAmount = Math.floor(dbPlan.price - discountAmount);
        console.log(
          `[Payment] First-time ${discountPercent}% discount applied dynamically for user ${userId} on plan ${dbPlan.name}: ৳${finalAmount} (regular ৳${dbPlan.price})`,
        );
      }
    }
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
      amount: finalAmount,
      currency: payload.currency || "BDT",
      status: PaymentStatus.PENDING,
      category: payload.category,
      planId: payload.planId,
    },
  });

  // Backend callback endpoints
  const redirectBackendUrl = payload.backendUrl || config.backend_url;
  const redirectFrontendUrl = encodeURIComponent(payload.frontendUrl || config.frontend_url);
  const successUrl = `${redirectBackendUrl}/api/v1/payments/success?frontend_url=${redirectFrontendUrl}`;
  const failUrl = `${redirectBackendUrl}/api/v1/payments/fail?frontend_url=${redirectFrontendUrl}`;
  const cancelUrl = `${redirectBackendUrl}/api/v1/payments/cancel?frontend_url=${redirectFrontendUrl}`;
  const ipnUrl = `${redirectBackendUrl}/api/v1/payments/ipn`;

  // SSLCommerz payment data structure
  const basePaymentData = {
    total_amount: finalAmount,
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

  // Map frontend selected channel to SSLCommerz card parameters for direct landing bypass
  let sslCardName: string | undefined = undefined;
  if (payload.paymentChannel) {
    const ch = payload.paymentChannel.toLowerCase();
    if (ch === "bkash") sslCardName = "bkash";
    else if (ch === "nagad") sslCardName = "nagad";
    else if (ch === "rocket") sslCardName = "dbblrocket";
    else if (ch === "cards") sslCardName = "visa,mastercard,dbblnexus,amex";
  }

  const paymentData = {
    ...basePaymentData,
    ...(sslCardName ? { multi_card_name: sslCardName } : {}),
  };

  try {
    const apiResponse = await sslcz.init(paymentData);

    if (apiResponse?.status === "SUCCESS" && apiResponse?.GatewayPageURL) {
      // Save sessionKey to database for independent query recoveries
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { sessionKey: apiResponse.sessionkey },
      });

      // ── Resolve Direct Gateway URL ──
      let finalGatewayUrl = apiResponse.GatewayPageURL;

      if (sslCardName) {
        // 1. Try to find the exact direct URL in the 'desc' array
        if (Array.isArray(apiResponse.desc)) {
          const matchedGw = apiResponse.desc.find(
            (item: any) => item.gw?.toLowerCase() === sslCardName?.toLowerCase(),
          );
          if (matchedGw?.redirectGatewayURL) {
            finalGatewayUrl = matchedGw.redirectGatewayURL;
          }
        }

        // 2. Fallback: Construct it by appending the gateway key to the base redirectGatewayURL
        if (finalGatewayUrl === apiResponse.GatewayPageURL && apiResponse.redirectGatewayURL) {
          finalGatewayUrl = apiResponse.redirectGatewayURL + sslCardName;
        }
      }

      console.info(
        `[Payment] Initiated payment session: channel: ${payload.paymentChannel || "DEFAULT"} | directUrl: ${finalGatewayUrl}`,
      );

      return {
        gatewayUrl: finalGatewayUrl,
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
    // Concurrency / Idempotency guard: Re-fetch transaction state inside transaction block
    const currentTx = await tx.paymentTransaction.findUnique({
      where: { id: transaction.id },
    });

    if (currentTx.status === PaymentStatus.VALIDATED) {
      return currentTx;
    }

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
      const mappedPlanName =
        transaction.planId === "emp_starter" || transaction.planId === "emp_pro"
          ? "Growth"
          : transaction.planId === "emp_enterprise" || transaction.planId === "emp_ultimate"
            ? "Enterprise"
            : transaction.planId;
      let dbPlan = await tx.plan.findUnique({
        where: {
          name_planType: {
            name: mappedPlanName,
            planType: PlanType.EMPLOYER,
          },
        },
      });

      if (!dbPlan) {
        throw new AppError(httpStatus.NOT_FOUND, `Plan '${mappedPlanName}' not found in database.`);
      }

      // 1. Check for existing subscription to determine if we should stack the validity
      const existingSub = await tx.subscription.findUnique({
        where: { companyId: transaction.companyId },
      });

      const subscriptionStart = new Date();
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + 30); // 30-day billing cycle

      let finalStart = subscriptionStart;
      let finalEnd = subscriptionEnd;

      if (
        existingSub &&
        existingSub.status === SubscriptionStatus.ACTIVE &&
        existingSub.planId === dbPlan.id &&
        existingSub.endDate &&
        existingSub.endDate > new Date()
      ) {
        // Same plan is active and not yet expired: STACK / EXTEND validity!
        finalStart = existingSub.startDate;
        const newEnd = new Date(existingSub.endDate);
        newEnd.setDate(newEnd.getDate() + 30);
        finalEnd = newEnd;
        console.log(
          `[Payment] Stacking subscription for company ${transaction.companyId}. Extending endDate from ${existingSub.endDate.toISOString()} to ${finalEnd.toISOString()}`,
        );
      }

      const subscription = await tx.subscription.upsert({
        where: { companyId: transaction.companyId },
        update: {
          planId: dbPlan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate: finalStart,
          endDate: finalEnd,
          cancelAtPeriodEnd: false,
          renewalReminderSentAt: null, // Reset reminder flag for the new period
        },
        create: {
          companyId: transaction.companyId,
          planId: dbPlan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate: finalStart,
          endDate: finalEnd,
          cancelAtPeriodEnd: false,
          renewalReminderSentAt: null,
        },
      });

      // Create Invoice
      await tx.invoice.create({
        data: {
          companyId: transaction.companyId,
          subscriptionId: subscription.id,
          invoiceNumber: `INV-${transaction.tranId}`,
          amount: transaction.amount,
          currency: transaction.currency,
          status: "PAID",
          paidAt: new Date(),
        },
      });

      // Update User Premium Status
      await tx.user.update({
        where: { id: transaction.userId },
        data: { isPremium: true },
      });
    } else if (transaction.category === PaymentCategory.SEEKER_PREMIUM) {
      // Ensure Plan exists in database
      // Map legacy planIds and current direct plan names through to DB name
      const mappedPlanName =
        transaction.planId === "cand_starter"
          ? "Starter"
          : transaction.planId === "cand_pro"
            ? "Pro"
            : transaction.planId === "cand_elite" || transaction.planId === "cand_job_seeker_max"
              ? "Premium"
              : transaction.planId; // Direct names (Starter/Pro/Premium) pass through
      let dbPlan = await tx.plan.findUnique({
        where: {
          name_planType: {
            name: mappedPlanName,
            planType: PlanType.JOB_SEEKER,
          },
        },
      });

      if (!dbPlan) {
        throw new AppError(httpStatus.NOT_FOUND, `Plan '${mappedPlanName}' not found in database.`);
      }

      // Use durationMonths from plan features to set the correct subscription period
      const planFeatures = dbPlan.features as any;
      const durationMonths =
        typeof planFeatures?.durationMonths === "number" && planFeatures.durationMonths > 0
          ? planFeatures.durationMonths
          : 1;

      // 1. Check for existing subscription to determine if we should stack the validity
      const existingUserSub = await tx.userSubscription.findUnique({
        where: { userId: transaction.userId },
      });

      const subscriptionStart = new Date();
      const subscriptionEnd = new Date();
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + durationMonths);

      let finalStart = subscriptionStart;
      let finalEnd = subscriptionEnd;

      if (
        existingUserSub &&
        existingUserSub.status === SubscriptionStatus.ACTIVE &&
        existingUserSub.planId === dbPlan.id &&
        existingUserSub.endDate &&
        existingUserSub.endDate > new Date()
      ) {
        // Same plan is active and not yet expired: STACK / EXTEND validity!
        finalStart = existingUserSub.startDate;
        const newEnd = new Date(existingUserSub.endDate);
        newEnd.setMonth(newEnd.getMonth() + durationMonths);
        finalEnd = newEnd;
        console.log(
          `[Payment] Stacking subscription for user ${transaction.userId}. Extending endDate from ${existingUserSub.endDate.toISOString()} to ${finalEnd.toISOString()}`,
        );
      }

      const userSub = await tx.userSubscription.upsert({
        where: { userId: transaction.userId },
        update: {
          planId: dbPlan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate: finalStart,
          endDate: finalEnd,
          cancelAtPeriodEnd: false,
          renewalReminderSentAt: null, // Reset reminder flag for the new period
        },
        create: {
          userId: transaction.userId,
          planId: dbPlan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate: finalStart,
          endDate: finalEnd,
          cancelAtPeriodEnd: false,
          renewalReminderSentAt: null,
        },
      });

      // Create Invoice
      await tx.invoice.create({
        data: {
          userSubscriptionId: userSub.id,
          invoiceNumber: `INV-SEEKER-${transaction.tranId}`,
          amount: transaction.amount,
          currency: transaction.currency,
          status: "PAID",
          paidAt: new Date(),
        },
      });

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

  // Invalidate entitlement cache
  EntitlementService.invalidateCache(transaction.userId);

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
