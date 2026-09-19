-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN "evidenceThreadId" TEXT;

-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN "disputeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_evidenceThreadId_key" ON "Dispute"("evidenceThreadId");

-- CreateIndex
CREATE INDEX "Evidence_disputeId_idx" ON "Evidence"("disputeId");

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
