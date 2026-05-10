import httpStatus from "http-status";
import AppError from "../../error/AppError.js";
import factoryFunctions from "../../../utils/FactoryFunctionsWithFilterEngine.js";
import { emitToUser } from "../../../socket/index.js";
import prisma from "../../../utils/prismaClient.js";

type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  jobId?: string | null;
  applicationId?: string | null;
  metadata?: unknown;
  sentVia?: string[];
};

const createNotification = async (payload: CreateNotificationInput) => {
  if (!payload.userId) {
    throw new AppError(httpStatus.BAD_REQUEST, "userId is required");
  }

  const created = await prisma.notification.create({
    data: {
      userId: payload.userId,
      // prisma enum typed as string in JS runtime; validated by DB enum
      type: payload.type as any,
      title: payload.title,
      message: payload.message,
      jobId: payload.jobId ?? null,
      applicationId: payload.applicationId ?? null,
      metadata: payload.metadata as any,
      sentVia: payload.sentVia ?? ["in_app"],
    },
  });

  emitToUser(payload.userId, "notification:new", created);

  return created;
};

const getMyNotifications = async (userId: string, query: any) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const notificationFilter = factoryFunctions.createNotificationFilter(prisma as any);

  const filterOptions: any = {
    where: { userId },
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 20,
    sortBy: query.sortBy || "createdAt",
    sortOrder: (query.sortOrder as "asc" | "desc") || "desc",
  };

  if (query.type) {
    filterOptions.where.type = query.type;
  }

  if (typeof query.isRead === "boolean") {
    filterOptions.where.isRead = query.isRead;
  }

  const { where, orderBy, skip, take, pagination } = await notificationFilter.filter(filterOptions);

  const data = await prisma.notification.findMany({
    where,
    orderBy,
    skip,
    take,
    include: {
      job: { select: { id: true, title: true, companyId: true } },
      application: { select: { id: true, status: true, jobId: true } },
    },
  });

  return { data, meta: pagination };
};

const getUnreadCount = async (userId: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }
  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return { unreadCount };
};

const markAsRead = async (userId: string, id: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
  }

  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
};

const markAllAsRead = async (userId: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { updated: result.count };
};

const deleteNotification = async (userId: string, id: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
  }

  await prisma.notification.delete({ where: { id } });
  return { deleted: true };
};

const notificationService = {
  createNotification,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

export default notificationService;
