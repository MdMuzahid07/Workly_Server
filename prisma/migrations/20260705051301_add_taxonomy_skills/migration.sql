-- CreateTable
CREATE TABLE "taxonomy_skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "industryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxonomy_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "taxonomy_skills_industryId_idx" ON "taxonomy_skills"("industryId");

-- CreateIndex
CREATE UNIQUE INDEX "taxonomy_skills_name_industryId_key" ON "taxonomy_skills"("name", "industryId");

-- AddForeignKey
ALTER TABLE "taxonomy_skills" ADD CONSTRAINT "taxonomy_skills_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
