import httpStatus from "http-status";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const getConversations = async (userId: string) => {
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

const messageService = {
  getConversations,
  getMessages,
  sendMessage,
  createConversation,
  markAsRead,
  blockUser,
  deleteConversation,
};

export default messageService;
