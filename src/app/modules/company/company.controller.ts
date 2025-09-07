import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import companyService from "./company.service.js";

const createCompany = asyncHandler(async (req, res) => {
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

const companyController = {
  createCompany,
  getCompanyBySlug,
  deleteCompanyById,
  updateCompanyById,
  addEmployee,
  removeEmployee,
};

export default companyController;
