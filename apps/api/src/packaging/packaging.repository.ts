import {
  DomainError,
  type PackagingAggregate,
  type PackagingSnapshot,
} from "@digitalwallet/domain";
import { Injectable } from "@nestjs/common";

export abstract class PackagingRepository {
  public abstract create(
    packaging: PackagingAggregate,
  ): Promise<PackagingSnapshot>;

  public abstract findById(
    tenantId: string,
    packagingId: string,
  ): Promise<PackagingSnapshot | undefined>;

  public abstract save(
    packaging: PackagingAggregate,
    expectedVersion: number,
  ): Promise<PackagingSnapshot>;
}

@Injectable()
export class InMemoryPackagingRepository extends PackagingRepository {
  private readonly byId = new Map<string, PackagingSnapshot>();
  private readonly idByTenantAndSerial = new Map<string, string>();

  public create(packaging: PackagingAggregate): Promise<PackagingSnapshot> {
    const snapshot = packaging.snapshot();
    const serialKey = this.serialKey(snapshot.tenantId, snapshot.serial);

    if (this.idByTenantAndSerial.has(serialKey)) {
      throw new DomainError(
        "PACKAGING_SERIAL_ALREADY_EXISTS",
        "A packaging with this serial already exists for the tenant",
        { serial: snapshot.serial },
      );
    }

    this.byId.set(snapshot.id, snapshot);
    this.idByTenantAndSerial.set(serialKey, snapshot.id);
    return Promise.resolve(this.copy(snapshot));
  }

  public findById(
    tenantId: string,
    packagingId: string,
  ): Promise<PackagingSnapshot | undefined> {
    const snapshot = this.byId.get(packagingId);

    if (snapshot === undefined || snapshot.tenantId !== tenantId) {
      return Promise.resolve(undefined);
    }

    return Promise.resolve(this.copy(snapshot));
  }

  public save(
    packaging: PackagingAggregate,
    expectedVersion: number,
  ): Promise<PackagingSnapshot> {
    const next = packaging.snapshot();
    const current = this.byId.get(next.id);

    if (current === undefined || current.tenantId !== next.tenantId) {
      throw new DomainError(
        "PACKAGING_NOT_FOUND",
        "Packaging was not found for the current tenant",
      );
    }

    if (current.version !== expectedVersion) {
      throw new DomainError(
        "OPTIMISTIC_LOCK_CONFLICT",
        "Packaging changed while the command was being processed",
        {
          actualVersion: current.version,
          expectedVersion,
        },
      );
    }

    this.byId.set(next.id, next);
    return Promise.resolve(this.copy(next));
  }

  private serialKey(tenantId: string, serial: string): string {
    return `${tenantId}:${serial}`;
  }

  private copy(snapshot: PackagingSnapshot): PackagingSnapshot {
    return {
      ...snapshot,
      createdAt: new Date(snapshot.createdAt),
      updatedAt: new Date(snapshot.updatedAt),
    };
  }
}
