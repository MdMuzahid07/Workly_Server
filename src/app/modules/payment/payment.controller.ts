import { Request, Response } from 'express';
import httpStatus from 'http-status';
import asyncHandler from '../../../utils/asyncHandler.js';
import sendApiResponse from '../../../utils/sendApiResponse.js';
import paymentService from './payment.service.js';
import prisma from '../../../utils/prismaClient.js';
import config from '../../../config/index.js';
import AppError from '../../error/AppError.js';

// Validate and sanitize frontend redirect URLs to prevent Open Redirect attacks
const getSafeRedirectUrl = (urlParam: unknown): string => {
  if (!urlParam || typeof urlParam !== 'string') {
    return config.frontend_url;
  }
  try {
    const targetUrl = new URL(urlParam);
    const targetOrigin = targetUrl.origin;

    // 1. Match configured frontend_url
    if (new URL(config.frontend_url).origin === targetOrigin) {
      return targetOrigin;
    }

    // 2. Match allowed CORS origins
    const isAllowed = config.allowed_origins.some((allowed: string) => {
      try {
        return new URL(allowed).origin === targetOrigin;
      } catch {
        return allowed.trim().toLowerCase() === targetOrigin.toLowerCase();
      }
    });

    if (isAllowed) {
      return targetOrigin;
    }
  } catch {
    return config.frontend_url;
  }
  return config.frontend_url;
};

// Initiate payment checkout session
const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const {
    planId,
    category,
    currency,
    cusName,
    cusEmail,
    cusPhone,
    cusAdd1,
    cusCity,
    cusPostcode,
    cusCountry,
    paymentChannel,
  } = req.body;

  let companyId: string | undefined;

  // If Employer, retrieve company ID dynamically
  if (role === 'EMPLOYER') {
    const employerProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!employerProfile?.companyId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Company profile must be set up before initiating subscription purchase.',
      );
    }
    companyId = employerProfile.companyId;
  }

  // Get frontendUrl dynamically from payload or request origin/referer
  let frontendUrl = req.body.frontendUrl || req.headers.origin;
  if (!frontendUrl && req.headers.referer) {
    try {
      frontendUrl = new URL(req.headers.referer).origin;
    } catch {
      // ignore invalid URL referers
    }
  }
  if (!frontendUrl) {
    frontendUrl = config.frontend_url;
  }

  // Get backendUrl dynamically from host headers
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host');
  const backendUrl = `${protocol}://${host}`;

  const result = await paymentService.initiatePayment(
    {
      planId,
      category,
      currency,
      cusName,
      cusEmail,
      cusPhone,
      cusAdd1,
      cusCity,
      cusPostcode,
      cusCountry,
      frontendUrl,
      backendUrl,
      paymentChannel,
    },
    userId,
    companyId,
  );

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment session initialized successfully',
    data: result,
  });
});

// Success redirect called by SSLCommerz
const paymentSuccess = asyncHandler(async (req: Request, res: Response) => {
  const { tran_id, val_id, amount } = req.body;
  const frontendUrl = getSafeRedirectUrl(req.query.frontend_url);

  try {
    await paymentService.validatePayment(tran_id, val_id, req.body);

    // HTTP 302 Redirect to Client Success Route
    return res.redirect(`${frontendUrl}/payment/success?tranId=${tran_id}&amount=${amount}`);
  } catch (error: any) {
    console.error('Success Callback Error:', error);
    return res.redirect(
      `${frontendUrl}/payment/fail?tranId=${tran_id || ''}&reason=${encodeURIComponent(
        error?.message || 'Verification Failed',
      )}`,
    );
  }
});

// Failure redirect called by SSLCommerz
const paymentFail = asyncHandler(async (req: Request, res: Response) => {
  const { tran_id } = req.body;
  await paymentService.failPayment(tran_id);
  const frontendUrl = getSafeRedirectUrl(req.query.frontend_url);

  return res.redirect(`${frontendUrl}/payment/fail?tranId=${tran_id || ''}`);
});

// Cancel redirect called by SSLCommerz
const paymentCancel = asyncHandler(async (req: Request, res: Response) => {
  const { tran_id } = req.body;
  await paymentService.cancelPayment(tran_id);
  const frontendUrl = getSafeRedirectUrl(req.query.frontend_url);

  return res.redirect(`${frontendUrl}/payment/cancel?tranId=${tran_id || ''}`);
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
      message: 'IPN verified and transaction completed successfully',
    });
  } catch (error: any) {
    console.error('IPN Process Exception:', error);
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: error?.message || 'Failed to process IPN hook',
    });
  }
});

// Fetch user order history
const getTransactionsList = asyncHandler(async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const page = parseInt((req.query.page as string) || '1');
  const limit = parseInt((req.query.limit as string) || '10');
  const search = req.query.search as string;
  const status = req.query.status as string;

  const result = await paymentService.getTransactions(userId, role, page, limit, search, status);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Transaction history retrieved successfully',
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
    message: 'Payment statistics overview retrieved successfully',
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
