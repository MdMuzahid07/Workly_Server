/*
  Warnings:

  - A unique constraint covering the columns `[name,planType]` on the table `plans` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('EMPLOYER', 'JOB_SEEKER');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'LINK');

-- CreateEnum
CREATE TYPE "ReportSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VALIDATED', 'PENDING_REVIEW', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentCategory" AS ENUM ('EMPLOYER_PLAN', 'SEEKER_PREMIUM');

-- AlterEnum
ALTER TYPE "MessageStatus" ADD VALUE 'DELETED';

-- DropIndex
DROP INDEX "plans_name_key";

-- DropIndex
DROP INDEX "resumes_userId_fileName_key";

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN     "allowDirectMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "profileVisibility" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showEmployeeCount" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "conversation_participants" ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "education" ADD COLUMN     "level" VARCHAR(100),
ADD COLUMN     "year" VARCHAR(10);

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "userSubscriptionId" TEXT,
ALTER COLUMN "companyId" DROP NOT NULL,
ALTER COLUMN "currency" SET DEFAULT 'BDT';

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "messageType" "MessageType" NOT NULL DEFAULT 'TEXT';

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "createdByAdminId" TEXT,
ADD COLUMN     "isCustom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planType" "PlanType" NOT NULL DEFAULT 'JOB_SEEKER',
ALTER COLUMN "currency" SET DEFAULT 'BDT';

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "facebookUrl" VARCHAR(500),
ADD COLUMN     "githubUrl" VARCHAR(500),
ADD COLUMN     "twitterUrl" VARCHAR(500),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "videoResumeUrl" VARCHAR(500);

-- AlterTable
ALTER TABLE "resumes" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "profileViews" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "searchVisibility" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "work_experience" ADD COLUMN     "employmentType" VARCHAR(100);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "link" VARCHAR(500),
    "repoUrl" VARCHAR(500),
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "current" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "street" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "zipCode" VARCHAR(20),
    "country" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteers" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "role" VARCHAR(255) NOT NULL,
    "organization" VARCHAR(255) NOT NULL,
    "cause" VARCHAR(255),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "awards" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "issuer" VARCHAR(255) NOT NULL,
    "issueDate" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "publisher" VARCHAR(255) NOT NULL,
    "publishDate" TIMESTAMP(3),
    "link" VARCHAR(500),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "references" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "relationship" VARCHAR(255) NOT NULL,
    "company" VARCHAR(255),
    "position" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "language" VARCHAR(100) NOT NULL,
    "proficiency" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "lastUpdated" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_reports" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "comment" TEXT,
    "severity" "ReportSeverity" NOT NULL DEFAULT 'LOW',
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "aiMatchmaking" BOOLEAN NOT NULL DEFAULT true,
    "publicRegistration" BOOLEAN NOT NULL DEFAULT true,
    "globalNotifications" BOOLEAN NOT NULL DEFAULT true,
    "extendedAuditLogging" BOOLEAN NOT NULL DEFAULT true,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "siteName" TEXT NOT NULL DEFAULT 'Workly',
    "siteSlogan" TEXT,
    "siteLogo" TEXT,
    "supportEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "tranId" VARCHAR(30) NOT NULL,
    "valId" VARCHAR(100),
    "sessionKey" VARCHAR(255),
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'BDT',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "category" "PaymentCategory" NOT NULL,
    "planId" VARCHAR(100) NOT NULL,
    "cardType" VARCHAR(100),
    "bankTranId" VARCHAR(100),
    "storeAmount" DOUBLE PRECISION,
    "riskLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_counters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "period" TEXT NOT NULL,
    "jobsPosted" INTEGER NOT NULL DEFAULT 0,
    "applicationsSubmitted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_profileId_idx" ON "projects"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "addresses_profileId_key" ON "addresses"("profileId");

-- CreateIndex
CREATE INDEX "volunteers_profileId_idx" ON "volunteers"("profileId");

-- CreateIndex
CREATE INDEX "awards_profileId_idx" ON "awards"("profileId");

-- CreateIndex
CREATE INDEX "publications_profileId_idx" ON "publications"("profileId");

-- CreateIndex
CREATE INDEX "references_profileId_idx" ON "references"("profileId");

-- CreateIndex
CREATE INDEX "languages_profileId_idx" ON "languages"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_slug_key" ON "legal_documents"("slug");

-- CreateIndex
CREATE INDEX "job_reports_jobId_idx" ON "job_reports"("jobId");

-- CreateIndex
CREATE INDEX "job_reports_reporterId_idx" ON "job_reports"("reporterId");

-- CreateIndex
CREATE INDEX "job_reports_status_idx" ON "job_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_tranId_key" ON "payment_transactions"("tranId");

-- CreateIndex
CREATE INDEX "payment_transactions_userId_idx" ON "payment_transactions"("userId");

-- CreateIndex
CREATE INDEX "payment_transactions_companyId_idx" ON "payment_transactions"("companyId");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_userId_key" ON "user_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "user_subscriptions_status_idx" ON "user_subscriptions"("status");

-- CreateIndex
CREATE INDEX "user_subscriptions_endDate_idx" ON "user_subscriptions"("endDate");

-- CreateIndex
CREATE INDEX "usage_counters_userId_period_idx" ON "usage_counters"("userId", "period");

-- CreateIndex
CREATE INDEX "usage_counters_companyId_period_idx" ON "usage_counters"("companyId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "usage_counters_userId_period_key" ON "usage_counters"("userId", "period");

-- CreateIndex
CREATE INDEX "applications_deletedAt_idx" ON "applications"("deletedAt");

-- CreateIndex
CREATE INDEX "plans_planType_isActive_idx" ON "plans"("planType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_planType_key" ON "plans"("name", "planType");

-- CreateIndex
CREATE INDEX "resumes_deletedAt_idx" ON "resumes"("deletedAt");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "user_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "references" ADD CONSTRAINT "references_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "languages" ADD CONSTRAINT "languages_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_reports" ADD CONSTRAINT "job_reports_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_reports" ADD CONSTRAINT "job_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
