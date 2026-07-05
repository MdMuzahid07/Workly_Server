import cron, { type ScheduledTask } from "node-cron";
import { Expo } from "expo-server-sdk";
import prisma from "../utils/prismaClient.js";
import { pushService } from "../services/push.service.js";

const expo = new Expo();

export function startPushReceiptJob(): ScheduledTask {
  // Every 20 minutes — Expo receipts are usually available ~15 min after sending
  const task = cron.schedule("*/20 * * * *", async () => {
    try {
      await checkPushReceipts();
    } catch (err) {
      console.error("[PushReceiptJob] Cron execution failed:", err);
    }
  });

  console.log("[CRON] Push receipt checker job registered (every 20 min)");

  return task;
}

async function checkPushReceipts(): Promise<void> {
  // Fetch pending receipts older than 10 minutes (give Expo time to process)
  const pending = await (prisma as any).pushReceipt.findMany({
    where: {
      status: "pending",
      checkedAt: null,
      createdAt: {
        lte: new Date(Date.now() - 10 * 60 * 1000), // older than 10 minutes
        gte: new Date(Date.now() - 48 * 60 * 60 * 1000), // not older than 48 hours
      },
    },
    take: 1000,
    select: { ticketId: true, pushToken: true },
  });

  if (pending.length === 0) return;

  const ticketIds = pending.map((r: any) => r.ticketId);
  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(ticketIds);

  for (const chunk of receiptIdChunks) {
    const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

    for (const [receiptId, receipt] of Object.entries(receipts) as [string, any][]) {
      if (receipt.status === "error") {
        const errorCode = receipt.details?.error;
        console.warn("[PushReceiptJob] Receipt error:", errorCode, receiptId);

        if (errorCode === "DeviceNotRegistered") {
          const record = pending.find((r: any) => r.ticketId === receiptId);
          if (record?.pushToken) {
            await pushService.deactivateToken(record.pushToken);
            console.info(`[PushReceiptJob] Deactivated dead token: ${record.pushToken}`);
          }
        }

        await (prisma as any).pushReceipt.update({
          where: { ticketId: receiptId },
          data: {
            status: "error",
            errorCode: errorCode ?? "Unknown",
            checkedAt: new Date(),
          },
        });
      } else if (receipt.status === "ok") {
        await (prisma as any).pushReceipt.update({
          where: { ticketId: receiptId },
          data: {
            status: "ok",
            checkedAt: new Date(),
          },
        });
      }
    }
  }
}
