import httpStatus from 'http-status';
import asyncHandler from '../../../utils/asyncHandler.js';
import sendApiResponse from '../../../utils/sendApiResponse.js';
import AppError from '../../error/AppError.js';
import { AdminActor } from './admin.interface.js';
import adminService from './admin.service.js';
import {
  adminJobListQuery,
  auditLogQuery,
  companyIdParams,
  createStaffZodSchema,
  employerAdminListQuery,
  jobSeekerAdminListQuery,
  staffAdminListQuery,
  updateStaffRoleSchema,
  userIdParams,
} from './admin.validation.js';

const getEmployerStats = asyncHandler(async (_req, res) => {
  const result = await adminService.getEmployerStats();
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employer stats fetched successfully',
    data: result,
  });
});

const getEmployersList = asyncHandler(async (req, res) => {
  const parsed = employerAdminListQuery.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid query parameters');
  }
  const result = await adminService.getEmployersList(parsed.data);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employers fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const verifyCompany = asyncHandler(async (req, res) => {
  const parsed = companyIdParams.safeParse(req.params);
  const companyId = parsed.success ? parsed.data.companyId : (req.params.companyId as string);
  const result = await adminService.verifyCompany(companyId, req.user as AdminActor);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company verified successfully',
    data: result,
  });
});

const suspendEmployer = asyncHandler(async (req, res) => {
  const parsed = userIdParams.safeParse(req.params);
  const userId = parsed.success ? parsed.data.userId : (req.params.userId as string);
  const result = await adminService.setEmployerActive(userId, false, req.user as AdminActor);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employer suspended successfully',
    data: result,
  });
});

const reactivateEmployer = asyncHandler(async (req, res) => {
  const parsed = userIdParams.safeParse(req.params);
  const userId = parsed.success ? parsed.data.userId : (req.params.userId as string);
  const result = await adminService.setEmployerActive(userId, true, req.user as AdminActor);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employer reactivated successfully',
    data: result,
  });
});

