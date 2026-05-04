import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import adminService from "./admin.service.js";
import { companyIdParams, employerAdminListQuery, userIdParams } from "./admin.validation.js";

const getEmployerStats = asyncHandler(async (_req, res) => {
  const result = await adminService.getEmployerStats();
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Employer stats fetched successfully",
    data: result,
  });
});

const getEmployersList = asyncHandler(async (req, res) => {
  const parsed = employerAdminListQuery.safeParse(req.query);
  const query = parsed.success ? parsed.data : (req.query as any);
  const result = await adminService.getEmployersList(query);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Employers fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const verifyCompany = asyncHandler(async (req, res) => {
  const parsed = companyIdParams.safeParse(req.params);
  const companyId = parsed.success ? parsed.data.companyId : (req.params.companyId as string);
  const result = await adminService.verifyCompany(companyId);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Company verified successfully",
    data: result,
  });
});

const suspendEmployer = asyncHandler(async (req, res) => {
  const parsed = userIdParams.safeParse(req.params);
  const userId = parsed.success ? parsed.data.userId : (req.params.userId as string);
  const result = await adminService.setEmployerActive(userId, false);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Employer suspended successfully",
    data: result,
  });
});

const reactivateEmployer = asyncHandler(async (req, res) => {
  const parsed = userIdParams.safeParse(req.params);
  const userId = parsed.success ? parsed.data.userId : (req.params.userId as string);
  const result = await adminService.setEmployerActive(userId, true);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Employer reactivated successfully",
    data: result,
  });
});

const deleteEmployer = asyncHandler(async (req, res) => {
  const parsed = userIdParams.safeParse(req.params);
  const userId = parsed.success ? parsed.data.userId : (req.params.userId as string);
  const result = await adminService.deleteEmployer(userId);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Employer deleted successfully",
    data: result,
  });
});

const adminController = {
  getEmployerStats,
  getEmployersList,
  verifyCompany,
  suspendEmployer,
  reactivateEmployer,
  deleteEmployer,
};

export default adminController;
