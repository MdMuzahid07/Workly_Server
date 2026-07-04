import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import prisma from "../utils/prismaClient.js";
import { NotificationType } from "../generated/prisma/index.js";

const expo = new Expo();

// Maps notification types to Android channel IDs
const CHANNEL_MAP: Record<NotificationType, string> = {
  APPLICATION_RECEIVED: "applications",
  APPLICATION_STATUS_CHANGE: "applications",
  NEW_JOB_MATCH: "jobs",
  JOB_EXPIRING: "applications",
  JOB_CLOSED: "applications",
  MESSAGE_RECEIVED: "messages",
  SYSTEM_ANNOUNCEMENT: "system",
  PROFILE_INCOMPLETE: "system",
  INTERVIEW_SCHEDULED: "applications",
  PROFILE_VIEWED: "system",
  JOB_VIEWED: "system",
};

// Maps notification types to user preference keys
const PREFERENCE_MAP: Record<NotificationType, string | null> = {
  APPLICATION_STATUS_CHANGE: "applicationUpdates",
  INTERVIEW_SCHEDULED: "interviewAlerts",
  MESSAGE_RECEIVED: "newMessages",
  NEW_JOB_MATCH: "jobRecommendations",
  APPLICATION_RECEIVED: "applicationUpdates",
  JOB_EXPIRING: "subscriptionAlerts",
  JOB_CLOSED: "subscriptionAlerts",
  SYSTEM_ANNOUNCEMENT: "systemAnnouncements",
  PROFILE_INCOMPLETE: "systemAnnouncements",
  PROFILE_VIEWED: "systemAnnouncements",
  JOB_VIEWED: "systemAnnouncements",
};

export interface PushPayload {
  userId: string;
  notificationId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class PushService {
  async send(payload: PushPayload): Promise<void> {
    const { userId, notificationId, type, title, body, data } = payload;

    try {
      // Step 1: Check user notification preferences
      const prefKey = PREFERENCE_MAP[type];
      if (prefKey) {
        const prefs = await (prisma as any).notificationPreference.findUnique({
          where: { userId },
        });
        if (prefs && (prefs as any)[prefKey] === false) {
          // User has opted out of this category
          return;
        }
      }

      // Step 2: Fetch active push tokens
      const tokens = await (prisma as any).pushToken.findMany({
        where: { userId, isActive: true },
        select: { expoPushToken: true },
      });

      if (tokens.length === 0) return;

      // Step 3: Filter & build message payloads
      const messages: ExpoPushMessage[] = tokens
        .filter((t: any) => Expo.isExpoPushToken(t.expoPushToken))
        .map((t: any) => ({
          to: t.expoPushToken,
          channelId: CHANNEL_MAP[type] ?? "default",
          sound: "default",
          title,
          body,
          data: {
            type,
            notificationId,
            ...(data ?? {}),
          },
          badge: 1,
          priority: type === "MESSAGE_RECEIVED" ? "high" : "normal",
          expiration: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours TTL
        }));

      if (messages.length === 0) return;

      // Step 4: Batch send messages
      const chunks = expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...chunkTickets);
      }

      // Step 5: Save tickets for receipt checks
      const receiptRows = tickets.map((ticket, i) => ({
        ticketId: (ticket as any).id ?? `unknown-${Date.now()}-${i}`,
        notificationId,
        userId,
        pushToken: (messages[i]?.to as string) ?? "",
        status: ticket.status === "ok" ? "pending" : "error",
        errorCode: ticket.status === "error" ? (ticket.details?.error ?? null) : null,
      }));

      await (prisma as any).pushReceipt.createMany({ data: receiptRows });

      // Step 6: Handle synchronous errors immediately
      for (const ticket of tickets) {
        if (ticket.status === "error") {
          const error = ticket.details?.error;
          if (error === "DeviceNotRegistered") {
            const tokenStr = messages[tickets.indexOf(ticket)]?.to as string;
            if (tokenStr) {
              await this.deactivateToken(tokenStr);
            }
          }
          console.error("[PushService] Send error:", error, ticket.message);
        }
      }
    } catch (err) {
      console.error("[PushService] Send flow error:", err);
    }
  }

  async deactivateToken(expoPushToken: string): Promise<void> {
    await (prisma as any).pushToken.updateMany({
      where: { expoPushToken },
      data: { isActive: false },
    });
  }

  async upsertToken(
    userId: string,
    expoPushToken: string,
    deviceToken: string | null,
    platform: "ios" | "android",
  ): Promise<void> {
    if (!Expo.isExpoPushToken(expoPushToken)) {
      throw new Error(`Invalid Expo push token: ${expoPushToken}`);
    }

    await (prisma as any).pushToken.upsert({
      where: { expoPushToken },
      create: {
        userId,
        expoPushToken,
        deviceToken,
        platform,
        isActive: true,
        lastSeenAt: new Date(),
      },
      update: {
        userId,
        deviceToken,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });
  }

  async removeUserTokens(userId: string): Promise<void> {
    await (prisma as any).pushToken.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }
}

export const pushService = new PushService();
