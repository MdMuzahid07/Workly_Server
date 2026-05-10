import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import legalService from "./legal.service.js";

const getLegalDocument = asyncHandler(async (req, res) => {
  const result = await legalService.getLegalDocumentBySlug(req.params.slug as string);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Legal document retrieved successfully",
    data: result,
  });
});

const upsertLegalDocument = asyncHandler(async (req, res) => {
  const result = await legalService.upsertLegalDocument(req.params.slug as string, req.body);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Legal document updated successfully",
    data: result,
  });
});

const legalController = {
  getLegalDocument,
  upsertLegalDocument,
};

export default legalController;
