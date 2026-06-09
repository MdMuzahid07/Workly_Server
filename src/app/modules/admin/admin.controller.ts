import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import adminService from "./admin.service.js";
import {
  adminJobListQuery,
  auditLogQuery,
  companyIdParams,
  createStaffZodSchema,
  employerAdminListQuery,
  jobSeekerAdminListQuery,
  staffAdminListQuery,
  userIdParams,
} from "./admin.validation.js";

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
  getJobSeekerStats: asyncHandler(async (_req, res) => {
    const result = await adminService.getJobSeekerStats();
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Job seeker stats fetched successfully",
      data: result,
    });
  }),
  getJobSeekersList: asyncHandler(async (req, res) => {
    const parsed = jobSeekerAdminListQuery.safeParse(req.query);
    const query = parsed.success ? parsed.data : (req.query as any);
    const result = await adminService.getJobSeekersList(query);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Job seekers fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  }),
  suspendJobSeeker: asyncHandler(async (req, res) => {
    const parsed = userIdParams.safeParse(req.params);
    const userId = parsed.success ? parsed.data.userId : (req.params.userId as string);
    const result = await adminService.suspendJobSeeker(userId);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Job seeker suspended successfully",
      data: result,
    });
  }),
  reactivateJobSeeker: asyncHandler(async (req, res) => {
    const parsed = userIdParams.safeParse(req.params);
    const userId = parsed.success ? parsed.data.userId : (req.params.userId as string);
    const result = await adminService.reactivateJobSeeker(userId);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Job seeker reactivated successfully",
      data: result,
    });
  }),
  deleteJobSeeker: asyncHandler(async (req, res) => {
    const parsed = userIdParams.safeParse(req.params);
    const userId = parsed.success ? parsed.data.userId : (req.params.userId as string);
    const result = await adminService.deleteJobSeeker(userId);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Job seeker deleted successfully",
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
      message: "Active jobs stats fetched successfully",
      data: result,
    });
  }),
  getActiveJobsList: asyncHandler(async (req, res) => {
    const parsed = adminJobListQuery.safeParse(req.query);
    const query = parsed.success ? parsed.data : (req.query as any);
    const result = await adminService.getActiveJobsList(query);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Active jobs fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  }),
  getStaffStats: asyncHandler(async (_req, res) => {
    const result = await adminService.getStaffStats();
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Staff stats fetched successfully",
      data: result,
    });
  }),
  getStaffList: asyncHandler(async (req, res) => {
    const parsed = staffAdminListQuery.safeParse(req.query);
    const query = parsed.success ? parsed.data : (req.query as any);
    const result = await adminService.getStaffList(query);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Staff list fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  }),
  createStaff: asyncHandler(async (req, res) => {
    const parsed = createStaffZodSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new (await import("zod")).ZodError(parsed.error.issues);
    }
    const result = await adminService.createStaff(parsed.data, req.user as any);
    sendApiResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Staff member created successfully",
      data: result,
    });
  }),
  setStaffStatus: asyncHandler(async (req, res) => {
    const { userId } = userIdParams.parse(req.params);
    const { isActive } = req.body;
    const result = await adminService.setStaffStatus(userId, isActive, req.user as any);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Staff member ${isActive ? "activated" : "deactivated"} successfully`,
      data: result,
    });
  }),
  getAuditLogs: asyncHandler(async (req, res) => {
    const parsed = auditLogQuery.safeParse(req.query);
    const query = parsed.success ? parsed.data : (req.query as any);
    const result = await adminService.getAuditLogs(query);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Audit logs fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  }),
  getDashboardOverviewStats: asyncHandler(async (_req, res) => {
    const result = await adminService.getDashboardOverviewStats();
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Dashboard stats fetched successfully",
      data: result,
    });
  }),
  getRecentUsers: asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit) || 5;
    const result = await adminService.getRecentUsers(limit);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Recent users fetched successfully",
      data: result,
    });
  }),
  getModerationQueue: asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit) || 5;
    const result = await adminService.getModerationQueue(limit);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Moderation queue fetched successfully",
      data: result,
    });
  }),
  getJobReports: asyncHandler(async (req, res) => {
    const result = await adminService.getJobReports(req.query);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Job reports fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  }),
  getJobReportStats: asyncHandler(async (_req, res) => {
    const result = await adminService.getJobReportStats();
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Job report stats fetched successfully",
      data: result,
    });
  }),
  updateJobReportStatus: asyncHandler(async (req, res) => {
    const { reportId } = req.params as any;
    const { status } = req.body;
    const result = await adminService.updateJobReportStatus(reportId, status);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Job report status updated successfully",
      data: result,
    });
  }),
  deactivateJob: asyncHandler(async (req, res) => {
    const { jobId } = req.params as any;
    const result = await adminService.deactivateJob(jobId);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Job deactivated successfully",
      data: result,
    });
  }),
  approveJob: asyncHandler(async (req, res) => {
    const { jobId } = req.params as any;
    const result = await adminService.approveJob(jobId);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Job approved successfully",
      data: result,
    });
  }),
  deleteJobListing: asyncHandler(async (req, res) => {
    const { jobId } = req.params as any;
    const result = await adminService.deleteJobListing(jobId);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Job listing deleted successfully",
      data: result,
    });
  }),
  getSystemSettings: asyncHandler(async (_req, res) => {
    const result = await adminService.getSystemSettings();
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "System settings fetched successfully",
      data: result,
    });
  }),
  updateSystemSettings: asyncHandler(async (req, res) => {
    const result = await adminService.updateSystemSettings(req.body);
    sendApiResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "System settings updated successfully",
      data: result,
    });
  }),
};

export default adminController;
