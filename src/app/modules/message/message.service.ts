import httpStatus from 'http-status';
import prisma from '../../../utils/prismaClient.js';
import AppError from '../../error/AppError.js';
import notificationService from '../notification/notification.service.js';

const checkPremiumStatus = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPremium: true,
      role: true,
      companyId: true,
      userSubscription: {
        select: { status: true, endDate: true },
      },
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  let isPremium = user.isPremium;

  if (!isPremium && user.role === 'EMPLOYER' && user.companyId) {
    // Employer premium is derived from their company's subscription
    const activeSub = await prisma.subscription.findUnique({
      where: { companyId: user.companyId },
    });
    if (activeSub && (activeSub.status === 'ACTIVE' || activeSub.status === 'TRIALING')) {
      isPremium = true;
    }
  }

  if (!isPremium && user.role === 'JOB_SEEKER') {
    // Job Seeker premium is derived from their personal userSubscription
    const sub = user.userSubscription;
    if (
      sub &&
      (sub.status === 'ACTIVE' || sub.status === 'TRIALING') &&
      (!sub.endDate || new Date() < new Date(sub.endDate))
    ) {
      isPremium = true;
    }
  }

  if (!isPremium) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Messaging is a premium feature. Please upgrade your plan to continue.',
    );
  }
};

const checkPremiumStatusMultiple = async (userIds: string[]): Promise<Record<string, boolean>> => {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      isPremium: true,
      role: true,
      companyId: true,
      userSubscription: {
        select: { status: true, endDate: true },
      },
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const employerCompanyIds = users
    .filter((u) => !u.isPremium && u.role === 'EMPLOYER' && u.companyId)
    .map((u) => u.companyId as string);

  const activeSubs =
    employerCompanyIds.length > 0
      ? await prisma.subscription.findMany({
          where: {
            companyId: { in: employerCompanyIds },
            status: { in: ['ACTIVE', 'TRIALING'] },
          },
          select: { companyId: true },
        })
      : [];

  const activeCompanyIds = new Set(activeSubs.map((s) => s.companyId));
  const results: Record<string, boolean> = {};

  for (const userId of userIds) {
    const user = userMap.get(userId);
    if (!user) {
      results[userId] = false;
      continue;
    }

    let isPremium = user.isPremium;

    if (!isPremium && user.role === 'EMPLOYER' && user.companyId) {
      if (activeCompanyIds.has(user.companyId)) {
        isPremium = true;
      }
    }

    if (!isPremium && user.role === 'JOB_SEEKER') {
      const sub = user.userSubscription;
      if (
        sub &&
        (sub.status === 'ACTIVE' || sub.status === 'TRIALING') &&
        (!sub.endDate || new Date() < new Date(sub.endDate))
      ) {
        isPremium = true;
      }
    }

    results[userId] = isPremium;
  }

  return results;
};

const getConversations = async (userId: string) => {
  await checkPremiumStatus(userId);
  const result = await prisma.conversation.findMany({
    where: {
      conversationParticipants: {
        some: {
          userId,
          deletedAt: null,
        },
      },
    },
    include: {
      conversationParticipants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              profile: {
                select: {
                  avatarUrl: true,
                  headline: true,
                },
              },
            },
          },
        },
      },
      lastMessage: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return result;
};

