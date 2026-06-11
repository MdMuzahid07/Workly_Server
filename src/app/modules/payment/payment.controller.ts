import { Request, Response } from "express";
import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import paymentService from "./payment.service.js";
import prisma from "../../../utils/prismaClient.js";
import config from "../../../config/index.js";
import AppError from "../../error/AppError.js";

// Initiate payment checkout session
const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const {
    planId,
    category,
    amount,
    currency,
    cusName,
    cusEmail,
    cusPhone,
    cusAdd1,
    cusCity,
    cusPostcode,
    cusCountry,
  } = req.body;

  let companyId: string | undefined;

  // If Employer, retrieve company ID dynamically
  if (role === "EMPLOYER") {
    const employerProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!employerProfile?.companyId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Company profile must be set up before initiating subscription purchase.",
      );
    }
    companyId = employerProfile.companyId;
  }

  const result = await paymentService.initiatePayment(
    {
      planId,
      category,
      amount,
      currency,
      cusName,
      cusEmail,
      cusPhone,
      cusAdd1,
      cusCity,
      cusPostcode,
      cusCountry,
    },
    userId,
    companyId,
  );

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment session initialized successfully",
    data: result,
  });
});

// Success redirect called by SSLCommerz
const paymentSuccess = asyncHandler(async (req: Request, res: Response) => {
  const { tran_id, val_id, amount } = req.body;

  try {
    await paymentService.validatePayment(tran_id, val_id, req.body);

    // HTTP 302 Redirect to Client Success Route
    return res.redirect(
      `${config.frontend_url}/payment/success?tranId=${tran_id}&amount=${amount}`,
    );
  } catch (error: any) {
    console.error("Success Callback Error:", error);
    return res.redirect(
      `${config.frontend_url}/payment/fail?tranId=${tran_id || ""}&reason=${encodeURIComponent(
        error?.message || "Verification Failed",
      )}`,
    );
  }
});

// Failure redirect called by SSLCommerz
const paymentFail = asyncHandler(async (req: Request, res: Response) => {
  const { tran_id } = req.body;
  await paymentService.failPayment(tran_id);

  return res.redirect(`${config.frontend_url}/payment/fail?tranId=${tran_id || ""}`);
});

// Cancel redirect called by SSLCommerz
const paymentCancel = asyncHandler(async (req: Request, res: Response) => {
  const { tran_id } = req.body;
  await paymentService.cancelPayment(tran_id);

  return res.redirect(`${config.frontend_url}/payment/cancel?tranId=${tran_id || ""}`);
});

// IPN background handler called directly by SSLCommerz
const paymentIpn = asyncHandler(async (req: Request, res: Response) => {
  const { tran_id, val_id } = req.body;

  try {
    if (tran_id && val_id) {
      await paymentService.validatePayment(tran_id, val_id, req.body);
    }

    return res.status(httpStatus.OK).json({
      success: true,
      message: "IPN verified and transaction completed successfully",
    });
  } catch (error: any) {
    console.error("IPN Process Exception:", error);
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: error?.message || "Failed to process IPN hook",
    });
  }
});

// Fetch user order history
const getTransactionsList = asyncHandler(async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const page = parseInt((req.query.page as string) || "1");
  const limit = parseInt((req.query.limit as string) || "10");
  const search = req.query.search as string;
  const status = req.query.status as string;

  const result = await paymentService.getTransactions(userId, role, page, limit, search, status);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Transaction history retrieved successfully",
    data: result.transactions,
    meta: result.meta,
  });
});

// Fetch admin payment statistics
const getPaymentStatsOverview = asyncHandler(async (_req: Request, res: Response) => {
  const result = await paymentService.getPaymentStats();

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment statistics overview retrieved successfully",
    data: result,
  });
});

export default {
  initiatePayment,
  paymentSuccess,
  paymentFail,
  paymentCancel,
  paymentIpn,
  getTransactionsList,
  getPaymentStatsOverview,
};
