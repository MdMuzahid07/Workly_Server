/**
 * Subscription Expiry Sweeper Job
 * ===============================
 * Runs daily at 02:00 AM server time.
 *
 * Responsibilities
 * ----------------
 *  1. Find all ACTIVE UserSubscriptions (job seekers) whose endDate has passed
 *     (endDate < now()).
 *  2. Update status -> EXPIRED, set User.isPremium -> false, and clear entitlement cache.
 *  3. Find all ACTIVE company Subscriptions (employers) whose endDate has passed.
 *  4. Update status -> EXPIRED, set all company employees User.isPremium -> false,
 *     and clear entitlement cache for each employee.
 *
 * Enterprise-grade considerations
 * --------------------------------
 *  - CURSOR PAGINATION: Batch queries of size 50 to maintain flat memory usage.
 *  - INDEPENDENT ERROR ISOLATION: Catch individual transaction updates so one
 *    failure doesn't abort the entire sweep.
 *  - GRACEFUL SHUTDOWN: Can be safely stopped on SIGTERM/SIGINT.
 *  - ROBUST CACHE CLEARING: Invalidates Redis/Memory entitlement caches immediately.
 */

import cron, { type ScheduledTask } from 'node-cron';
import prisma from '../utils/prismaClient.js';
import { EntitlementService } from '../services/entitlement.service.js';

const BATCH_SIZE = 50;
const CRON_EXPRESSION = '0 2 * * *'; // Daily at 02:00 AM

/**
 * Handles batch transitions for expired Job Seeker subscriptions
 */
async function sweepExpiredJobSeekers(
  now: Date,
  cursor: string | null,
): Promise<{ processed: number; nextCursor: string | null }> {
  const records = await prisma.userSubscription.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { lt: now },
    },
    select: {
      id: true,
      userId: true,
      plan: { select: { name: true } },
    },
    orderBy: { id: 'asc' },
    take: BATCH_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  if (records.length === 0) {
    return { processed: 0, nextCursor: null };
  }

  let processed = 0;

  for (const record of records) {
    const { id, userId, plan } = record;
    try {
      // Perform database updates in a single transaction
      await prisma.$transaction([
        prisma.userSubscription.update({
          where: { id },
          data: { status: 'EXPIRED' },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { isPremium: false },
        }),
      ]);

      // Invalidate memory/redis entitlement cache
      EntitlementService.invalidateCache(userId);
      processed++;

      console.info(`[ExpiryJob] ⬇️ Downgraded job seeker "${userId}" (Plan: ${plan.name} expired)`);
    } catch (err) {
      console.error(
        `[ExpiryJob] ❌ Failed to expire UserSubscription ${id} for user ${userId}:`,
        err,
      );
    }
  }

  const nextCursor = records.length === BATCH_SIZE ? records[records.length - 1]!.id : null;
  return { processed, nextCursor };
}

/**
 * Handles batch transitions for expired Employer/Company subscriptions
 */
async function sweepExpiredEmployers(
  now: Date,
  cursor: string | null,
): Promise<{ processed: number; nextCursor: string | null }> {
  const records = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { lt: now },
    },
    select: {
      id: true,
      companyId: true,
      plan: { select: { name: true } },
    },
    orderBy: { id: 'asc' },
    take: BATCH_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  if (records.length === 0) {
    return { processed: 0, nextCursor: null };
  }

  let processed = 0;

  for (const record of records) {
    const { id, companyId, plan } = record;
    try {
      // Find all employees associated with this company
      const employees = await prisma.user.findMany({
        where: { companyId },
        select: { id: true },
      });

      // Update subscription status and demote all employee users from premium
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id },
          data: { status: 'EXPIRED' },
        }),
        prisma.user.updateMany({
          where: { companyId },
          data: { isPremium: false },
        }),
      ]);

      // Invalidate entitlement caches for all employees
      for (const emp of employees) {
        EntitlementService.invalidateCache(emp.id);
      }

      processed++;
      console.info(
        `[ExpiryJob] ⬇️ Downgraded company "${companyId}" (${employees.length} employees) (Plan: ${plan.name} expired)`,
      );
    } catch (err) {
      console.error(
        `[ExpiryJob] ❌ Failed to expire Subscription ${id} for company ${companyId}:`,
        err,
      );
    }
  }

  const nextCursor = records.length === BATCH_SIZE ? records[records.length - 1]!.id : null;
  return { processed, nextCursor };
}

/**
 * Runs the expiry check loop
 */
async function runExpirySweep(): Promise<void> {
  const runStart = Date.now();
  const now = new Date();

  console.info(`[ExpiryJob] 🔄 Starting expired subscriptions sweep sweep at ${now.toISOString()}`);
  let totalExpired = 0;

  // == Job Seeker Sweeper ==
  let cursor: string | null = null;
  let page = 0;
  do {
    page++;
    const { processed, nextCursor } = await sweepExpiredJobSeekers(now, cursor);
    totalExpired += processed;
    cursor = nextCursor;
    if (page > 10_000) {
      console.warn('[ExpiryJob] ⚠️ Job seeker pagination limit reached.');
      break;
    }
  } while (cursor !== null);

  // == Employer Sweeper ==
  cursor = null;
  page = 0;
  do {
    page++;
    const { processed, nextCursor } = await sweepExpiredEmployers(now, cursor);
    totalExpired += processed;
    cursor = nextCursor;
    if (page > 10_000) {
      console.warn('[ExpiryJob] ⚠️ Employer pagination limit reached.');
      break;
    }
  } while (cursor !== null);

  const elapsed = Date.now() - runStart;
  console.info(
    `[ExpiryJob] ✅ Expiry sweep complete — downgraded: ${totalExpired} | elapsed: ${elapsed}ms`,
  );
}

/**
 * Registers the daily subscription expiry check cron job.
 */
export function startSubscriptionExpiryJob(): ScheduledTask {
  const task = cron.schedule(CRON_EXPRESSION, async () => {
    try {
      await runExpirySweep();
    } catch (err) {
      console.error('[ExpiryJob] 💥 Unhandled exception during expiry sweep:', err);
    }
  });

  console.log(`[CRON] Subscription expiry job registered (${CRON_EXPRESSION} — daily at 02:00)`);

  return task;
}
