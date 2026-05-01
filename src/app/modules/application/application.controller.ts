import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import applicationService from "./application.service.js";

const createApplication = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const payload = req.body;

  const result = await applicationService.createApplication(userId, payload);

  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Application submitted successfully",
    data: result,
  });
});

const getMyApplications = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const result = await applicationService.getMyApplications(userId, req.query);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Applications fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getJobApplications = asyncHandler(async (req, res) => {
  //@ts-ignore
  const employerId = req.user.userId;
  const { jobId } = req.params as { jobId: string };
  const result = await applicationService.getJobApplications(employerId, jobId, req.query);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Job applications fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getMyCompanyApplications = asyncHandler(async (req, res) => {
  //@ts-ignore
  const employerId = req.user.userId;
  const result = await applicationService.getMyCompanyApplications(employerId, req.query);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Company applications fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getApplicationById = asyncHandler(async (req, res) => {
  //@ts-ignore
  const requesterId = req.user.userId;
  const { id } = req.params as { id: string };
  const result = await applicationService.getApplicationById(requesterId, id);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Application fetched successfully",
    data: result,
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  //@ts-ignore
  const employerId = req.user.userId;
  const { id } = req.params as { id: string };
  const { status, rejectionReason } = req.body as { status: string; rejectionReason?: string };
  const result = await applicationService.updateStatus(employerId, id, status, rejectionReason);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Application status updated",
    data: result,
  });
});

const withdraw = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { id } = req.params as { id: string };
  const result = await applicationService.withdraw(userId, id);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Application withdrawn",
    data: result,
  });
});

const scheduleInterview = asyncHandler(async (req, res) => {
  //@ts-ignore
  const employerId = req.user.userId;
  const { id } = req.params as { id: string } as { id: string };
  const { interviewScheduledAt, interviewNotes } = req.body as {
    interviewScheduledAt: string;
    interviewNotes?: string;
  };
  const result = await applicationService.scheduleInterview(
    employerId,
    id,
    new Date(interviewScheduledAt),
    interviewNotes,
  );
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Interview updated",
    data: result,
  });
});

const updateNotes = asyncHandler(async (req, res) => {
  //@ts-ignore
  const employerId = req.user.userId;
  const { id } = req.params as { id: string };
  const { interviewNotes } = req.body as { interviewNotes: string };
  const result = await applicationService.updateNotes(employerId, id, interviewNotes);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notes updated",
    data: result,
  });
});

const getJobSummary = asyncHandler(async (req, res) => {
  //@ts-ignore
  const employerId = req.user.userId;
  const { jobId } = req.params as { jobId: string };
  const result = await applicationService.getJobSummary(employerId, jobId);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Application summary fetched",
    data: result,
  });
});

const getApplicationStats = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { period } = req.query as { period: string };
  const result = await applicationService.getApplicationStats(userId, period);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Application stats fetched successfully",
    data: result,
  });
});

const applicationController = {
  createApplication,
  getMyApplications,
  getJobApplications,
  getMyCompanyApplications,
  getApplicationById,
  updateStatus,
  withdraw,
  scheduleInterview,
  updateNotes,
  getJobSummary,
  getApplicationStats,
};

export default applicationController;
