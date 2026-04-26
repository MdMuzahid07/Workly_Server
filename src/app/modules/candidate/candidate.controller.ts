import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import candidateService from "./candidate.service.js";

const getAllCandidates = asyncHandler(async (req, res) => {
  const employerId = (req.user as any)?.userId;
  const result = await candidateService.getAllCandidates(req.query, employerId);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Candidates fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getCandidateById = asyncHandler(async (req, res) => {
  const employerId = (req.user as any)?.userId;
  const result = await candidateService.getCandidateById(req.params.id as string, employerId);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Candidate details fetched successfully",
    data: result,
  });
});

const toggleSaveCandidate = asyncHandler(async (req, res) => {
  const employerId = (req.user as any).userId;
  const { candidateId } = req.body;
  const result = await candidateService.toggleSaveCandidate(employerId, candidateId);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const getSavedCandidates = asyncHandler(async (req, res) => {
  const employerId = (req.user as any).userId;
  const result = await candidateService.getSavedCandidates(employerId, req.query);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Saved candidates fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const candidateController = {
  getAllCandidates,
  getCandidateById,
  toggleSaveCandidate,
  getSavedCandidates,
};

export default candidateController;
