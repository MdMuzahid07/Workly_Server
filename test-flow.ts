import { PrismaClient } from "./src/generated/prisma/index.js";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { role: "JOB_SEEKER" } });
  if (!user) return console.log("No job seeker found");

  const job = await prisma.job.findFirst({ where: { deletedAt: null } });
  if (!job) return console.log("No job found");

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET || "4239c55b47e74a4b588639ca5ab62768f5ba44ae62a52",
    { expiresIn: "1d" },
  );

  console.log("Calling save job API with user:", user.email, "and job:", job.title);

  const saveRes = await fetch("http://localhost:5000/api/v1/profile/save-job", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ jobId: job.id }),
  });

  const saveData = await saveRes.json();
  console.log("Save job response:", JSON.stringify(saveData, null, 2));

  const listRes = await fetch("http://localhost:5000/api/v1/profile/saved-jobs", {
    headers: { Authorization: token },
  });

  const listData = await listRes.json();
  console.log("Saved jobs list length:", listData.data ? listData.data.length : 0);
  if (listData.data && listData.data.length > 0) {
    console.log(
      "First saved job ID:",
      listData.data[0].job.id,
      "Matches:",
      listData.data[0].job.id === job.id,
    );
  }
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
