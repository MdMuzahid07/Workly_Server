-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "renewalReminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_subscriptions" ADD COLUMN     "renewalReminderSentAt" TIMESTAMP(3);
