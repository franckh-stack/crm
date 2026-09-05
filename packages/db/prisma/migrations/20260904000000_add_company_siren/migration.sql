-- AlterTable
ALTER TABLE "company" ADD COLUMN     "siren" CHAR(9);

-- CreateIndex
CREATE UNIQUE INDEX "company_siren_key" ON "company"("siren") WHERE ("archivedAt" IS NULL);
