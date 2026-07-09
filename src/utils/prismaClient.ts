import fs from "fs";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/index.js";
import { env } from "../config/index.js";

const { Pool } = pg;

// ---------------------------------------------------------------------------
// P3 — TLS-aware database connection
//
// The pg.Pool manages connection pooling and connects to the database via TCP/TLS.
// The PrismaPg driver adapter wraps this pool to map queries from the Prisma Engine.
//
// TLS behaviour:
//   - Managed Postgres (Neon, Supabase, RDS): system CAs validate out of the box.
//   - Self-hosted with a real CA cert: set DB_CA_CERT_PATH to the CA bundle.
//   - NEVER use { ssl: { rejectUnauthorized: false } } outside a throwaway local
//     sandbox — it disables certificate verification silently.
// ---------------------------------------------------------------------------
const sslConfig = env.DB_CA_CERT_PATH
  ? { ssl: { ca: fs.readFileSync(env.DB_CA_CERT_PATH, "utf8") } }
  : undefined;

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ...sslConfig,
});

const adapter = new PrismaPg(pool);

// ---------------------------------------------------------------------------
// P3 — Global field omit as a backstop
// passwordHash is omitted on every User query so it never leaks via a missed
// select. Controllers should still avoid returning the full User object and
// should explicitly select only the fields they need.
// ---------------------------------------------------------------------------
const prisma = new PrismaClient({
  adapter,
  omit: {
    user: {
      passwordHash: true,
    },
  },
});

export const disconnectDb = async () => {
  try {
    await prisma.$disconnect();
    await pool.end();
    console.log("[Database] Disconnected connection pool cleanly.");
  } catch (error) {
    console.error("[Database] Error disconnecting pool:", error);
  }
};

export default prisma;
