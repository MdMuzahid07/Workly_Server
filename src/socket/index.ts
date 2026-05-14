import type { Server as HttpServer } from "http";
import jwt, { type JwtPayload, type Secret } from "jsonwebtoken";
import { Server } from "socket.io";
import config from "../config/index.js";

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
    typeof handshake.auth?.token === "string" ? (handshake.auth.token as string) : null;

  const rawToken = authToken || (handshake.headers?.authorization as string);
  if (!rawToken) return null;

  return rawToken.startsWith("Bearer ") ? (rawToken.split(" ")[1] ?? null) : rawToken;
}

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = extractToken(socket.handshake);
      if (!token) return next(new Error("Unauthorized"));

      const verified = jwt.verify(token, config.jwt_secret as Secret) as SocketAuthPayload;
      if (!verified?.userId) return next(new Error("Unauthorized"));

      socket.data.user = { userId: verified.userId, role: verified.role };
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data?.user?.userId as string | undefined;
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`User connected: ${userId} (Socket: ${socket.id})`);
    }

    // Join a conversation room
    socket.on("join_conversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`Socket ${socket.id} joined conversation: ${conversationId}`);
    });

    // Leave a conversation room
    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`Socket ${socket.id} left conversation: ${conversationId}`);
    });

    // Handle typing status
    socket.on("typing", (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      socket.to(`conversation:${data.conversationId}`).emit("user_typing", data);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}`);
    });
  });

  return io;
};
