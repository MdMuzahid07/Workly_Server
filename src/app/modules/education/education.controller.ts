import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import { educationService } from "./education.service.js";

// Add education entry
const addEducation = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const data = req.body;
  const result = await educationService.addEducation(userId, data);
  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Education entry added successfully",
    data: result,
  });
});

// Update education entry
const updateEducation = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { educationId } = req.params;
  const data = req.body;
  const result = await educationService.updateEducation(userId, educationId as string, data);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Education entry updated successfully",
    data: result,
  });
});

// Delete education entry
const deleteEducation = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { educationId } = req.params;
  const result = await educationService.deleteEducation(userId, educationId as string);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Education entry deleted successfully",
    data: result,
  });
});

const educationController = {
  addEducation,
  updateEducation,
  deleteEducation,
};
export default educationController;