const deleteEmployer = asyncHandler(async (req, res) => {
  const parsed = userIdParams.safeParse(req.params);
  const userId = parsed.success ? parsed.data.userId : (req.params.userId as string);
  const result = await adminService.deleteEmployer(userId, req.user as AdminActor);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employer deleted successfully',
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
  getJobSeekerStats: asyncHandler(async (_req, res) => {
    const result = await adminService.getJobSeekerStats();
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Job seeker stats fetched successfully',
      data: result,
    });
  }),
  getJobSeekersList: asyncHandler(async (req, res) => {
    const parsed = jobSeekerAdminListQuery.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid query parameters');
    }
    const result = await adminService.getJobSeekersList(parsed.data);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Job seekers fetched successfully',
      data: result.data,
      meta: result.meta,
    });
  }),
  suspendJobSeeker: asyncHandler(async (req, res) => {
    const parsed = userIdParams.safeParse(req.params);
    const userId = parsed.success ? parsed.data.userId : (req.params.userId as string);
    const result = await adminService.suspendJobSeeker(userId, req.user as AdminActor);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Job seeker suspended successfully',
      data: result,
    });
  }),
  reactivateJobSeeker: asyncHandler(async (req, res) => {
    const parsed = userIdParams.safeParse(req.params);
    const userId = parsed.success ? parsed.data.userId : (req.params.userId as string);
    const result = await adminService.reactivateJobSeeker(userId, req.user as AdminActor);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Job seeker reactivated successfully',
      data: result,
    });
  }),
  deleteJobSeeker: asyncHandler(async (req, res) => {
    const parsed = userIdParams.safeParse(req.params);
    const userId = parsed.success ? parsed.data.userId : (req.params.userId as string);
    const result = await adminService.deleteJobSeeker(userId, req.user as AdminActor);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Job seeker deleted successfully',
      data: result,
    });
  }),
  streamJobSeekerResume: asyncHandler(async (req, res) => {
    const parsed = userIdParams.safeParse(req.params);
    const userId = parsed.success ? parsed.data.userId : (req.params.userId as string);
    await adminService.streamJobSeekerResume(userId, res);
  }),
  getActiveJobsStats: asyncHandler(async (_req, res) => {
    const result = await adminService.getActiveJobsStats();
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Active jobs stats fetched successfully',
      data: result,
    });
  }),
  getActiveJobsList: asyncHandler(async (req, res) => {
    const parsed = adminJobListQuery.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid query parameters');
    }
    const result = await adminService.getActiveJobsList(parsed.data);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Active jobs fetched successfully',
      data: result.data,
      meta: result.meta,
    });
  }),
  getStaffStats: asyncHandler(async (_req, res) => {
    const result = await adminService.getStaffStats();
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Staff stats fetched successfully',
      data: result,
    });
  }),
  getStaffList: asyncHandler(async (req, res) => {
    const parsed = staffAdminListQuery.safeParse(req.query);
    if (!parsed.success) {
      throw new (await import('zod')).ZodError(parsed.error.issues);
    }
    const result = await adminService.getStaffList(parsed.data);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Staff list fetched successfully',
      data: result.data,
      meta: result.meta,
    });
  }),
  createStaff: asyncHandler(async (req, res) => {
    const parsed = createStaffZodSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new (await import('zod')).ZodError(parsed.error.issues);
    }
    const result = await adminService.createStaff(parsed.data, req.user as AdminActor);
    sendApiResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Staff member created successfully',
      data: result,
    });
  }),
  setStaffStatus: asyncHandler(async (req, res) => {
    const { userId } = userIdParams.parse(req.params);
    const { isActive } = req.body;
    const result = await adminService.setStaffStatus(userId, isActive, req.user as AdminActor);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Staff member ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: result,
    });
  }),
  setStaffRole: asyncHandler(async (req, res) => {
    const { userId } = userIdParams.parse(req.params);
    const parsed = updateStaffRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new (await import('zod')).ZodError(parsed.error.issues);
    }
    const result = await adminService.setStaffRole(
      userId,
      parsed.data.role,
      req.user as AdminActor,
    );
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Staff role updated successfully',
      data: result,
    });
  }),
  getAuditLogs: asyncHandler(async (req, res) => {
    const parsed = auditLogQuery.safeParse(req.query);
    if (!parsed.success) {
      throw new (await import('zod')).ZodError(parsed.error.issues);
    }
    const result = await adminService.getAuditLogs(parsed.data);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Audit logs fetched successfully',
      data: result.data,
      meta: result.meta,
    });
  }),
  getDashboardOverviewStats: asyncHandler(async (_req, res) => {
    const result = await adminService.getDashboardOverviewStats();
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Dashboard stats fetched successfully',
      data: result,
    });
  }),
  getRecentUsers: asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit) || 5;
    const result = await adminService.getRecentUsers(limit);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Recent users fetched successfully',
      data: result,
    });
  }),
  getModerationQueue: asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit) || 5;
    const result = await adminService.getModerationQueue(limit);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Moderation queue fetched successfully',
      data: result,
    });
  }),
  getJobReports: asyncHandler(async (req, res) => {
    const result = await adminService.getJobReports(req.query);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Job reports fetched successfully',
      data: result.data,
      meta: result.meta,
    });
  }),
  getJobReportStats: asyncHandler(async (_req, res) => {
    const result = await adminService.getJobReportStats();
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Job report stats fetched successfully',
      data: result,
    });
  }),
  updateJobReportStatus: asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const { status } = req.body;
    const result = await adminService.updateJobReportStatus(reportId, status);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Job report status updated successfully',
      data: result,
    });
  }),
  deactivateJob: asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const result = await adminService.deactivateJob(jobId, req.user as AdminActor);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Job deactivated successfully',
      data: result,
    });
  }),
  approveJob: asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const result = await adminService.approveJob(jobId, req.user as AdminActor);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Job approved successfully',
      data: result,
    });
  }),
  deleteJobListing: asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const result = await adminService.deleteJobListing(jobId, req.user as AdminActor);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Job listing deleted successfully',
      data: result,
    });
  }),
  getSystemSettings: asyncHandler(async (_req, res) => {
    const result = await adminService.getSystemSettings();
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'System settings fetched successfully',
      data: result,
    });
  }),
  getPublicSystemSettings: asyncHandler(async (_req, res) => {
    const result = await adminService.getPublicSystemSettings();
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Public system settings fetched successfully',
      data: result,
    });
  }),
  updateSystemSettings: asyncHandler(async (req, res) => {
    const result = await adminService.updateSystemSettings(req.body, req.user as AdminActor);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'System settings updated successfully',
      data: result,
    });
  }),
  broadcastNotification: asyncHandler(async (req, res) => {
    const result = await adminService.broadcastNotification(req.body, req.user as AdminActor);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Broadcast notification dispatched successfully',
      data: result,
    });
  }),
  clearUserLockout: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const result = await adminService.clearUserLockout(userId, req.user as AdminActor);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'User lockout cleared successfully',
      data: result,
    });
  }),
  toggleJobFeatured: asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const { isFeatured } = req.body;
    const result = await adminService.toggleJobFeatured(jobId, isFeatured, req.user as AdminActor);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Job featured status updated successfully',
      data: result,
    });
  }),
  getSecurityMetadata: asyncHandler(async (req, res) => {
    const result = await adminService.getSecurityMetadata();
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Security metadata fetched successfully',
      data: result,
    });
  }),
  getSystemMetrics: asyncHandler(async (req, res) => {
    const result = await adminService.getSystemMetrics();
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'System metrics fetched successfully',
      data: result,
    });
  }),
};

export default adminController;
