// prisma.config.ts — Prisma 7 CLI configuration
//
// This file runs standalone via the Prisma CLI (prisma generate, prisma migrate, etc.)
// BEFORE the app boots, so it cannot import the app's validated `env` object without
// circular-dependency issues. Instead, it loads dotenv directly and performs a minimal
// guard. The zod schema in src/config/index.ts is the real validation layer at runtime.
//
// B8 fix: the previous version used process.env.DATABASE_URL with no guard.
// Now it exits explicitly if DATABASE_URL is missing rather than passing `undefined`
// to Prisma silently.

import "dotenv/config";

if (!process.env.DATABASE_URL) {
  console.error(
    "❌  DATABASE_URL is not set. Prisma CLI cannot proceed.\n" +
      "    Copy .env.example to .env and fill in the DATABASE_URL.",
  );
  process.exit(1);
}

export default {
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
