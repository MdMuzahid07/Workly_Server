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
  if (authToken) return authToken;

  const headerAuth =
    typeof handshake.headers?.authorization === "string"
      ? (handshake.headers.authorization as string)
      : null;
  if (!headerAuth) return null;
  return headerAuth.startsWith("Bearer ") ? (headerAuth.split(" ")[1] ?? null) : headerAuth;
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
    }
  });

  return io;
};
