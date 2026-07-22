import cron, { type ScheduledTask } from 'node-cron';
import prisma from '../utils/prismaClient.js';
import { PaymentStatus } from '../generated/prisma/index.js';
import paymentService from '../app/modules/payment/payment.service.js';

// Run every 6 hours
const CRON_EXPRESSION = '0 */6 * * *';
const STALE_THRESHOLD_MINUTES = 15;

/**
 * Periodically reconciles stale PENDING payment transactions.
 * Queries SSLCommerz validation endpoint for any transactions left pending > 15 mins.
 */
export function startPaymentReconciliationJob(): ScheduledTask {
  console.info('[Cron] Payment reconciliation job scheduled (Every 6 hours).');

  const task = cron.schedule(CRON_EXPRESSION, async () => {
    try {
      const cutoffTime = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000);

      // Find transactions still in PENDING state after threshold time
      const staleTransactions = await prisma.paymentTransaction.findMany({
        where: {
          status: PaymentStatus.PENDING,
          createdAt: { lt: cutoffTime },
        },
        take: 50, // Batch limit
      });

      if (staleTransactions.length === 0) {
        return;
      }

      console.info(
        `[Cron] Found ${staleTransactions.length} stale pending transactions for reconciliation.`,
      );

      for (const tx of staleTransactions) {
        try {
          if (!tx.sessionKey) {
            // No session key generated, user abandoned before gateway load
            await prisma.paymentTransaction.update({
              where: { id: tx.id },
              data: { status: PaymentStatus.CANCELLED },
            });
            continue;
          }

          // If sessionKey exists, attempt validation via paymentService
          // If SSLCommerz shows valid status, validatePayment will fulfill it
          await paymentService.validatePayment(tx.tranId, tx.sessionKey, {
            verify_sign: true, // Internal reconciliation flag
            verify_key: 'internal',
          });

          console.info(`[Cron] Reconciled transaction ${tx.tranId} successfully.`);
        } catch (err: any) {
          // If gateway returns invalid/not found, mark as CANCELLED/ABANDONED
          if (err?.message?.includes('invalid according to gateway')) {
            await prisma.paymentTransaction.update({
              where: { id: tx.id },
              data: { status: PaymentStatus.CANCELLED },
            });
          }
          console.warn(`[Cron] Reconciliation check for ${tx.tranId}: ${err?.message}`);
        }
      }
    } catch (error) {
      console.error('[Cron] Payment reconciliation failed:', error);
    }
  });

  return task;
}
