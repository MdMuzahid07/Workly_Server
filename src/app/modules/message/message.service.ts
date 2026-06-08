import httpStatus from "http-status";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const checkPremiumStatus = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true, role: true, companyId: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  let isPremium = user.isPremium;

  if (!isPremium && user.role === "EMPLOYER" && user.companyId) {
    const activeSub = await prisma.subscription.findUnique({
      where: { companyId: user.companyId },
    });
    if (activeSub && activeSub.status === "ACTIVE") {
      isPremium = true;
    }
  }

  if (!isPremium) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Messaging is a premium feature. Please upgrade your plan to continue.",
    );
  }
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
      updatedAt: "desc",
    },
  });

  return result;
};

const getMessages = async (conversationId: string, userId: string) => {
  await checkPremiumStatus(userId);
  // Check if user is participant
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
    },
  });

  if (!participant) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not a participant of this conversation");
  }

  const result = await prisma.message.findMany({
    where: {
      conversationId,
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
    orderBy: {
      createdAt: "asc",
    },
  });

  return result;
};

const sendMessage = async (
  conversationId: string,
  senderId: string,
  payload: {
    content: string;
    messageType?: "TEXT" | "IMAGE" | "FILE" | "LINK";
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
  },
) => {
  await checkPremiumStatus(senderId);
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId: senderId,
    },
  });

  if (!participant) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not a participant of this conversation");
  }

  if (participant.isBlocked) {
    throw new AppError(httpStatus.FORBIDDEN, "You cannot send messages to a blocked conversation");
  }

  // Check if the other person has blocked you
  const otherParticipant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId: { not: senderId },
    },
  });

  if (otherParticipant?.isBlocked) {
    throw new AppError(httpStatus.FORBIDDEN, "The other participant has blocked you");
  }

  const result = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId,
        senderId,
        content: payload.content,
        messageType: payload.messageType || "TEXT",
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

  return result;
};

const createConversation = async (participantIds: string[], applicationId?: string) => {
  // Check if conversation already exists between these participants
  // For simplicity, we assume 2-party chats for now
  if (participantIds.length !== 2) {
    throw new AppError(httpStatus.BAD_REQUEST, "Currently only support 1-on-1 conversations");
  }

  // Check if the initiator (first participant) is premium
  await checkPremiumStatus(participantIds[0] as string);

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
    throw new AppError(httpStatus.NOT_FOUND, "Participant not found");
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
    throw new AppError(httpStatus.NOT_FOUND, "Participant not found");
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
      status: { not: "READ" },
    },
    data: {
      status: "READ",
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
    throw new AppError(httpStatus.NOT_FOUND, "Message not found");
  }

  if (message.senderId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only delete your own messages");
  }

  const result = await prisma.message.update({
    where: { id: messageId },
    data: {
      status: "DELETED",
      deletedAt: new Date(),
      content: "This message was deleted",
      fileUrl: null,
      fileName: null,
      fileSize: null,
    },
  });

  return result;
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
};

export default messageService;
