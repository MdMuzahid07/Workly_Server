import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import { jobViewService } from "./jobView.service.js";

const logJobView = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user?.userId;
  const { jobId } = req.params;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  const result = await jobViewService.logJobView(jobId as string, userId, ip, userAgent);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Job view logged successfully",
    data: result,
  });
});

const getJobViewHistory = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;

  const result = await jobViewService.getJobViewHistory(userId);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Job view history fetched successfully",
    data: result,
  });
});

export const jobViewController = {
  logJobView,
  getJobViewHistory,
};
