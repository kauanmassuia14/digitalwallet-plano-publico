import {
  DomainError,
  PackagingAggregate,
  type PackagingSnapshot,
} from "@digitalwallet/domain";
import { Injectable, Inject } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { DatabaseService } from "../common/database/database.service.js";
import type { CreatePackagingDto } from "./dto/create-packaging.dto.js";
import type { TransitionPackagingDto } from "./dto/transition-packaging.dto.js";
import { PackagingRepository } from "./packaging.repository.js";

export interface PublicPackagingLookupResult {
  id: string;
  status: string;
  materialCode: string;
  rewardCents: number;
  tenantName: string;
  allowedCountries: string[];
}

@Injectable()
export class PackagingService {
  public constructor(
    @Inject(PackagingRepository)
    private readonly repository: PackagingRepository,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  public async findPublicByExternalQrHash(
    externalQrHash: string,
  ): Promise<PublicPackagingLookupResult> {
    const packaging =
      await this.repository.findByExternalQrHash(externalQrHash);

    if (packaging === undefined) {
      throw new DomainError("PACKAGING_NOT_FOUND", "Packaging was not found");
    }

    const tenant = await this.database.client.tenant.findUnique({
      where: { id: packaging.tenantId },
      select: { name: true, countryCodes: true },
    });

    return {
      id: packaging.id,
      status: packaging.status,
      materialCode: packaging.materialCode,
      rewardCents: packaging.rewardCents,
      tenantName: tenant?.name || "Unknown Factory",
      allowedCountries: tenant?.countryCodes || [],
    };
  }

  public async create(
    tenantId: string,
    input: CreatePackagingDto,
  ): Promise<PackagingSnapshot> {
    const packaging = PackagingAggregate.create({
      batchId: input.batchId,
      expectedWeightGrams: input.expectedWeightGrams,
      externalQrHash: input.externalQrHash,
      id: randomUUID(),
      internalQrHash: input.internalQrHash,
      materialCode: input.materialCode,
      mintedAt: new Date(),
      rewardCents: input.rewardCents,
      serial: input.serial,
      tenantId,
      unitCostCents: input.unitCostCents,
    });

    return this.repository.create(packaging);
  }

  public async findById(
    tenantId: string,
    packagingId: string,
  ): Promise<PackagingSnapshot> {
    const packaging = await this.repository.findById(tenantId, packagingId);

    if (packaging === undefined) {
      throw new DomainError(
        "PACKAGING_NOT_FOUND",
        "Packaging was not found for the current tenant",
      );
    }

    return packaging;
  }

  public async transition(
    tenantId: string,
    packagingId: string,
    input: TransitionPackagingDto,
  ): Promise<PackagingSnapshot> {
    const current = await this.findById(tenantId, packagingId);
    const aggregate = PackagingAggregate.rehydrate(current);
    const occurredAt = new Date(input.occurredAt);
    let updated: PackagingAggregate;

    switch (input.targetStatus) {
      case "IN_CIRCULATION":
        updated = aggregate.circulate(occurredAt);
        break;
      case "COLLECTED":
        if (input.actualWeightGrams === undefined) {
          throw new DomainError(
            "INVALID_ARGUMENT",
            "actualWeightGrams is required when collecting a packaging",
            { field: "actualWeightGrams" },
          );
        }
        updated = aggregate.collect({
          actualWeightGrams: input.actualWeightGrams,
          occurredAt,
        });
        break;
      case "RECYCLED":
        updated = aggregate.recycle(occurredAt);
        break;
    }

    return this.repository.save(updated, current.version);
  }

  public async list(
    tenantId: string,
    filters: { batchId?: string; status?: string },
  ): Promise<PackagingSnapshot[]> {
    return this.repository.findMany(tenantId, filters);
  }

  public async findEvents(
    tenantId: string,
    packagingId: string,
  ): Promise<any[]> {
    // Verify that the packaging belongs to this tenant first
    await this.findById(tenantId, packagingId);

    const events = await this.database.client.packagingEvent.findMany({
      where: { tenantId, packagingId },
      orderBy: { occurredAt: "asc" },
    });

    return events.map((e) => ({
      id: e.id,
      packagingId: e.packagingId,
      tenantId: e.tenantId,
      type: e.type,
      occurredAt: e.occurredAt,
      actualWeightGrams: e.actualWeightGrams
        ? e.actualWeightGrams.toNumber()
        : undefined,
    }));
  }
}
