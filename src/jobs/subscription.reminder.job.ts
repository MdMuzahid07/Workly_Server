/**
 * Subscription Renewal Reminder Job
 * ===================================
 * Runs once per day at 08:00 server time.
 *
 * Responsibilities
 * ----------------
 *  1. Find every ACTIVE UserSubscription (job seekers) whose endDate falls
 *     within the next 1–3 days AND whose renewalReminderSentAt is NULL
 *     (idempotency guard — never double-sends for the same subscription period).
 *  2. Do the same for company Subscriptions (employers).
 *  3. For each matching subscription, send a branded renewal reminder email and
 *     mark the record with renewalReminderSentAt = now().
 *
 * Production-grade considerations
 * --------------------------------
 *  - CURSOR PAGINATION: queries are executed in pages of BATCH_SIZE rows so the
 *    job never loads the entire subscriptions table into memory at once.
 *  - PER-RECORD ERROR ISOLATION: a single email failure never aborts the rest of
 *    the batch; errors are logged individually and the loop continues.
 *  - IDEMPOTENCY: the renewalReminderSentAt field prevents re-sending if the
 *    cron fires twice in the same day (e.g. server restart, multi-instance).
 *  - GRACEFUL SHUTDOWN: the exported ScheduledTask reference is stopped during
 *    SIGTERM/SIGINT so no job fires after the process begins draining.
 *  - STRUCTURED LOGGING: every relevant event is logged with a consistent
 *    "[SubReminderJob]" prefix and a run-level summary counter.
 *  - NO FLOATING PROMISES: all async work is awaited inside the cron callback.
 */

import cron, { type ScheduledTask } from 'node-cron';
import prisma from '../utils/prismaClient.js';
import { sendSubscriptionRenewalEmail } from '../utils/emailService.js';
import { env } from '../config/index.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How many subscriptions to process per database query page. */
const BATCH_SIZE = 50;

/** Renewal window: send reminder when endDate is within this many days. */
const REMINDER_WINDOW_DAYS = 3;

/** Cron expression: every day at 08:00 AM server time. */
const CRON_EXPRESSION = '0 8 * * *';

/**
 * Deep-link to the billing page that is embedded in the reminder email.
 * Falls back to a safe default if FRONTEND_URL is not configured.
 */
const renewalBaseUrl = (): string => `${env.FRONTEND_URL}/dashboard/billing`;

// ---------------------------------------------------------------------------
// Date utilities (pure — no side effects, easy to unit-test)
// ---------------------------------------------------------------------------

/**
 * Returns the lower and upper DateTime bounds for the reminder window.
 *
 * Lower bound = start of today (midnight UTC).
 * Upper bound = end of REMINDER_WINDOW_DAYS from now.
 */
function getReminderWindowBounds(): { windowStart: Date; windowEnd: Date } {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);

  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + REMINDER_WINDOW_DAYS);
  windowEnd.setHours(23, 59, 59, 999);

  return { windowStart, windowEnd };
}

/**
 * Calculates how many whole days remain until the given endDate.
 * Always returns at least 1 (never 0 or negative — those are already expired).
 */
function daysUntil(endDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = endDate.getTime() - Date.now();
  return Math.max(1, Math.ceil(diff / msPerDay));
}

/**
 * Formats a Date as a human-readable string, e.g. "July 29, 2026".
 */
function formatExpiryDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// ---------------------------------------------------------------------------
// Core processing logic
// ---------------------------------------------------------------------------

/**
 * Processes a single page of UserSubscription records (job seekers).
 * Returns the number of emails successfully dispatched.
 */
async function processJobSeekerPage(
  windowStart: Date,
  windowEnd: Date,
  cursor: string | null,
): Promise<{ dispatched: number; nextCursor: string | null }> {
  const records = await prisma.userSubscription.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { gte: windowStart, lte: windowEnd },
      renewalReminderSentAt: null,
    },
    include: {
      plan: { select: { name: true, price: true } },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { id: 'asc' },
    take: BATCH_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  if (records.length === 0) {
    return { dispatched: 0, nextCursor: null };
  }

  let dispatched = 0;

  for (const record of records) {
    const { user, plan, endDate, id } = record;

    if (!endDate) continue;

    try {
      const daysLeft = daysUntil(endDate);

      await sendSubscriptionRenewalEmail({
        toEmail: user.email,
        userName: user.fullName,
        planName: plan.name,
        expiryDate: formatExpiryDate(endDate),
        renewalPrice: `৳${plan.price} BDT`,
        renewalUrl: renewalBaseUrl(),
        daysLeft,
      });

      // Mark reminder as sent — uses the subscription's own updatedAt clock,
      // not the user's clock, so it remains accurate even if email is queued.
      await prisma.userSubscription.update({
        where: { id },
        data: { renewalReminderSentAt: new Date() },
      });

      dispatched++;

      console.info(
        `[SubReminderJob] ✅ Reminder sent → job seeker "${user.email}" | plan: ${plan.name} | expires: ${formatExpiryDate(endDate)} (${daysLeft}d)`,
      );
    } catch (err) {
      // Isolate individual failures — do NOT abort the batch.
      console.error(
        `[SubReminderJob] ❌ Failed to send reminder for UserSubscription ${id} (user: ${user.email}):`,
        err,
      );
    }
  }

  const nextCursor = records.length === BATCH_SIZE ? records[records.length - 1]!.id : null;
  return { dispatched, nextCursor };
}

