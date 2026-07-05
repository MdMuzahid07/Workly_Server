import http, { type Server } from "http";
import app from "./app.js";
import { env } from "./config/index.js";
import { initRateLimiters } from "./lib/rateLimiters.js";
import { initSocket } from "./socket/index.js";
import prisma from "./utils/prismaClient.js";
import bcrypt from "bcrypt";
import { startPushReceiptJob } from "./jobs/push.receipt.job.js";
import { startSubscriptionReminderJob } from "./jobs/subscription.reminder.job.js";
import { startSubscriptionExpiryJob } from "./jobs/subscription.expiry.job.js";

const port = env.PORT;

/**
 * Seeds the three hardcoded dev accounts on first boot in development.
 *
 * Credentials are intentionally kept as-is (mydevcafe@gmail.com/ADMIN,
 * mdmuzahid7396@gmail.com/EMPLOYER, mdmuzahid.dev@gmail.com/JOB_SEEKER)
 * for fast local login. This is a deliberate choice, not an oversight.
 *
 * TWO independent guards prevent this from ever touching a non-dev database:
 *  1. The caller in main() checks env.NODE_ENV === "development" (P0.2 fix:
 *     was config.environment which read ENVIRONMENT, not NODE_ENV — now both
 *     read the same zod-validated value, closing the gating-var mismatch bug).
 *  2. This function itself throws immediately if NODE_ENV=production, so even
 *     if a future refactor calls it from somewhere new (cron, admin endpoint)
 *     without the caller check, it refuses to run.
 *
 * The database boundary is the real control (dev/staging/prod must never share
 * a database). The code guards are defense-in-depth.
 */
async function seedDevUsers() {
  // P0.1 — Second independent guard: reject unconditionally in production.
  // This throws rather than returning silently so a misconfigured caller fails
  // loudly instead of silently doing nothing.
  if (env.NODE_ENV === "production") {
    throw new Error("[Seed] seedDevUsers() must never run with NODE_ENV=production. Aborting.");
  }

  try {
    const devUsers = [
      {
        email: "mydevcafe@gmail.com",
        password: "Admin#$12345@",
        fullName: "Admin Dev",
        role: "ADMIN" as const,
      },
      {
        email: "mdmuzahid7396@gmail.com",
        password: "HDiotuIDG85678%7%$#KjgDJG",
        fullName: "Muzahid Employer",
        role: "EMPLOYER" as const,
      },
      {
        email: "mdmuzahid.dev@gmail.com",
        password: "FKJhOFIt985^&54#$%#",
        fullName: "Muzahid Seeker",
        role: "JOB_SEEKER" as const,
      },
    ];

    for (const u of devUsers) {
      const exists = await prisma.user.findUnique({
        where: { email: u.email },
      });

      if (!exists) {
        console.log(`[Seed] Creating dev user: ${u.email}`);
        const passwordHash = await bcrypt.hash(u.password, env.BCRYPT_SALT_ROUNDS);
        await prisma.user.create({
          data: {
            email: u.email,
            passwordHash,
            fullName: u.fullName,
            role: u.role,
            isVerified: true,
            isActive: true,
          },
        });
      } else {
        // Ensure they are verified & active
        if (!exists.isVerified || !exists.isActive) {
          console.log(`[Seed] Ensuring dev user ${u.email} is active and verified`);
          await prisma.user.update({
            where: { id: exists.id },
            data: { isVerified: true, isActive: true },
          });
        }
      }
    }
  } catch (error) {
    console.error("[Seed] Failed to seed dev users:", error);
  }
}

/**
 * Main entry point. Resolves the rate-limit store before binding the server
 * so the limiter is fully configured (Redis or MemoryStore) from request #1.
 */
async function main() {
  // Initialise rate limiters (may connect to Redis if REDIS_URL is set)
  await initRateLimiters();

  const server: Server = http.createServer(app);
  initSocket(server);

  // P0.1 + P0.2 fix: both guards now use env.NODE_ENV (the single zod-validated
  // source of truth). The old split between process.env.NODE_ENV and
  // config.environment (reading ENVIRONMENT) is closed.
  if (env.NODE_ENV === "development") {
    await seedDevUsers();
  }

  // ── Background jobs ──────────────────────────────────────────────────────
  // Push receipt checker (every 20 min)
  const pushReceiptJob = startPushReceiptJob();

  // Subscription renewal reminder (daily at 08:00)
  const subscriptionReminderJob = startSubscriptionReminderJob();

  // Subscription expiry sweeper (daily at 02:00)
  const subscriptionExpiryJob = startSubscriptionExpiryJob();

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  // Stop cron tasks before the process exits so no job fires mid-drain.
  const shutdown = async (signal: string) => {
    console.log(`[Server] ${signal} received — shutting down gracefully…`);
    pushReceiptJob.stop();
    subscriptionReminderJob.stop();
    subscriptionExpiryJob.stop();
    server.close(async () => {
      await prisma.$disconnect();
      console.log("[Server] Shutdown complete.");
      process.exit(0);
    });

    // Force-exit after 10 s if graceful drain takes too long.
    setTimeout(() => {
      console.error("[Server] Graceful shutdown timed out — forcing exit.");
      process.exit(1);
    }, 10_000).unref();
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  server.listen(Number(port), "0.0.0.0", () => {
    console.log(`Server running 🚀🚀 on => port  ${port}`);
  });

  server.on("error", (error: Error) => {
    console.log("Server error => ", error.message);
    process.exit(1);
  });
}

// P0.1 fix: was process.env.NODE_ENV — now uses env.NODE_ENV (zod-validated).
if (env.NODE_ENV !== "production") {
  main();
}

export default app;
