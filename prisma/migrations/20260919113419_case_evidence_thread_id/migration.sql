-- AlterTable
ALTER TABLE "Case" ADD COLUMN "evidenceThreadId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Case_evidenceThreadId_key" ON "Case"("evidenceThreadId");
