import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/index.js';
import logger from '../utils/logger.js';
import {
  sendPasswordResetEmail,
  sendResendVerificationEmail,
  sendVerificationEmail,
  sendNewApplicationEmail,
  sendApplicationStatusUpdateEmail,
  sendInterviewScheduledEmail,
  sendSubscriptionRenewalEmail,
  sendBroadcastEmail,
} from '../utils/emailService.js';
import notificationService from '../app/modules/notification/notification.service.js';

// Resolve Valkey service connection string
const redisUrl = env.QUEUE_REDIS_URL || env.REDIS_URL || 'valkey://127.0.0.1:6379';

// Shared Valkey connection factory helper
// BullMQ requires maxRetriesPerRequest to be null on Redis client connections.
const createConnection = () => {
  const conn = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  });

  conn.on('error', (err) => {
    logger.error({ err }, '[Valkey] Connection error');
  });

  return conn;
};

// Share one write-connection client for queue operations
const queueConnection = createConnection();

// ============================================================================
// 1. Queues Definitions
// ============================================================================
export const emailQueue = new Queue('email', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: { maxCount: 100 },
    removeOnFail: { maxCount: 500 },
  },
});

export const notificationQueue = new Queue('notification', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: { maxCount: 100 },
    removeOnFail: { maxCount: 500 },
  },
});

export const analyticsQueue = new Queue('analytics', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: { maxCount: 100 },
    removeOnFail: { maxCount: 500 },
  },
});

// ============================================================================
// 2. Worker Handlers
// ============================================================================

/**
 * Handles all email-related jobs.
 */
async function emailWorkerHandler(job: Job) {
  logger.info({ jobId: job.id, jobName: job.name }, '[Queue:Email] Processing job');

  switch (job.name) {
    case 'sendVerificationEmail': {
      const { email, token } = job.data;
      await sendVerificationEmail(email, token);
      break;
    }
    case 'sendPasswordResetEmail': {
      const { email, token } = job.data;
      await sendPasswordResetEmail(email, token);
      break;
    }
    case 'sendResendVerificationEmail': {
      const { email, token } = job.data;
      await sendResendVerificationEmail(email, token);
      break;
    }
    case 'sendNewApplicationEmail': {
      const {
        email,
        fullName,
        candidateName,
        jobTitle,
        companyName,
        yearsOfExperience,
        currentLocation,
        applicationUrl,
      } = job.data;
      await sendNewApplicationEmail(
        email,
        fullName,
        candidateName,
        jobTitle,
        companyName,
        yearsOfExperience,
        currentLocation,
        applicationUrl,
      );
      break;
    }
    case 'sendApplicationStatusUpdateEmail': {
      const {
        email,
        fullName,
        jobTitle,
        companyName,
        status,
        reason,
        interviewScheduledAt,
        interviewNotes,
      } = job.data;
      await sendApplicationStatusUpdateEmail(
        email,
        fullName,
        jobTitle,
        companyName,
        status,
        reason,
        interviewScheduledAt,
        interviewNotes,
      );
      break;
    }
    case 'sendInterviewScheduledEmail': {
      const {
        email,
        fullName,
        candidateName,
        jobTitle,
        companyName,
        scheduledAt,
        interviewNotes,
        joinUrl,
      } = job.data;
      await sendInterviewScheduledEmail(
        email,
        fullName,
        candidateName,
        jobTitle,
        companyName,
        scheduledAt,
        interviewNotes,
        joinUrl,
      );
      break;
    }
    case 'sendSubscriptionRenewalEmail': {
      const { email, fullName, planName, expiryDate, status } = job.data;
      await sendSubscriptionRenewalEmail(email, fullName, planName, expiryDate, status);
      break;
    }
    case 'sendBroadcastEmail': {
      const { to, subject, html } = job.data;
      await sendBroadcastEmail(to, subject, html);
      break;
    }
    default:
      logger.warn({ jobName: job.name }, '[Queue:Email] Unknown job name received');
      throw new Error(`Unknown job name: ${job.name}`);
  }
}

/**
 * Handles all notification-related jobs (internal notifications, push, etc.).
 */
async function notificationWorkerHandler(job: Job) {
  logger.info({ jobId: job.id, jobName: job.name }, '[Queue:Notification] Processing job');

  if (job.name === 'createNotification') {
    const input = job.data;
    await notificationService.createNotification(input);
  } else {
    logger.warn({ jobName: job.name }, '[Queue:Notification] Unknown job name received');
    throw new Error(`Unknown job name: ${job.name}`);
  }
}

/**
 * Handles all analytics/metrics collection jobs.
 */
async function analyticsWorkerHandler(job: Job) {
  logger.info({ jobId: job.id, jobName: job.name }, '[Queue:Analytics] Processing job');

  if (job.name === 'trackEvent') {
    const { eventName, userId, properties, timestamp } = job.data;
    logger.info({ eventName, userId, properties, timestamp }, '[Queue:Analytics] Event tracked');
  } else {
    logger.warn({ jobName: job.name }, '[Queue:Analytics] Unknown job name received');
    throw new Error(`Unknown job name: ${job.name}`);
  }
}

// ============================================================================
// 3. Worker Initializations
// ============================================================================

// Each worker gets its own connection since they block waiting for new jobs.
export const emailWorker = new Worker('email', emailWorkerHandler, {
  connection: createConnection(),
  concurrency: env.EMAIL_WORKER_CONCURRENCY,
});

export const notificationWorker = new Worker('notification', notificationWorkerHandler, {
  connection: createConnection(),
  concurrency: env.NOTIFICATION_WORKER_CONCURRENCY,
});

export const analyticsWorker = new Worker('analytics', analyticsWorkerHandler, {
  connection: createConnection(),
  concurrency: env.ANALYTICS_WORKER_CONCURRENCY,
});

// ============================================================================
// 4. Observability Listeners
// ============================================================================

const workers = [
  { name: 'Email', worker: emailWorker },
  { name: 'Notification', worker: notificationWorker },
  { name: 'Analytics', worker: analyticsWorker },
];

for (const { name, worker } of workers) {
  worker.on('active', (job) => {
    logger.debug({ jobId: job.id, jobName: job.name }, `[Worker:${name}] Job active`);
  });

  worker.on('completed', (job) => {
    logger.info(
      { jobId: job.id, jobName: job.name },
      `[Worker:${name}] Job completed successfully`,
    );
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, jobName: job?.name, err }, `[Worker:${name}] Job failed`);
  });

  worker.on('error', (err) => {
    logger.error({ err }, `[Worker:${name}] Worker general error`);
  });
}

// ============================================================================
// 5. Graceful Shutdown Coordinator
// ============================================================================
export async function shutdownQueuesAndWorkers() {
  logger.info('[Queue:Shutdown] Stopping and closing all queues and workers…');

  // Close workers first so they stop accepting new jobs and finish active jobs.
  await Promise.allSettled([
    emailWorker.close(),
    notificationWorker.close(),
    analyticsWorker.close(),
  ]);

  // Close queue connections
  await Promise.allSettled([
    emailQueue.close(),
    notificationQueue.close(),
    analyticsQueue.close(),
    queueConnection.quit(),
  ]);

  logger.info('[Queue:Shutdown] Queue and worker shutdown complete.');
}
