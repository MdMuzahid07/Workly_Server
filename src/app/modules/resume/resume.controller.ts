import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import { resumeService } from "./resume.service.js";

// List all resumes for a user
const listResumes = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const result = await resumeService.listResumes(userId);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Resumes fetched successfully",
    data: result,
  });
});

// Upload a new resume
const uploadResume = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const file = req.file;
  const isDefault = req.body.isDefault === "true" || req.body.isDefault === true;
  if (!file) {
    return sendApiResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: "No file uploaded",
      data: null,
    });
  }
  const result = await resumeService.uploadResume(userId, file, isDefault);
  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Resume uploaded successfully",
    data: result,
  });
});

// Set a resume as default
const setDefaultResume = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { resumeId } = req.params;
  const result = await resumeService.setDefaultResume(userId, resumeId as string);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Default resume set successfully",
    data: result,
  });
});

// Stream resume PDF (proxied through server to avoid Cloudinary 401/CORS)
const streamResumeFile = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { resumeId } = req.params;
  await resumeService.streamResumeFile(userId, resumeId as string, res);
});

// Delete a resume
const deleteResume = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { resumeId } = req.params;
  const result = await resumeService.deleteResume(userId, resumeId as string);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Resume deleted successfully",
    data: result,
  });
});

const resumeController = {
  listResumes,
  uploadResume,
  setDefaultResume,
  streamResumeFile,
  deleteResume,
};
export default resumeController;
