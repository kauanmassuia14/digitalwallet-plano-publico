-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ASSIGNED', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "Packaging" DROP CONSTRAINT "Packaging_batchId_fkey";

-- AlterTable
ALTER TABLE "Packaging" ADD COLUMN     "condominiumId" UUID,
ADD COLUMN     "cooperativeId" UUID;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "monthlyFeeCents" INTEGER NOT NULL DEFAULT 25000,
ADD COLUMN     "subscriptionActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Condominium" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Condominium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cooperative" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pixKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cooperative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionRequest" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "condominiumId" UUID NOT NULL,
    "cooperativeId" UUID,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLedger" (
    "id" UUID NOT NULL,
    "prevHash" VARCHAR(64) NOT NULL,
    "rowHash" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Condominium_slug_key" ON "Condominium"("slug");

-- CreateIndex
CREATE INDEX "Condominium_tenantId_createdAt_idx" ON "Condominium"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Cooperative_slug_key" ON "Cooperative"("slug");

-- CreateIndex
CREATE INDEX "Cooperative_tenantId_createdAt_idx" ON "Cooperative"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionRequest_tenantId_status_createdAt_idx" ON "CollectionRequest"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLedger_rowHash_key" ON "AuditLedger"("rowHash");

-- CreateIndex
CREATE INDEX "AuditLedger_createdAt_idx" ON "AuditLedger"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PackagingBatch_tenantId_id_key" ON "PackagingBatch"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "Packaging" ADD CONSTRAINT "Packaging_tenantId_batchId_fkey" FOREIGN KEY ("tenantId", "batchId") REFERENCES "PackagingBatch"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Packaging" ADD CONSTRAINT "Packaging_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Packaging" ADD CONSTRAINT "Packaging_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "Cooperative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condominium" ADD CONSTRAINT "Condominium_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cooperative" ADD CONSTRAINT "Cooperative_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRequest" ADD CONSTRAINT "CollectionRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRequest" ADD CONSTRAINT "CollectionRequest_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRequest" ADD CONSTRAINT "CollectionRequest_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "Cooperative"("id") ON DELETE SET NULL ON UPDATE CASCADE;
