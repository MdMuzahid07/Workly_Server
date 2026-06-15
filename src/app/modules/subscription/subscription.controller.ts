import { Request, Response } from "express";
import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import subscriptionService from "./subscription.service.js";

const getMySubscription = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as any).userId;
  const result = await subscriptionService.getMySubscription(userId);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription and entitlements fetched successfully",
    data: result,
  });
});

const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as any).userId;
  await subscriptionService.cancelSubscription(userId);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription cancelled successfully at period end",
    data: null,
  });
});

const adminAssignPlan = asyncHandler(async (req: Request, res: Response) => {
  const { userId, planId } = req.body;
  await subscriptionService.adminAssignPlan(userId, planId);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription assigned successfully by admin",
    data: null,
  });
});

export default {
  getMySubscription,
  cancelSubscription,
  adminAssignPlan,
};
