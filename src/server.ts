import http, { type Server } from "http";
import app from "./app.js";
import config from "./config/index.js";
import { initSocket } from "./socket/index.js";
import prisma from "./utils/prismaClient.js";
import bcrypt from "bcrypt";

const port = config.port || 5000;

async function seedDevUsers() {
  try {
    const devUsers = [
      {
        email: "mydevcafe@gmail.com",
        password: "Admin#$12345@",
        fullName: "Admin Dev",
        role: "ADMIN" as const,
      },
      {
        email: "mdmuzahid7396@gmail.com",
        password: "HDiotuIDG85678%7%$#KjgDJG",
        fullName: "Muzahid Employer",
        role: "EMPLOYER" as const,
      },
      {
        email: "mdmuzahid.dev@gmail.com",
        password: "FKJhOFIt985^&54#$%#",
        fullName: "Muzahid Seeker",
        role: "JOB_SEEKER" as const,
      },
    ];

    for (const u of devUsers) {
      const exists = await prisma.user.findUnique({
        where: { email: u.email },
      });

      if (!exists) {
        console.log(`[Seed] Creating dev user: ${u.email}`);
        const passwordHash = await bcrypt.hash(u.password, Number(config.bcrypt_salt_rounds || 12));
        await prisma.user.create({
          data: {
            email: u.email,
            passwordHash,
            fullName: u.fullName,
            role: u.role,
            isVerified: true,
            isActive: true,
          },
        });
      } else {
        // Ensure they are verified & active
        if (!exists.isVerified || !exists.isActive) {
          console.log(`[Seed] Ensuring dev user ${u.email} is active and verified`);
          await prisma.user.update({
            where: { id: exists.id },
            data: { isVerified: true, isActive: true },
          });
        }
      }
    }
  } catch (error) {
    console.error("[Seed] Failed to seed dev users:", error);
  }
}

/**
 * Main entry point for the server. This function starts the server and
 * sets up error handling. The server will listen on the port specified
 * in the config object, or port 5000 if no port is specified.
 *
 * If an error is encountered while starting the server, the server will
 * log the error to the console and exit with a non-zero status code.
 *
 * This function should be called once the config object has been loaded.
 */

async function main() {
  const server: Server = http.createServer(app);
  initSocket(server);

  if (config.environment === "development") {
    await seedDevUsers();
  }

  server.listen(Number(port), "0.0.0.0", () => {
    console.log(`Server running 🚀🚀 on => port  ${port}`);
  });

  server.on("error", (error: Error) => {
    console.log("Server error => ", error.message);
    process.exit(1);
  });
}

if (process.env.NODE_ENV !== "production") {
  main();
}

export default app;
