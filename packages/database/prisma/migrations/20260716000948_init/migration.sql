-- CreateEnum
CREATE TYPE "TenantMembershipRole" AS ENUM ('OPERATOR', 'SUPPORT', 'ADMIN');

-- CreateEnum
CREATE TYPE "PackagingStatus" AS ENUM ('MINTED', 'IN_CIRCULATION', 'COLLECTED', 'RECYCLED');

-- CreateEnum
CREATE TYPE "PackagingBatchStatus" AS ENUM ('DRAFT', 'VALIDATED', 'IMPORTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('UPLOADED', 'VALIDATING', 'READY', 'COMMITTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PackagingEventType" AS ENUM ('MINTED', 'IN_CIRCULATION', 'COLLECTED', 'RECYCLED');

-- CreateEnum
CREATE TYPE "RewardTransactionType" AS ENUM ('EARN', 'CASHOUT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SETTLED', 'FAILED');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'SYSTEM', 'DEVICE');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "countryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "externalSubject" TEXT NOT NULL,
    "email" TEXT,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMembership" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "TenantMembershipRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "contractVersion" VARCHAR(64) NOT NULL,
    "sourceEventId" VARCHAR(128) NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileHash" CHAR(64) NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'UPLOADED',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "acceptedRows" INTEGER NOT NULL DEFAULT 0,
    "rejectedRows" INTEGER NOT NULL DEFAULT 0,
    "errorReportKey" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagingBatch" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "importJobId" UUID,
    "code" VARCHAR(64) NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL,
    "status" "PackagingBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackagingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Packaging" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "serial" VARCHAR(128) NOT NULL,
    "status" "PackagingStatus" NOT NULL DEFAULT 'MINTED',
    "materialCode" VARCHAR(64) NOT NULL,
    "expectedWeightGrams" DECIMAL(10,2) NOT NULL,
    "unitCostCents" INTEGER NOT NULL,
    "rewardCents" INTEGER NOT NULL,
    "externalQrHash" CHAR(64) NOT NULL,
    "internalQrHash" CHAR(64) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "mintedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedAt" TIMESTAMP(3),
    "recycledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Packaging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagingEvent" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "packagingId" UUID NOT NULL,
    "type" "PackagingEventType" NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorId" VARCHAR(128) NOT NULL,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "actualWeightGrams" DECIMAL(10,2),
    "payload" JSONB,
    "chainTransactionHash" VARCHAR(66),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackagingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardAccount" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "balanceCents" BIGINT NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardTransaction" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "packagingId" UUID,
    "reversalOfId" UUID,
    "type" "RewardTransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" BIGINT NOT NULL,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "externalReference" TEXT,
    "providerReference" TEXT,
    "chainTransactionHash" VARCHAR(66),
    "settledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureCode" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "aggregateType" VARCHAR(64) NOT NULL,
    "aggregateId" UUID NOT NULL,
    "aggregateVersion" INTEGER NOT NULL,
    "eventType" VARCHAR(128) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorId" VARCHAR(128) NOT NULL,
    "action" VARCHAR(128) NOT NULL,
    "resourceType" VARCHAR(64) NOT NULL,
    "resourceId" VARCHAR(128) NOT NULL,
    "requestId" VARCHAR(128) NOT NULL,
    "correlationId" VARCHAR(128) NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_createdAt_idx" ON "Tenant"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_externalSubject_key" ON "User"("externalSubject");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "TenantMembership_userId_role_idx" ON "TenantMembership"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportJob_objectKey_key" ON "ImportJob"("objectKey");

-- CreateIndex
CREATE INDEX "ImportJob_tenantId_status_createdAt_idx" ON "ImportJob"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ImportJob_expiresAt_status_idx" ON "ImportJob"("expiresAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ImportJob_tenantId_sourceEventId_key" ON "ImportJob"("tenantId", "sourceEventId");

-- CreateIndex
CREATE UNIQUE INDEX "PackagingBatch_importJobId_key" ON "PackagingBatch"("importJobId");

-- CreateIndex
CREATE INDEX "PackagingBatch_tenantId_status_createdAt_idx" ON "PackagingBatch"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PackagingBatch_tenantId_code_key" ON "PackagingBatch"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Packaging_externalQrHash_key" ON "Packaging"("externalQrHash");

-- CreateIndex
CREATE UNIQUE INDEX "Packaging_internalQrHash_key" ON "Packaging"("internalQrHash");

-- CreateIndex
CREATE INDEX "Packaging_tenantId_batchId_status_idx" ON "Packaging"("tenantId", "batchId", "status");

-- CreateIndex
CREATE INDEX "Packaging_tenantId_status_updatedAt_idx" ON "Packaging"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Packaging_tenantId_serial_key" ON "Packaging"("tenantId", "serial");

-- CreateIndex
CREATE UNIQUE INDEX "PackagingEvent_chainTransactionHash_key" ON "PackagingEvent"("chainTransactionHash");

-- CreateIndex
CREATE INDEX "PackagingEvent_packagingId_occurredAt_idx" ON "PackagingEvent"("packagingId", "occurredAt");

-- CreateIndex
CREATE INDEX "PackagingEvent_tenantId_type_occurredAt_idx" ON "PackagingEvent"("tenantId", "type", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "PackagingEvent_tenantId_idempotencyKey_key" ON "PackagingEvent"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "RewardAccount_tenantId_updatedAt_idx" ON "RewardAccount"("tenantId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardAccount_tenantId_userId_key" ON "RewardAccount"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardTransaction_packagingId_key" ON "RewardTransaction"("packagingId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardTransaction_reversalOfId_key" ON "RewardTransaction"("reversalOfId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardTransaction_externalReference_key" ON "RewardTransaction"("externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "RewardTransaction_providerReference_key" ON "RewardTransaction"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "RewardTransaction_chainTransactionHash_key" ON "RewardTransaction"("chainTransactionHash");

-- CreateIndex
CREATE INDEX "RewardTransaction_accountId_status_createdAt_idx" ON "RewardTransaction"("accountId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RewardTransaction_tenantId_type_status_createdAt_idx" ON "RewardTransaction"("tenantId", "type", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardTransaction_tenantId_idempotencyKey_key" ON "RewardTransaction"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_status_idx" ON "IdempotencyRecord"("expiresAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_tenantId_key_key" ON "IdempotencyRecord"("tenantId", "key");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_tenantId_eventType_createdAt_idx" ON "OutboxEvent"("tenantId", "eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_aggregateType_aggregateId_aggregateVersion_even_key" ON "OutboxEvent"("aggregateType", "aggregateId", "aggregateVersion", "eventType");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_resourceType_resourceId_occurredAt_idx" ON "AuditLog"("tenantId", "resourceType", "resourceId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingBatch" ADD CONSTRAINT "PackagingBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingBatch" ADD CONSTRAINT "PackagingBatch_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Packaging" ADD CONSTRAINT "Packaging_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Packaging" ADD CONSTRAINT "Packaging_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PackagingBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingEvent" ADD CONSTRAINT "PackagingEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingEvent" ADD CONSTRAINT "PackagingEvent_packagingId_fkey" FOREIGN KEY ("packagingId") REFERENCES "Packaging"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardAccount" ADD CONSTRAINT "RewardAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardAccount" ADD CONSTRAINT "RewardAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "RewardAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_packagingId_fkey" FOREIGN KEY ("packagingId") REFERENCES "Packaging"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "RewardTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
