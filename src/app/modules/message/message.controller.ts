import httpStatus from "http-status";
import { getIO } from "../../../socket/index.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import AppError from "../../error/AppError.js";
import messageService from "./message.service.js";

const getConversations = asyncHandler(async (req, res) => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
  }
  const result = await messageService.getConversations(userId);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Conversations fetched successfully",
    data: result,
  });
});

const getMessages = asyncHandler(async (req, res) => {
  const userId = (req as any).user?.userId;
  const { conversationId } = req.params as { conversationId: string };

  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
  }

  const result = await messageService.getMessages(conversationId, userId);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Messages fetched successfully",
    data: result,
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const userId = (req as any).user?.userId;
  const { conversationId } = req.params as { conversationId: string };
  const { content, recipientId } = req.body;

  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
  }

  const result = await messageService.sendMessage(conversationId, userId, content);

  // Real-time broadcast
  const io = getIO();
  if (io) {
    // 1. Send to the specific conversation room
    io.to(`conversation:${conversationId}`).emit("new_message", result);

    // 2. Notify the recipient in their personal room (for sidebar/notifications)
    if (recipientId) {
      io.to(`user:${recipientId}`).emit("new_conversation_message", {
        conversationId,
        message: result,
      });
    }
  }

  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Message sent successfully",
    data: result,
  });
});

const createConversation = asyncHandler(async (req, res) => {
  const userId = (req as any).user?.userId;
  const { participantId, applicationId } = req.body;

  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
  }

  const result = await messageService.createConversation([userId, participantId], applicationId);

  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Conversation created successfully",
    data: result,
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  const userId = (req as any).user?.userId;
  const { conversationId } = req.params as { conversationId: string };

  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
  }

  const result = await messageService.markAsRead(conversationId, userId);

  // Notify other participants that messages were read
  const io = getIO();
  if (io) {
    io.to(`conversation:${conversationId}`).emit("messages_read", {
      conversationId,
      userId,
    });
  }

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Messages marked as read",
    data: result,
  });
});

const messageController = {
  getConversations,
  getMessages,
  sendMessage,
  createConversation,
  markAsRead,
};

export default messageController;
