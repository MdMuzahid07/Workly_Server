import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import profileService from "./profile.service.js";

const createProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const result = await profileService.createProfile(userId, req.body);

  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,

    message: "Profile created successfully",
    data: result,
  });
});

const myProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const result = await profileService.myProfile(userId);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile fetched successfully",
    data: result,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const payload = req.body;

  const result = await profileService.updateMyProfile(userId, payload);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const saveJob = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { jobId } = req.body;

  const result = await profileService.saveJobs(userId, jobId);

  const statusCode = result.action === "saved" ? httpStatus.CREATED : httpStatus.OK;

  sendApiResponse(res, {
    statusCode,
    success: true,
    message: result.message,
    data: {
      action: result.action,
      savedJob: result.savedJob,
    },
  });
});

const getSavedJobs = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const query = req.query;

  const result = await profileService.getSavedJobs(userId, query);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Saved jobs fetched successfully",
    data: result.savedJobs,
    meta: result.meta,
  });
});

const updateSavedJob = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { jobId } = req.params;
  const payload = req.body;

  const result = await profileService.updateSavedJob(userId, jobId as string, payload);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Saved job updated successfully",
    data: result,
  });
});

const profileController = {
  createProfile,
  myProfile,
  updateProfile,
  saveJob,
  getSavedJobs,
  updateSavedJob,
};
export default profileController;
