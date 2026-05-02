import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import { workExperienceService } from "./workExperience.service.js";

const addWorkExperience = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const data = req.body;
  const result = await workExperienceService.addWorkExperience(userId, data);
  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Work experience added successfully",
    data: result,
  });
});

const updateWorkExperience = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { experienceId } = req.params;
  const data = req.body;
  const result = await workExperienceService.updateWorkExperience(
    userId,
    experienceId as string,
    data,
  );
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Work experience updated successfully",
    data: result,
  });
});

const deleteWorkExperience = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { experienceId } = req.params;
  const result = await workExperienceService.deleteWorkExperience(userId, experienceId as string);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Work experience deleted successfully",
    data: result,
  });
});

export const workExperienceController = {
  addWorkExperience,
  updateWorkExperience,
  deleteWorkExperience,
};
