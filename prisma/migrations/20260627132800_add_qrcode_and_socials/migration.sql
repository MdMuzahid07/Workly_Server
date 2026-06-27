-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN "qrCodeUrl" TEXT NOT NULL DEFAULT 'https://mdmuzahid.vercel.app',
ADD COLUMN "footerSocials" JSONB;
