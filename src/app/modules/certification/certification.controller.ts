import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import { certificationService } from "./certification.service.js";

const addCertification = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const data = req.body;
  const result = await certificationService.addCertification(userId, data);
  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Certification added successfully",
    data: result,
  });
});

const updateCertification = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { certificationId } = req.params;
  const data = req.body;
  const result = await certificationService.updateCertification(
    userId,
    certificationId as string,
    data,
  );
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Certification updated successfully",
    data: result,
  });
});

const deleteCertification = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { certificationId } = req.params;
  const result = await certificationService.deleteCertification(userId, certificationId as string);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Certification deleted successfully",
    data: result,
  });
});

export const certificationController = {
  addCertification,
  updateCertification,
  deleteCertification,
};
