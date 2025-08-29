import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import jobService from "./job.service.js";

const createJob = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const payload = req.body;

  const result = await jobService.createJob(userId, payload);

  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Job post created successfully",
    data: result,
  });
});

const getJobs = asyncHandler(async (req, res) => {
  const filters = req.query;

  const result = await jobService.getJobs(filters);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Jobs fetched successfully",
    data: result,
  });
});

const jobController = {
  createJob,
  getJobs,
};

export default jobController;
