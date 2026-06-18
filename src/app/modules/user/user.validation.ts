import { z } from "zod";

export const registerPushTokenBody = z.object({
  expoPushToken: z.string().min(1, "expoPushToken is required"),
  deviceToken: z.string().nullable().optional(),
  platform: z.enum(["ios", "android"]),
});

export const deregisterPushTokenBody = z.object({
  expoPushToken: z.string().min(1, "expoPushToken is required"),
});

export const updatePreferencesBody = z.object({
  applicationUpdates: z.boolean().optional(),
  newMessages: z.boolean().optional(),
  jobRecommendations: z.boolean().optional(),
  jobAlerts: z.boolean().optional(),
  interviewAlerts: z.boolean().optional(),
  subscriptionAlerts: z.boolean().optional(),
  systemAnnouncements: z.boolean().optional(),
});