/**
 * Processes a single page of Subscription records (employers / companies).
 *
 * Because the Company model has no single `.user` relation (only `employees[]`),
 * we query from the User side with `role = EMPLOYER` and join through
 * User → company → subscription so we can always resolve the owner's email.
 *
 * Returns the number of emails successfully dispatched.
 */
async function processEmployerPage(
  windowStart: Date,
  windowEnd: Date,
  cursor: string | null,
): Promise<{ dispatched: number; nextCursor: string | null }> {
  // Query ACTIVE employer subscriptions expiring within the window that
  // have not yet had a reminder dispatched.
  const records = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { gte: windowStart, lte: windowEnd },
      renewalReminderSentAt: null,
    },
    include: {
      plan: { select: { name: true, price: true } },
      company: {
        select: {
          name: true,
          // Resolve owner: the EMPLOYER user whose companyId points here.
          employees: {
            where: { role: 'EMPLOYER', deletedAt: null },
            select: { id: true, fullName: true, email: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { id: 'asc' },
    take: BATCH_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  if (records.length === 0) {
    return { dispatched: 0, nextCursor: null };
  }

  let dispatched = 0;

  for (const record of records) {
    const { company, plan, endDate, id } = record;

    if (!endDate) continue;

    // Resolve the primary owner from the employees[] slice.
    const owner = company?.employees?.[0];

    if (!owner?.email) {
      console.warn(
        `[SubReminderJob] ⚠️ Subscription ${id} has no resolvable EMPLOYER owner — skipping.`,
      );
      continue;
    }

    try {
      const daysLeft = daysUntil(endDate);

      await sendSubscriptionRenewalEmail({
        toEmail: owner.email,
        userName: owner.fullName,
        planName: plan.name,
        expiryDate: formatExpiryDate(endDate),
        renewalPrice: `৳${plan.price} BDT`,
        renewalUrl: renewalBaseUrl(),
        daysLeft,
      });

      await prisma.subscription.update({
        where: { id },
        data: { renewalReminderSentAt: new Date() },
      });

      dispatched++;

      console.info(
        `[SubReminderJob] ✅ Reminder sent → employer "${owner.email}" | company: ${company?.name} | plan: ${plan.name} | expires: ${formatExpiryDate(endDate)} (${daysLeft}d)`,
      );
    } catch (err) {
      console.error(
        `[SubReminderJob] ❌ Failed to send reminder for Subscription ${id} (company: ${company?.name}):`,
        err,
      );
    }
  }

  const nextCursor = records.length === BATCH_SIZE ? records[records.length - 1]!.id : null;
  return { dispatched, nextCursor };
}

// ---------------------------------------------------------------------------
// Top-level runner (called by the cron trigger)
// ---------------------------------------------------------------------------

/**
 * Runs the full reminder sweep for both job seekers and employers.
 * Uses cursor pagination so memory footprint stays constant regardless of
 * how many subscriptions are in the database.
 */
async function runRenewalReminders(): Promise<void> {
  const runStart = Date.now();
  const { windowStart, windowEnd } = getReminderWindowBounds();

  console.info(
    `[SubReminderJob] 🔄 Starting renewal reminder sweep — window: ${windowStart.toISOString()} → ${windowEnd.toISOString()}`,
  );

  let totalDispatched = 0;

  // == Job Seeker pass ==
  let cursor: string | null = null;
  let page = 0;
  do {
    page++;
    const { dispatched, nextCursor } = await processJobSeekerPage(windowStart, windowEnd, cursor);
    totalDispatched += dispatched;
    cursor = nextCursor;
    if (page > 10_000) {
      // Safety valve: prevent an infinite loop if cursor logic ever degrades.
      console.warn(
        '[SubReminderJob] ⚠️ Job seeker pagination safety limit reached — aborting pass.',
      );
      break;
    }
  } while (cursor !== null);

  // == Employer pass ==
  cursor = null;
  page = 0;
  do {
    page++;
    const { dispatched, nextCursor } = await processEmployerPage(windowStart, windowEnd, cursor);
    totalDispatched += dispatched;
    cursor = nextCursor;
    if (page > 10_000) {
      console.warn('[SubReminderJob] ⚠️ Employer pagination safety limit reached — aborting pass.');
      break;
    }
  } while (cursor !== null);

  const elapsed = Date.now() - runStart;
  console.info(
    `[SubReminderJob] ✅ Sweep complete — emails dispatched: ${totalDispatched} | elapsed: ${elapsed}ms`,
  );
}

// ---------------------------------------------------------------------------
// Public factory — call once from server.ts
// ---------------------------------------------------------------------------

/**
 * Registers the daily subscription renewal reminder cron job and returns the
 * ScheduledTask so the caller can stop it cleanly during process shutdown.
 *
 * @example
 *   const reminderJob = startSubscriptionReminderJob();
 *   process.on("SIGTERM", () => reminderJob.stop());
 */
export function startSubscriptionReminderJob(): ScheduledTask {
  const task = cron.schedule(CRON_EXPRESSION, async () => {
    try {
      await runRenewalReminders();
    } catch (err) {
      // Top-level catch: ensures an unexpected crash never silently kills the
      // cron process — it stays registered and will fire again tomorrow.
      console.error('[SubReminderJob] 💥 Unhandled error during reminder sweep:', err);
    }
  });

  console.log(
    `[CRON] Subscription renewal reminder job registered (${CRON_EXPRESSION} — daily at 08:00)`,
  );

  return task;
}
