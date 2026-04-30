import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import jobService from "./job.service.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../../../config/index.js";

const extractUserId = (req: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    if (!token) return null;
    const decoded = jwt.verify(token, config.jwt_secret as string) as JwtPayload;
    return decoded.userId;
  } catch (e) {
    return null;
  }
};

const createJob = asyncHandler(async (req, res) => {
  //@ts-ignore
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
  const userId = extractUserId(req);
  const { data, meta } = await jobService.getJobs(req.query, userId);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Jobs fetched successfully",
    data,
    meta,
  });
});

const getMyJobs = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { data, meta } = await jobService.getMyJobs(userId, req.query);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Employer jobs fetched successfully",
    data,
    meta,
  });
});

const getJobById = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const userId = extractUserId(req);

  const result = await jobService.getJobById(jobId as string, userId);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Jobs fetched successfully using id",
    data: result,
  });
});

const updateJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  //@ts-ignore
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

const deleteJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  //@ts-ignore
  const userId = req.user.userId;

  await jobService.deleteJob(userId, jobId as string);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Job deleted successfully",
  });
});

const jobController = {
  createJob,
  getJobs,
  getMyJobs,
  getJobById,
  updateJob,
  deleteJob,
};

export default jobController;
