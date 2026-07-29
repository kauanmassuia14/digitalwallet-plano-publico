import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from "@nestjs/common";
import * as crypto from "node:crypto";
import { DatabaseService } from "../common/database/database.service.js";
import { CollectionQueue } from "./collection-queue.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { AuditLogService } from "../ledger/audit-log.service.js";
import { PackagingService } from "../packaging/packaging.service.js";
import { RewardsService } from "../rewards/rewards.service.js";
import type { SyncOfflineDto } from "./dto/sync-offline.dto.js";

export interface CollectionRequestResponse {
  id: string;
  tenantId: string;
  condominiumId: string;
  cooperativeId: string | null;
  status: "PENDING" | "ASSIGNED" | "COMPLETED" | "CANCELLED";
  scheduledFor: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  condominium?: { id: string; name: string; address: string };
  cooperative?: { id: string; name: string } | null;
}

export interface CollectionRequestListQuery {
  /** Filter by condominium — used by condominium portal to see its own requests */
  condominiumId?: string;
  /** Filter by cooperative — used by cooperative portal to see assigned requests */
  cooperativeId?: string;
  /** Filter by status: PENDING | ASSIGNED | COMPLETED | CANCELLED */
  status?: string;
}

@Injectable()
export class CollectionService {
  public constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(CollectionQueue) private readonly queue: CollectionQueue,
    @Inject(LedgerService) private readonly ledgerService: LedgerService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(PackagingService)
    private readonly packagingService: PackagingService,
    @Inject(RewardsService) private readonly rewardsService: RewardsService,
  ) {}

  public async listRequests(
    tenantId: string,
    query: CollectionRequestListQuery,
  ): Promise<CollectionRequestResponse[]> {
    return this.database.client.collectionRequest.findMany({
      where: {
        tenantId,
        ...(query.condominiumId ? { condominiumId: query.condominiumId } : {}),
        ...(query.cooperativeId ? { cooperativeId: query.cooperativeId } : {}),
        ...(query.status ? { status: query.status as any } : {}),
      },
      include: {
        condominium: { select: { id: true, name: true, address: true } },
        cooperative: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  public async getRequest(
    tenantId: string,
    requestId: string,
  ): Promise<CollectionRequestResponse> {
    const request = await this.database.client.collectionRequest.findFirst({
      where: { id: requestId, tenantId },
      include: {
        condominium: { select: { id: true, name: true, address: true } },
        cooperative: { select: { id: true, name: true } },
      },
    });
    if (!request) {
      throw new NotFoundException("Collection request not found");
    }
    return request;
  }

  public async createRequest(
    tenantId: string,
    condominiumId: string,
    scheduledFor?: Date,
  ): Promise<CollectionRequestResponse> {
    const condominium = await this.database.client.condominium.findFirst({
      where: { id: condominiumId, tenantId },
    });

    if (condominium === null) {
      throw new NotFoundException("Condominium not found for this tenant");
    }

    const request = await this.database.client.collectionRequest.create({
      data: {
        condominiumId,
        scheduledFor: scheduledFor ?? null,
        status: "PENDING",
        tenantId,
      },
      include: {
        condominium: { select: { id: true, name: true, address: true } },
        cooperative: { select: { id: true, name: true } },
      },
    });

    await this.queue.push(tenantId, request.id);

    return request;
  }

  public async matchCollection(
    tenantId: string,
    cooperativeId: string,
  ): Promise<CollectionRequestResponse | null> {
    const cooperative = await this.database.client.cooperative.findFirst({
      where: { id: cooperativeId, tenantId },
    });

    if (cooperative === null) {
      throw new NotFoundException("Cooperative not found for this tenant");
    }

    // Loop until we find a valid pending request or the queue is empty
    for (;;) {
      const requestId = await this.queue.pop(tenantId);
      if (requestId === null) {
        return null;
      }

      const request = await this.database.client.collectionRequest.findFirst({
        where: { id: requestId, tenantId },
      });

      if (request !== null && request.status === "PENDING") {
        const updated = await this.database.client.collectionRequest.update({
          data: {
            cooperativeId,
            status: "ASSIGNED",
          },
          where: { id: requestId },
        });
        return updated;
      }
    }
  }

  public async completeRequest(
    tenantId: string,
    requestId: string,
  ): Promise<CollectionRequestResponse> {
    const request = await this.database.client.collectionRequest.findFirst({
      where: { id: requestId, tenantId },
    });

    if (request === null) {
      throw new NotFoundException("Collection request not found");
    }

    if (request.status !== "ASSIGNED") {
      throw new BadRequestException(
        `Only assigned requests can be completed. Current status: ${request.status}`,
      );
    }

    const updated = await this.database.client.collectionRequest.update({
      data: {
        completedAt: new Date(),
        status: "COMPLETED",
      },
      where: { id: requestId },
    });

    // 1. Write cryptographic record to global AuditLedger
    await this.ledgerService.appendEntry({
      eventType: "COLLECTION_COMPLETED",
      requestId: updated.id,
      tenantId: updated.tenantId,
      condominiumId: updated.condominiumId,
      cooperativeId: updated.cooperativeId,
      completedAt: updated.completedAt,
    });

    // 2. Write AES-encrypted audit log
    await this.auditLogService.createLog({
      tenantId: updated.tenantId,
      actorType: "SYSTEM",
      actorId: "system",
      action: "COMPLETE_COLLECTION",
      resourceType: "CollectionRequest",
      resourceId: updated.id,
      requestId: `req-${updated.id}`,
      correlationId: `corr-${updated.id}`,
      before: request,
      after: updated,
    });

    return updated;
  }

  public async cancelRequest(
    tenantId: string,
    requestId: string,
  ): Promise<CollectionRequestResponse> {
    const request = await this.database.client.collectionRequest.findFirst({
      where: { id: requestId, tenantId },
    });

    if (request === null) {
      throw new NotFoundException("Collection request not found");
    }

    if (request.status === "COMPLETED" || request.status === "CANCELLED") {
      throw new BadRequestException(
        `Cannot cancel a request that is already ${request.status.toLowerCase()}`,
      );
    }

    if (request.status === "PENDING") {
      await this.queue.remove(tenantId, requestId);
    }

    const updated = await this.database.client.collectionRequest.update({
      data: {
        status: "CANCELLED",
      },
      where: { id: requestId },
    });

    return updated;
  }

  public async syncOfflineCollections(
    tenantId: string,
    dto: SyncOfflineDto,
  ): Promise<{ successCount: number; failedScans: any[] }> {
    const operator = await this.database.client.user.findFirst({
      where: { id: dto.operatorUserId, memberships: { some: { tenantId } } },
    });
    if (!operator) {
      throw new NotFoundException(
        "Operator user not found or not part of this tenant",
      );
    }
    if (!operator.publicKey) {
      throw new BadRequestException(
        "Operator does not have a registered public key for signing",
      );
    }

    const message = JSON.stringify(dto.scans);
    const verifier = crypto.createVerify("SHA256");
    verifier.update(message);
    const isVerified = verifier.verify(
      operator.publicKey,
      dto.signature,
      "base64",
    );
    if (!isVerified) {
      throw new BadRequestException("Invalid digital signature");
    }

    let successCount = 0;
    const failedScans: any[] = [];

    for (const scan of dto.scans) {
      try {
        const packaging = await this.database.client.packaging.findFirst({
          where: { id: scan.packagingId, tenantId },
        });

        if (!packaging) {
          failedScans.push({
            packagingId: scan.packagingId,
            reason: "PACKAGING_NOT_FOUND",
          });
          continue;
        }

        if (
          packaging.status === "COLLECTED" ||
          packaging.status === "RECYCLED"
        ) {
          // Idempotency: already processed successfully
          successCount++;
          continue;
        }

        // Process transactionally
        await this.database.client.$transaction(async (tx) => {
          // 1. Transition status: MINTED -> IN_CIRCULATION if needed
          if (packaging.status === "MINTED") {
            await this.packagingService.transition(tenantId, packaging.id, {
              targetStatus: "IN_CIRCULATION",
              occurredAt: new Date(scan.collectedAt).toISOString(),
            });
          }

          // 2. Transition status: IN_CIRCULATION -> COLLECTED
          await this.packagingService.transition(tenantId, packaging.id, {
            targetStatus: "COLLECTED",
            occurredAt: new Date(scan.collectedAt).toISOString(),
            actualWeightGrams: scan.actualWeightGrams,
          });

          // 3. Award rewards to consumerUserId
          const idempotencyKey = `sync-reward-${packaging.id}`;
          await this.rewardsService.earn(
            tenantId,
            scan.consumerUserId,
            packaging.id,
            packaging.rewardCents,
            idempotencyKey,
          );

          // 4. Update the package record to associate it with the cooperative
          await tx.packaging.update({
            where: { id: packaging.id },
            data: {
              cooperativeId: dto.cooperativeId,
            },
          });
        });

        successCount++;
      } catch (error: any) {
        failedScans.push({
          packagingId: scan.packagingId,
          reason: error.message || "UNKNOWN_ERROR",
        });
      }
    }

    return { successCount, failedScans };
  }
}
