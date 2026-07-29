-- CreateEnum
CREATE TYPE "ChatSenderType" AS ENUM ('CONDOMINIUM', 'COOPERATIVE', 'AI_AGENT');

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "collectionRequestId" UUID NOT NULL,
    "senderType" "ChatSenderType" NOT NULL,
    "senderName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_collectionRequestId_createdAt_idx" ON "ChatMessage"("collectionRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_tenantId_createdAt_idx" ON "ChatMessage"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_collectionRequestId_fkey" FOREIGN KEY ("collectionRequestId") REFERENCES "CollectionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
