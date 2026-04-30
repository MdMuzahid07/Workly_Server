import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const job = await prisma.job.findUnique({
    where: { id: "12bd9a67-e120-437d-87ab-6634e1394033" },
  });
  console.log(job);
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
