import httpStatus from "http-status";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import prisma from "../../../utils/prismaClient.js";
import { pushService } from "../../../services/push.service.js";
import {
  registerPushTokenBody,
  deregisterPushTokenBody,
  updatePreferencesBody,
} from "./user.validation.js";

const registerPushToken = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const { expoPushToken, deviceToken, platform } = registerPushTokenBody.parse(req.body);

  await pushService.upsertToken(userId, expoPushToken, deviceToken ?? null, platform);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Push token registered successfully",
  });
});

const deregisterPushToken = asyncHandler(async (req, res) => {
  const { expoPushToken } = deregisterPushTokenBody.parse(req.body);

  await pushService.deactivateToken(expoPushToken);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Push token deregistered successfully",
  });
});

const getNotificationPreferences = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;

  let prefs = await (prisma as any).notificationPreference.findUnique({
    where: { userId },
  });

  if (!prefs) {
    prefs = await (prisma as any).notificationPreference.create({
      data: { userId },
    });
  }

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification preferences fetched successfully",
    data: prefs,
  });
});

const updateNotificationPreferences = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const updateData = updatePreferencesBody.parse(req.body);

  const updated = await (prisma as any).notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      ...updateData,
    },
    update: updateData,
  });

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification preferences updated successfully",
    data: updated,
  });
});

const deleteMe = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false, deletedAt: new Date() },
  });

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Account deleted successfully",
  });
});

const userController = {
  registerPushToken,
  deregisterPushToken,
  getNotificationPreferences,
  updateNotificationPreferences,
  deleteMe,
};

export default userController;
