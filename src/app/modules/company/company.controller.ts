import httpStatus from 'http-status';
import asyncHandler from '../../../utils/asyncHandler.js';
import sendApiResponse from '../../../utils/sendApiResponse.js';
import companyService from './company.service.js';
import { employerAnalyticsQuery } from './company.validation.js';

const getCompanies = asyncHandler(async (req, res) => {
  const query = req.query;

  const { data, meta } = await companyService.getCompanies(query);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Companies fetched successfully',
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
    message: 'Company created successfully',
    data: result,
  });
});

const getCompanyBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params as { slug: string };

  const result = await companyService.getCompanyBySlug(slug as string);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company fetched successfully',
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
    message: 'Company deleted successfully, including jobs posted by the company',
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
    message: 'Company updated successfully',
    data: result,
  });
});

const addTeamMember = asyncHandler(async (req, res) => {
  //@ts-ignore
  const adminId = req.user.userId;
  const { companyId } = req.params as { companyId: string };
  const memberEmail = req.body.memberEmail ?? req.body.employeeEmail;
  const userRole = req.body.userRole;

  const result = await companyService.addTeamMember(companyId, adminId, memberEmail, userRole);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Team member added successfully',
    data: result,
  });
});

const removeTeamMember = asyncHandler(async (req, res) => {
  //@ts-ignore
  const adminId = req.user.userId;
  const { companyId, memberId } = req.params as {
    companyId: string;
    memberId: string;
  };

  const result = await companyService.removeTeamMember(companyId, adminId, memberId);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Team member removed successfully',
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
    message: 'Company overview statistics fetched successfully',
    data: result,
  });
});

const getEmployerAnalytics = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const parsed = employerAnalyticsQuery.safeParse(req.query);
  const data = parsed.success
    ? parsed.data
    : {
        period: '30d' as const,
        jobSortBy: 'applications' as const,
        jobSortOrder: 'desc' as const,
        jobSearch: undefined,
        jobPage: '1',
        jobLimit: '10',
      };

  const result = await companyService.getEmployerAnalytics(
    userId,
    data.period,
    data.jobSortBy,
    data.jobSortOrder,
    data.jobSearch,
    parseInt(data.jobPage),
    parseInt(data.jobLimit),
  );

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employer analytics fetched successfully',
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
    message: 'Company fetched successfully',
    data: result,
  });
});

// Get company settings
const getSettings = asyncHandler(async (req, res) => {
  // Only allow access to own company settings
  const result = await companyService.getSettings(req.params.companyId as string);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company settings fetched successfully',
    data: result,
  });
});

// Update company settings
const updateSettings = asyncHandler(async (req, res) => {
  // Only allow access to own company settings
  const result = await companyService.updateSettings(req.params.companyId as string, req.body);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company settings updated successfully',
    data: result,
  });
});

const companyController = {
  getCompanies,
  createCompany,
  getCompanyBySlug,
  deleteCompanyById,
  updateCompanyById,
  addTeamMember,
  removeTeamMember,
  getCompanyOverviewStatistics,
  getEmployerAnalytics,
  getMyCompany,
  getSettings,
  updateSettings,
};

export default companyController;
