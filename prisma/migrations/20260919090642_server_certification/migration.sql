-- CreateEnum
CREATE TYPE "CertStatus" AS ENUM ('PENDING', 'INFO_CHECK', 'TESTING', 'REVIEW', 'ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CertTestType" AS ENUM ('BOT_INSTALLED', 'ORDER_PROCESSING', 'PAYMENT_PROCESSING', 'PRODUCT_DELIVERY', 'TRADE_COMPLIANCE', 'INQUIRY_RESPONSE', 'REFUND_POLICY', 'POST_SALE_SUPPORT', 'TERMS_POLICY');

-- CreateEnum
CREATE TYPE "CertTestResult" AS ENUM ('NA', 'PASS', 'FAIL');

-- CreateTable
CREATE TABLE "ServerCertification" (
    "id" TEXT NOT NULL,
    "certNumber" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "guildName" TEXT,
    "applicantId" TEXT NOT NULL,
    "status" "CertStatus" NOT NULL DEFAULT 'PENDING',
    "certPeriodDays" INTEGER NOT NULL DEFAULT 30,
    "autoCheckResult" JSONB,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertTestItem" (
    "id" TEXT NOT NULL,
    "certId" TEXT NOT NULL,
    "testType" "CertTestType" NOT NULL,
    "result" "CertTestResult" NOT NULL DEFAULT 'NA',
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "testedById" TEXT,
    "testedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertTestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertEvent" (
    "id" TEXT NOT NULL,
    "certId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "actorId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServerCertification_certNumber_key" ON "ServerCertification"("certNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ServerCertification_guildId_key" ON "ServerCertification"("guildId");

-- CreateIndex
CREATE INDEX "ServerCertification_status_idx" ON "ServerCertification"("status");

-- CreateIndex
CREATE INDEX "ServerCertification_expiresAt_idx" ON "ServerCertification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CertTestItem_certId_testType_key" ON "CertTestItem"("certId", "testType");

-- CreateIndex
CREATE INDEX "CertEvent_certId_idx" ON "CertEvent"("certId");

-- AddForeignKey
ALTER TABLE "CertTestItem" ADD CONSTRAINT "CertTestItem_certId_fkey" FOREIGN KEY ("certId") REFERENCES "ServerCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertEvent" ADD CONSTRAINT "CertEvent_certId_fkey" FOREIGN KEY ("certId") REFERENCES "ServerCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
