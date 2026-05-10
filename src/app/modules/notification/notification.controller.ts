import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import notificationService from "./notification.service.js";
import { notificationListQuery, markReadParams } from "./notification.validation.js";

const getMyNotifications = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const parsed = notificationListQuery.safeParse(req.query);
  const query = parsed.success ? parsed.data : req.query;

  const { data, meta } = await notificationService.getMyNotifications(userId, query);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notifications fetched successfully",
    data,
    meta,
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const result = await notificationService.getUnreadCount(userId);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Unread count fetched successfully",
    data: result,
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const parsed = markReadParams.safeParse(req.params);
  const id = parsed.success ? parsed.data.id : (req.params.id as string);
  const result = await notificationService.markAsRead(userId, id);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification marked as read",
    data: result,
  });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const result = await notificationService.markAllAsRead(userId);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All notifications marked as read",
    data: result,
  });
});

const deleteNotification = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const parsed = markReadParams.safeParse(req.params);
  const id = parsed.success ? parsed.data.id : (req.params.id as string);
  const result = await notificationService.deleteNotification(userId, id);
  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification deleted",
    data: result,
  });
});

const notificationController = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

export default notificationController;
