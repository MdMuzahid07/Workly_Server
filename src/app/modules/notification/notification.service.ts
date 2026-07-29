import httpStatus from 'http-status';
import AppError from '../../error/AppError.js';
import factoryFunctions from '../../../utils/FactoryFunctionsWithFilterEngine.js';
import { emitToUser } from '../../../socket/index.js';
import { env } from '../../../config/index.js';
import { Prisma, Notification } from '../../../generated/prisma/index.js';
import prisma from '../../../utils/prismaClient.js';
import { pushService } from '../../../services/push.service.js';
import {
  sendNewApplicationEmail,
  sendApplicationStatusUpdateEmail,
  sendInterviewScheduledEmail,
} from '../../../utils/emailService.js';

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

interface NotificationMetadata {
  status?: string;
  rejectionReason?: string | null;
  interviewScheduledAt?: string;
  interviewNotes?: string | null;
}

const triggerEmailNotificationIfPremium = async (userId: string, notificationId: string) => {
  const recipient = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      fullName: true,
      isPremium: true,
      userSettings: true,
    },
  });

  if (!recipient || !recipient.isPremium || !recipient.email) {
    return;
  }

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: {
      job: {
        include: {
          company: true,
        },
      },
      application: {
        include: {
          job: {
            include: {
              company: true,
            },
          },
          applicant: true,
        },
      },
    },
  });

  if (!notification) return;

  const settings = recipient.userSettings;
  const frontendUrl = env.FRONTEND_URL;

  try {
    if (notification.type === 'APPLICATION_RECEIVED') {
      if (settings && settings.jobRecommendations === false) {
        return;
      }

      const app = notification.application;
      const job = notification.job || app?.job;
      if (!job) return;

      const candidateName = app?.fullName || app?.applicant?.fullName || 'A candidate';
      const experience = app?.yearsOfExperience || 0;
      const location = app?.currentLocation || 'Not specified';
      const applicationUrl = `${frontendUrl}/employer/jobs/${job.id}/applications`;

      await sendNewApplicationEmail(
        recipient.email,
        recipient.fullName,
        candidateName,
        job.title,
        job.company.name,
        experience,
        location,
        applicationUrl,
      );

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          sentVia: [...notification.sentVia, 'email'],
          emailSentAt: new Date(),
        },
      });
    } else if (notification.type === 'APPLICATION_STATUS_CHANGE') {
      if (settings && settings.applicationUpdates === false) {
        return;
      }

      const app = notification.application;
      const job = notification.job || app?.job;
      if (!job || !app) return;

      const metadata = notification.metadata as NotificationMetadata;
      const status = metadata?.status || app.status || 'SUBMITTED';
      const rejectionReason = metadata?.rejectionReason || app.rejectionReason || null;
      const applicationUrl = `${frontendUrl}/job-seeker/applications`;

      await sendApplicationStatusUpdateEmail(
        recipient.email,
        recipient.fullName,
        job.title,
        job.company.name,
        status,
        rejectionReason,
        applicationUrl,
      );

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          sentVia: [...notification.sentVia, 'email'],
          emailSentAt: new Date(),
        },
      });
    } else if (notification.type === 'INTERVIEW_SCHEDULED') {
      if (settings && settings.interviewUpdates === false) {
        return;
      }

      const app = notification.application;
      const job = notification.job || app?.job;
      if (!job || !app) return;

      const metadata = notification.metadata as NotificationMetadata;
      const scheduledAtRaw = metadata?.interviewScheduledAt || app.interviewScheduledAt;
      const notes = metadata?.interviewNotes || app.interviewNotes || null;
      const scheduledAt = scheduledAtRaw
        ? new Date(scheduledAtRaw).toLocaleString()
        : 'Not specified';
      const applicationUrl = `${frontendUrl}/job-seeker/applications`;

      await sendInterviewScheduledEmail(
        recipient.email,
        recipient.fullName,
        job.title,
        job.company.name,
        scheduledAt,
        notes,
        applicationUrl,
      );

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          sentVia: [...notification.sentVia, 'email'],
          emailSentAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error(
      `Failed to send premium notification email for notification ${notificationId}:`,
      error,
    );
  }
};

const createNotification = async (payload: CreateNotificationInput) => {
  if (!payload.userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'userId is required');
  }

  const settings = await prisma.systemSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  });

  const nonCriticalTypes = [
    'NEW_JOB_MATCH',
    'PROFILE_VIEWED',
    'JOB_VIEWED',
    'PROFILE_INCOMPLETE',
    'SYSTEM_ANNOUNCEMENT',
  ];

  if (!settings.globalNotifications && nonCriticalTypes.includes(payload.type)) {
    return {
      id: 'muted',
      userId: payload.userId,
      type: payload.type as Parameters<typeof prisma.notification.create>[0]['data']['type'],
      title: payload.title,
      message: payload.message,
      isRead: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      jobId: null,
      applicationId: null,
      metadata: Prisma.JsonNull,
      sentVia: ['in_app'],
      emailSentAt: null,
      pushSentAt: null,
    } as unknown as Notification;
  }

  const created = await prisma.notification.create({
    data: {
      userId: payload.userId,
      // prisma enum typed as string in JS runtime; validated by DB enum
      type: payload.type as Parameters<typeof prisma.notification.create>[0]['data']['type'],
      title: payload.title,
      message: payload.message,
      jobId: payload.jobId ?? null,
      applicationId: payload.applicationId ?? null,
      metadata: (payload.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      sentVia: payload.sentVia ?? ['in_app'],
    },
  });

  emitToUser(payload.userId, 'notification:new', created);

  // Trigger premium email asynchronously to ensure non-blocking best practice
  triggerEmailNotificationIfPremium(payload.userId, created.id).catch((err) => {
    console.error('Async error in triggerEmailNotificationIfPremium:', err);
  });

  // Trigger push notification asynchronously to ensure non-blocking best practice
  const pushData: Record<string, string> = {};
  if (created.metadata && typeof created.metadata === 'object') {
    for (const [key, value] of Object.entries(created.metadata)) {
      if (value !== null && value !== undefined) {
        pushData[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }
  }

  pushService
    .send({
      userId: payload.userId,
      notificationId: created.id,
      type: created.type,
      title: created.title,
      body: created.message,
      data: pushData,
    })
    .catch((err) => {
      console.error('Async error in pushService.send:', err);
    });

  return created;
};

const getMyNotifications = async (userId: string, query: Record<string, unknown>) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Not authorized');
  }

  const notificationFilter = factoryFunctions.createNotificationFilter(prisma);

  const filterOptions: {
    where: Record<string, string | number | boolean | Date | null | undefined>;
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    includeSoftDeleted: boolean;
  } = {
    where: { userId },
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 20,
    sortBy: (query.sortBy as string) || 'createdAt',
    sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
    includeSoftDeleted: true,
  };

  if (query.type) {
    filterOptions.where.type = query.type as string;
  }

  if (typeof query.isRead === 'boolean') {
    filterOptions.where.isRead = query.isRead;
  }

  const { where, orderBy, skip, take, pagination } = await notificationFilter.filter(filterOptions);

  if (query.since) {
    (where as any).createdAt = { gt: new Date(query.since as string) };
  }

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
    throw new AppError(httpStatus.UNAUTHORIZED, 'Not authorized');
  }
  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return { unreadCount };
};

const markAsRead = async (userId: string, id: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Not authorized');
  }

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
};

const markAllAsRead = async (userId: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Not authorized');
  }

  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { updated: result.count };
};

const deleteNotification = async (userId: string, id: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Not authorized');
  }

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
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
