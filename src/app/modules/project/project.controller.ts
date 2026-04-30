import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import { projectService } from "./project.service.js";

const addProject = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const data = req.body;
  const result = await projectService.addProject(userId, data);
  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Project added successfully",
    data: result,
  });
});

const updateProject = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { projectId } = req.params;
  const data = req.body;
  const result = await projectService.updateProject(userId, projectId as string, data);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Project updated successfully",
    data: result,
  });
});

const deleteProject = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { projectId } = req.params;
  const result = await projectService.deleteProject(userId, projectId as string);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Project deleted successfully",
    data: result,
  });
});

export const projectController = {
  addProject,
  updateProject,
  deleteProject,
};