const getMessages = async (conversationId: string, userId: string, since?: string) => {
  await checkPremiumStatus(userId);
  // Check if user is participant
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
    },
  });

  if (!participant) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not a participant of this conversation');
  }

  const whereClause: any = { conversationId };
  if (since) {
    whereClause.createdAt = { gt: new Date(since) };
  }

  const result = await prisma.message.findMany({
    where: whereClause,
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          profile: {
            select: {
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return result;
};

const sendMessage = async (
  conversationId: string,
  senderId: string,
  payload: {
    content: string;
    messageType?: 'TEXT' | 'IMAGE' | 'FILE' | 'LINK';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
  },
) => {
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
  });

  const participant = participants.find((p) => p.userId === senderId);
  if (!participant) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not a participant of this conversation');
  }

  if (participant.isBlocked) {
    throw new AppError(httpStatus.FORBIDDEN, 'You cannot send messages to a blocked conversation');
  }

  const otherParticipant = participants.find((p) => p.userId !== senderId);
  if (otherParticipant?.isBlocked) {
    throw new AppError(httpStatus.FORBIDDEN, 'The other participant has blocked you');
  }

  // Check premium status of BOTH participants in a single batch
  const userIdsToCheck = [senderId];
  if (otherParticipant) {
    userIdsToCheck.push(otherParticipant.userId);
  }
  const premiumStatus = await checkPremiumStatusMultiple(userIdsToCheck);

  if (!premiumStatus[senderId]) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your premium subscription has expired. Please upgrade to continue messaging.',
    );
  }

  if (otherParticipant && !premiumStatus[otherParticipant.userId]) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'This conversation is locked because the other participant does not have an active premium subscription.',
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId,
        senderId,
        content: payload.content,
        messageType: payload.messageType || 'TEXT',
        fileUrl: payload.fileUrl,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            profile: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId: message.id,
        updatedAt: new Date(),
      },
    });

    return message;
  });

  if (otherParticipant) {
    try {
      await notificationService.createNotification({
        userId: otherParticipant.userId,
        type: 'MESSAGE_RECEIVED',
        title: `New message from ${result.sender.fullName}`,
        message: payload.content || 'Sent an attachment',
        metadata: {
          conversationId,
          senderName: result.sender.fullName,
        },
      });
    } catch (err) {
      console.error('Failed to create database notification for message:', err);
    }
  }

  return result;
};

const createConversation = async (participantIds: string[], applicationId?: string) => {
  // Check if conversation already exists between these participants
  // For simplicity, we assume 2-party chats for now
  if (participantIds.length !== 2) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Currently only support 1-on-1 conversations');
  }

  // Check if both participants are premium in a single batch
  const premiumStatus = await checkPremiumStatusMultiple(participantIds);

  if (!premiumStatus[participantIds[0] as string]) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You must be a premium user to start a conversation. Please upgrade your plan to continue.',
    );
  }

  if (!premiumStatus[participantIds[1] as string]) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'To start a conversation, the recipient must also be a premium user.',
    );
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { conversationParticipants: { some: { userId: participantIds[0] } } },
        { conversationParticipants: { some: { userId: participantIds[1] } } },
      ],
    },
  });

  if (existing) return existing;

  const result = await prisma.conversation.create({
    data: {
      applicationId,
      conversationParticipants: {
        create: participantIds.map((userId) => ({ userId })),
      },
    },
    include: {
      conversationParticipants: true,
    },
  });

  return result;
};

const blockUser = async (conversationId: string, userId: string) => {
  await checkPremiumStatus(userId);
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId },
  });

  if (!participant) {
    throw new AppError(httpStatus.NOT_FOUND, 'Participant not found');
  }

  const result = await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: {
      isBlocked: !participant.isBlocked,
      blockedAt: !participant.isBlocked ? new Date() : null,
    },
  });

  return result;
};

const deleteConversation = async (conversationId: string, userId: string) => {
  await checkPremiumStatus(userId);
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId },
  });

  if (!participant) {
    throw new AppError(httpStatus.NOT_FOUND, 'Participant not found');
  }

  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: {
      deletedAt: new Date(),
    },
  });

  return { success: true };
};

const markAsRead = async (conversationId: string, userId: string) => {
  await checkPremiumStatus(userId);
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      status: { not: 'READ' },
    },
    data: {
      status: 'READ',
      readAt: new Date(),
    },
  });

  await prisma.conversationParticipant.updateMany({
    where: {
      conversationId,
      userId,
    },
    data: {
      lastReadAt: new Date(),
    },
  });

  return { success: true };
};

const deleteMessage = async (messageId: string, userId: string) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found');
  }

  if (message.senderId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You can only delete your own messages');
  }

  const result = await prisma.message.update({
    where: { id: messageId },
    data: {
      status: 'DELETED',
      deletedAt: new Date(),
      content: 'This message was deleted',
      fileUrl: null,
      fileName: null,
      fileSize: null,
    },
  });

  return result;
};

const getMessageFile = async (messageId: string, userId: string) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found');
  }

  // Verify that the user is a participant of the conversation
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId: message.conversationId,
      userId,
    },
  });

  if (!participant) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not have access to this file');
  }

  if (!message.fileUrl) {
    throw new AppError(httpStatus.NOT_FOUND, 'This message has no file attachment');
  }

  return message;
};

const messageService = {
  getConversations,
  getMessages,
  sendMessage,
  createConversation,
  markAsRead,
  blockUser,
  deleteConversation,
  deleteMessage,
  getMessageFile,
};

export default messageService;
