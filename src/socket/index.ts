import type { Server as HttpServer } from 'http';
import jwt, { type JwtPayload, type Secret } from 'jsonwebtoken';
import { Server } from 'socket.io';
import { z } from 'zod';
import { env } from '../config/index.js';
import prisma from '../utils/prismaClient.js';
import messageService from '../app/modules/message/message.service.js';

type SocketAuthPayload = JwtPayload & {
  userId: string;
  role: string;
};

let io: Server | null = null;

export const getIO = () => io;

export const emitToUser = (userId: string, event: string, payload: unknown) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

function extractToken(handshake: {
  auth?: Record<string, unknown>;
  headers?: Record<string, unknown>;
}): string | null {
  const authToken =
    typeof handshake.auth?.token === 'string' ? (handshake.auth.token as string) : null;

  const rawToken = authToken || (handshake.headers?.authorization as string);
  if (!rawToken) return null;

  return rawToken.startsWith('Bearer ') ? (rawToken.split(' ')[1] ?? null) : rawToken;
}

// P5 — Zod schemas for incoming Socket.io event payloads.
// Never trust client-supplied data without validation; event payloads can be
// crafted to inject arbitrary values into room joins or broadcasts.
const conversationIdSchema = z.string().uuid({ message: 'conversationId must be a valid UUID' });

const typingPayloadSchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  isTyping: z.boolean(),
});

const sendMessagePayloadSchema = z.object({
  conversationId: z.string().uuid({ message: 'conversationId must be a valid UUID' }),
  content: z.string().min(1, { message: 'Message content cannot be empty' }),
  messageType: z.enum(['TEXT', 'IMAGE', 'FILE', 'LINK']).optional(),
  fileUrl: z.string().url().optional().or(z.string().length(0)).or(z.null()),
  fileName: z.string().optional().or(z.null()),
  fileSize: z.number().int().optional().or(z.null()),
  recipientId: z.string().uuid().optional().or(z.null()),
});

export const initSocket = (server: HttpServer) => {
  // B5 fix — CORS: replace `origin: true` (accepts all origins) with the exact
  // same allowlist used by the Express CORS config. Socket.io does NOT inherit
  // Express CORS configuration — it must be set independently.
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    // P5 — Limit incoming message size to 1 MB.
    // Default is 1 MB in Socket.io v4+, set explicitly to make it auditable.
    maxHttpBufferSize: 1e6,
  });

  // P5 — Authenticate on the handshake before the connection is accepted.
  // A rejected handshake never reaches the connection handler.
  io.use((socket, next) => {
    try {
      const token = extractToken(socket.handshake);
      if (!token) return next(new Error('Unauthorized'));

      // B6 fix — algorithm pinning (same algorithm as authValidator and auth.service)
      const verified = jwt.verify(token, env.JWT_SECRET as Secret, {
        algorithms: [env.JWT_ALGORITHM as jwt.Algorithm],
      }) as SocketAuthPayload;

      if (!verified?.userId) return next(new Error('Unauthorized'));

      socket.data.user = { userId: verified.userId, role: verified.role };
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data?.user?.userId as string | undefined;
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`User connected: ${userId} (Socket: ${socket.id})`);
    }

    // P5 — Join a conversation room with ownership check.
    // A user must be a ConversationParticipant to join the room; otherwise an
    // unauthenticated or wrong-account socket could eavesdrop on messages.
    socket.on('join_conversation', async (rawConversationId: unknown) => {
      try {
        const conversationId = conversationIdSchema.parse(rawConversationId);

        if (!userId) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        // Authorization: confirm the authenticated user is a participant
        const participant = await prisma.conversationParticipant.findFirst({
          where: { conversationId, userId },
        });

        if (!participant) {
          socket.emit('error', {
            message: 'Forbidden: you are not a participant in this conversation',
          });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        console.log(`Socket ${socket.id} joined conversation: ${conversationId}`);
      } catch (_err) {
        socket.emit('error', { message: 'Invalid conversationId' });
      }
    });

    // Leave a conversation room
    socket.on('leave_conversation', (rawConversationId: unknown) => {
      try {
        const conversationId = conversationIdSchema.parse(rawConversationId);
        socket.leave(`conversation:${conversationId}`);
        console.log(`Socket ${socket.id} left conversation: ${conversationId}`);
      } catch {
        socket.emit('error', { message: 'Invalid conversationId' });
      }
    });

    // Handle sending a message in real-time with database saving, validation and acknowledgement
    socket.on('send_message', async (rawData: unknown, callback: unknown) => {
      try {
        if (!userId) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Unauthorized' });
          } else {
            socket.emit('error', { message: 'Unauthorized' });
          }
          return;
        }

        const data = sendMessagePayloadSchema.parse(rawData);

        // Call the service layer to validate and persist the message
        const result = await messageService.sendMessage(data.conversationId, userId, {
          content: data.content,
          messageType: data.messageType as any,
          fileUrl: data.fileUrl || undefined,
          fileName: data.fileName || undefined,
          fileSize: data.fileSize || undefined,
        });

        // 1. Broadcast new message to the conversation room (includes all participants)
        io?.to(`conversation:${data.conversationId}`).emit('new_message', result);

        // 2. Notify recipient's personal room for real-time sidebar/badge updates
        if (data.recipientId) {
          io?.to(`user:${data.recipientId}`).emit('new_conversation_message', {
            conversationId: data.conversationId,
            message: result,
          });
        }

        // 3. Send success acknowledgement to the sender socket
        if (typeof callback === 'function') {
          callback({ success: true, data: result });
        }
      } catch (err: any) {
        console.error('Socket send_message error:', err);
        const errMsg = err.message || 'Failed to send message';
        if (typeof callback === 'function') {
          callback({ success: false, error: errMsg });
        } else {
          socket.emit('error', { message: errMsg });
        }
      }
    });

    // Handle typing status — validate the full payload
    socket.on('typing', (rawData: unknown) => {
      try {
        const data = typingPayloadSchema.parse(rawData);
        socket.to(`conversation:${data.conversationId}`).emit('user_typing', data);
      } catch {
        socket.emit('error', { message: 'Invalid typing payload' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
    });
  });

  return io;
};
