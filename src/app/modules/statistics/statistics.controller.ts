import { Request, Response } from "express";
import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import statisticsService from "./statistics.service.js";

const getLandingPageStats = asyncHandler(async (_req: Request, res: Response) => {
  const result = await statisticsService.getLandingPageStats();
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Landing page statistics fetched successfully",
    data: result,
  });
});

export default {
  getLandingPageStats,
};
