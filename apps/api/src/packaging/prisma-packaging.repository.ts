import {
  Prisma,
  type Packaging as PackagingRecord,
} from "@digitalwallet/database";
import {
  DomainError,
  type PackagingAggregate,
  type PackagingSnapshot,
} from "@digitalwallet/domain";
import { Injectable } from "@nestjs/common";

import { DatabaseService } from "../common/database/database.service.js";
import { PackagingRepository } from "./packaging.repository.js";

@Injectable()
export class PrismaPackagingRepository extends PackagingRepository {
  public constructor(private readonly database: DatabaseService) {
    super();
  }

  public async create(
    packaging: PackagingAggregate,
  ): Promise<PackagingSnapshot> {
    const snapshot = packaging.snapshot();
    const batchExists = await this.database.client.packagingBatch.count({
      where: {
        id: snapshot.batchId,
        tenantId: snapshot.tenantId,
      },
    });

    if (batchExists === 0) {
      throw new DomainError(
        "PACKAGING_SCOPE_INVALID",
        "Batch was not found for the current tenant",
        { batchId: snapshot.batchId },
      );
    }

    try {
      const created = await this.database.client.packaging.create({
        data: {
          batchId: snapshot.batchId,
          expectedWeightGrams: snapshot.expectedWeightGrams,
          externalQrHash: snapshot.externalQrHash,
          id: snapshot.id,
          internalQrHash: snapshot.internalQrHash,
          materialCode: snapshot.materialCode,
          mintedAt: snapshot.createdAt,
          rewardCents: snapshot.rewardCents,
          serial: snapshot.serial,
          status: snapshot.status,
          tenantId: snapshot.tenantId,
          unitCostCents: snapshot.unitCostCents,
          updatedAt: snapshot.updatedAt,
          version: snapshot.version,
        },
      });

      return this.toSnapshot(created);
    } catch (error: unknown) {
      this.translateCreateError(error, snapshot.serial);
    }
  }

  public async findById(
    tenantId: string,
    packagingId: string,
  ): Promise<PackagingSnapshot | undefined> {
    const packaging = await this.database.client.packaging.findFirst({
      where: {
        id: packagingId,
        tenantId,
      },
    });

    return packaging === null ? undefined : this.toSnapshot(packaging);
  }

  public async save(
    packaging: PackagingAggregate,
    expectedVersion: number,
  ): Promise<PackagingSnapshot> {
    const snapshot = packaging.snapshot();
    const lifecycleTimestamp = this.lifecycleTimestamp(snapshot);
    const result = await this.database.client.packaging.updateMany({
      data: {
        ...lifecycleTimestamp,
        status: snapshot.status,
        updatedAt: snapshot.updatedAt,
        version: snapshot.version,
      },
      where: {
        id: snapshot.id,
        tenantId: snapshot.tenantId,
        version: expectedVersion,
      },
    });

    if (result.count === 0) {
      const exists = await this.database.client.packaging.count({
        where: { id: snapshot.id, tenantId: snapshot.tenantId },
      });

      if (exists === 0) {
        throw new DomainError(
          "PACKAGING_NOT_FOUND",
          "Packaging was not found for the current tenant",
        );
      }

      throw new DomainError(
        "OPTIMISTIC_LOCK_CONFLICT",
        "Packaging changed while the command was being processed",
        { expectedVersion },
      );
    }

    const persisted = await this.findById(snapshot.tenantId, snapshot.id);

    if (persisted === undefined) {
      throw new DomainError(
        "PACKAGING_NOT_FOUND",
        "Packaging disappeared after a successful update",
      );
    }

    return persisted;
  }

  private lifecycleTimestamp(
    snapshot: PackagingSnapshot,
  ): Readonly<
    Partial<
      Pick<
        PackagingRecord,
        "circulatedAt" | "collectedAt" | "recycledAt"
      >
    >
  > {
    switch (snapshot.status) {
      case "MINTED":
        return {};
      case "IN_CIRCULATION":
        return { circulatedAt: snapshot.updatedAt };
      case "COLLECTED":
        return { collectedAt: snapshot.updatedAt };
      case "RECYCLED":
        return { recycledAt: snapshot.updatedAt };
    }
  }

  private logicalUpdatedAt(record: PackagingRecord): Date {
    return (
      record.recycledAt ??
      record.collectedAt ??
      record.circulatedAt ??
      record.mintedAt
    );
  }

  private toSnapshot(record: PackagingRecord): PackagingSnapshot {
    return {
      batchId: record.batchId,
      createdAt: new Date(record.mintedAt),
      expectedWeightGrams: record.expectedWeightGrams.toNumber(),
      externalQrHash: record.externalQrHash,
      id: record.id,
      internalQrHash: record.internalQrHash,
      materialCode: record.materialCode,
      rewardCents: record.rewardCents,
      serial: record.serial,
      status: record.status,
      tenantId: record.tenantId,
      unitCostCents: record.unitCostCents,
      updatedAt: new Date(this.logicalUpdatedAt(record)),
      version: record.version,
    };
  }

  private translateCreateError(error: unknown, serial: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.map(String)
          : [];

        if (target.includes("serial")) {
          throw new DomainError(
            "PACKAGING_SERIAL_ALREADY_EXISTS",
            "A packaging with this serial already exists for the tenant",
            { serial },
          );
        }

        throw new DomainError(
          "QR_HASH_ALREADY_EXISTS",
          "An external or internal QR hash is already registered",
          { target },
        );
      }

      if (error.code === "P2003") {
        throw new DomainError(
          "PACKAGING_SCOPE_INVALID",
          "Tenant or batch does not exist for this packaging",
        );
      }
    }

    throw error;
  }
}
