import httpStatus from "http-status";
import type { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import uploadService from "./upload.service.js";

const single = asyncHandler(async (req: Request, res: Response) => {
  const result = await uploadService.handleSingleUpload(req);
  sendApiResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "File uploaded successfully",
    data: result,
  });
});

const multiple = asyncHandler(async (req: Request, res: Response) => {
  const result = await uploadService.handleMultipleUpload(req);
  sendApiResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Files uploaded successfully",
    data: result,
  });
});

const uploadController = { single, multiple };
export default uploadController;
