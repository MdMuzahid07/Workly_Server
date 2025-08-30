import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import applicationService from "./application.service.js";

const createApplication = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const payload = req.body;

  const result = await applicationService.createApplication(userId, payload);

  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Application submitted successfully",
    data: result,
  });
});

const applicationController = {
  createApplication,
};

export default applicationController;
