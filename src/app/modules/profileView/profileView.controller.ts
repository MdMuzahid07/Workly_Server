import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import { profileViewService } from "./profileView.service.js";

const logProfileView = asyncHandler(async (req, res) => {
  //@ts-ignore
  const viewerId = req.user?.userId;
  const { viewedUserId } = req.params;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  const result = await profileViewService.logProfileView(
    viewedUserId as string,
    viewerId,
    ip,
    userAgent,
  );

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile view logged successfully",
    data: result,
  });
});

const getProfileViewStats = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { period } = req.query as { period: string };

  const result = await profileViewService.getProfileViewStats(userId, period);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile view stats fetched successfully",
    data: result,
  });
});

const getRecentVisitors = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;

  const result = await profileViewService.getRecentVisitors(userId);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Recent visitors fetched successfully",
    data: result,
  });
});

export const profileViewController = {
  logProfileView,
  getProfileViewStats,
  getRecentVisitors,
};
