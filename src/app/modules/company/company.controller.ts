import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import companyService from "./company.service.js";
import { employerAnalyticsQuery } from "./company.validation.js";

const getCompanies = asyncHandler(async (req, res) => {
  const query = req.query;

  const { data, meta } = await companyService.getCompanies(query);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Companies fetched successfully",
    data,
    meta,
  });
});

const createCompany = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const payload = req.body;

  const result = await companyService.createCompany(userId, payload);

  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Company created successfully",
    data: result,
  });
});

const getCompanyBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params as { slug: string };

  const result = await companyService.getCompanyBySlug(slug as string);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Company fetched successfully",
    data: result,
  });
});

const deleteCompanyById = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { companyId } = req.params as { companyId: string };

  const result = await companyService.deleteCompanyById(userId, companyId);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Company deleted successfully, including jobs posted by the company",
    data: result,
  });
});

const updateCompanyById = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { companyId } = req.params as { companyId: string };
  const payload = req.body;

  const result = await companyService.updateCompanyById(userId, companyId, payload);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Company updated successfully",
    data: result,
  });
});

const addEmployee = asyncHandler(async (req, res) => {
  //@ts-ignore
  const adminId = req.user.userId;
  const { companyId } = req.params as { companyId: string };
  const employeeEmail = req.body.employeeEmail;
  const userRole = req.body.userRole;

  const result = await companyService.addEmployee(companyId, adminId, employeeEmail, userRole);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Employee added successfully",
    data: result,
  });
});

const removeEmployee = asyncHandler(async (req, res) => {
  //@ts-ignore
  const adminId = req.user.userId;
  const { companyId } = req.params as { companyId: string };
  const employeeId = req.body.employeeEmail;

  const result = await companyService.removeEmployee(companyId, adminId, employeeId);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Employee removed successfully",
    data: result,
  });
});

const getCompanyOverviewStatistics = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;

  const result = await companyService.getCompanyOverviewStatistics(userId);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Company overview statistics fetched successfully",
    data: result,
  });
});

const getEmployerAnalytics = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const parsed = employerAnalyticsQuery.safeParse(req.query);
  const period = parsed.success ? parsed.data.period : "30d";

  const result = await companyService.getEmployerAnalytics(userId, period);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Employer analytics fetched successfully",
    data: result,
  });
});

const getMyCompany = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;

  const result = await companyService.getMyCompany(userId);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Company fetched successfully",
    data: result,
  });
});

// Get company settings
const getSettings = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  // Only allow access to own company settings
  const result = await companyService.getSettings(req.params.companyId as string);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Company settings fetched successfully",
    data: result,
  });
});

// Update company settings
const updateSettings = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  // Only allow access to own company settings
  const result = await companyService.updateSettings(req.params.companyId as string, req.body);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Company settings updated successfully",
    data: result,
  });
});

const companyController = {
  getCompanies,
  createCompany,
  getCompanyBySlug,
  deleteCompanyById,
  updateCompanyById,
  addEmployee,
  removeEmployee,
  getCompanyOverviewStatistics,
  getEmployerAnalytics,
  getMyCompany,
  getSettings,
  updateSettings,
};

export default companyController;
