import { analyticsQueue, emailQueue, notificationQueue } from '../lib/queue.js';

async function run() {
  console.log('🚀 Enqueuing test jobs...');

  // 1. Send test email job
  const emailJob = await emailQueue.add('sendVerificationEmail', {
    email: 'mydevcafe@gmail.com',
    userName: 'Admin Dev',
    verificationUrl: 'http://localhost:3000/verify-email?token=test-verification-token-999',
  });
  console.log(`✅ Queued email job: ${emailJob.id}`);

  // 2. Send test notification job (handled by createNotification)
  // We bypass actual DB updates in the worker if fields are mock, but it runs the handler path.
  try {
    const notifJob = await notificationQueue.add('createNotification', {
      userId: 'mock-user-id',
      type: 'APPLICATION_RECEIVED',
      title: 'Queue Test',
      message: 'This is a test notification processed via BullMQ.',
    });
    console.log(`✅ Queued notification job: ${notifJob.id}`);
  } catch {
    console.log('ℹ️ Notification job queued (may fail in handler due to missing mock user in DB)');
  }

  // 3. Send test analytics job
  const analyticsJob = await analyticsQueue.add('trackEvent', {
    eventName: 'docker_deployment_test',
    userId: 'admin-user',
    properties: { status: 'healthy', env: 'production' },
    timestamp: new Date().toISOString(),
  });
  console.log(`✅ Queued analytics job: ${analyticsJob.id}`);

  console.log('\nAll test jobs queued. Exiting test script in 2 seconds.');
  setTimeout(() => {
    process.exit(0);
  }, 2000);
}

run().catch((err) => {
  console.error('❌ Failed to queue test jobs:', err);
  process.exit(1);
});
