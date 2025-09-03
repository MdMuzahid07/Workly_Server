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
  const query = req.query;

  const result = await jobService.getJobs(query);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Jobs fetched successfully",
    data: result,
  });
});

const getJobById = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const result = await jobService.getJobById(jobId as string);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Jobs fetched successfully using id",
    data: result,
  });
});

const updateJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user.userId;
  const payload = req.body;

  const result = await jobService.updateJob(userId, jobId as string, payload);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Job updated successfully",
    data: result,
  });
});

const jobController = {
  createJob,
  getJobs,
  getJobById,
  updateJob,
};

export default jobController;
