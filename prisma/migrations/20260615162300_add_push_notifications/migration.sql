-- CreateTable
CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expoPushToken" TEXT NOT NULL,
    "deviceToken" TEXT,
    "platform" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_receipts" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorCode" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationUpdates" BOOLEAN NOT NULL DEFAULT true,
    "newMessages" BOOLEAN NOT NULL DEFAULT true,
    "jobRecommendations" BOOLEAN NOT NULL DEFAULT true,
    "jobAlerts" BOOLEAN NOT NULL DEFAULT true,
    "interviewAlerts" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionAlerts" BOOLEAN NOT NULL DEFAULT true,
    "systemAnnouncements" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_expoPushToken_key" ON "push_tokens"("expoPushToken");

-- CreateIndex
CREATE INDEX "push_tokens_userId_isActive_idx" ON "push_tokens"("userId", "isActive");

-- CreateIndex
CREATE INDEX "push_tokens_expoPushToken_idx" ON "push_tokens"("expoPushToken");

-- CreateIndex
CREATE UNIQUE INDEX "push_receipts_ticketId_key" ON "push_receipts"("ticketId");

-- CreateIndex
CREATE INDEX "push_receipts_status_createdAt_idx" ON "push_receipts"("status", "createdAt");

-- CreateIndex
CREATE INDEX "push_receipts_ticketId_idx" ON "push_receipts"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
