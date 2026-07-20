import {
  DomainError,
  type ImportJobAggregate,
  type ImportJobSnapshot,
  type PackagingAggregate,
  type PackagingBatchAggregate,
  type PackagingBatchSnapshot,
  type PackagingSnapshot,
} from "@digitalwallet/domain";
import { Injectable } from "@nestjs/common";

export abstract class BatchImportRepository {
  public abstract createImportJob(
    job: ImportJobAggregate,
  ): Promise<ImportJobSnapshot>;

  public abstract findImportJobById(
    tenantId: string,
    jobId: string,
  ): Promise<ImportJobSnapshot | undefined>;

  public abstract saveImportJob(
    job: ImportJobAggregate,
  ): Promise<ImportJobSnapshot>;

  public abstract createBatch(
    batch: PackagingBatchAggregate,
  ): Promise<PackagingBatchSnapshot>;

  public abstract findBatchById(
    tenantId: string,
    batchId: string,
  ): Promise<PackagingBatchSnapshot | undefined>;

  public abstract findBatchByCode(
    tenantId: string,
    code: string,
  ): Promise<PackagingBatchSnapshot | undefined>;

  public abstract saveBatch(
    batch: PackagingBatchAggregate,
  ): Promise<PackagingBatchSnapshot>;

  public abstract importPackagings(
    job: ImportJobAggregate,
    batch: PackagingBatchAggregate,
    packagings: PackagingAggregate[],
  ): Promise<void>;
}

@Injectable()
export class InMemoryBatchImportRepository extends BatchImportRepository {
  private readonly jobs = new Map<string, ImportJobSnapshot>();
  private readonly batches = new Map<string, PackagingBatchSnapshot>();
  private readonly packagings = new Map<string, PackagingSnapshot>();
  private readonly batchByTenantAndCode = new Map<string, string>();

  public createImportJob(job: ImportJobAggregate): Promise<ImportJobSnapshot> {
    const snapshot = job.snapshot();
    this.jobs.set(snapshot.id, snapshot);
    return Promise.resolve(this.copyJob(snapshot));
  }

  public findImportJobById(
    tenantId: string,
    jobId: string,
  ): Promise<ImportJobSnapshot | undefined> {
    const snapshot = this.jobs.get(jobId);
    if (snapshot === undefined || snapshot.tenantId !== tenantId) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(this.copyJob(snapshot));
  }

  public saveImportJob(job: ImportJobAggregate): Promise<ImportJobSnapshot> {
    const next = job.snapshot();
    const current = this.jobs.get(next.id);

    if (current === undefined || current.tenantId !== next.tenantId) {
      throw new DomainError(
        "INVALID_ARGUMENT",
        "ImportJob was not found for the current tenant",
      );
    }

    this.jobs.set(next.id, next);
    return Promise.resolve(this.copyJob(next));
  }

  public createBatch(batch: PackagingBatchAggregate): Promise<PackagingBatchSnapshot> {
    const snapshot = batch.snapshot();
    const codeKey = this.codeKey(snapshot.tenantId, snapshot.code);

    if (this.batchByTenantAndCode.has(codeKey)) {
      throw new DomainError(
        "INVALID_ARGUMENT",
        `A batch with code ${snapshot.code} already exists for the tenant`,
      );
    }

    this.batches.set(snapshot.id, snapshot);
    this.batchByTenantAndCode.set(codeKey, snapshot.id);
    return Promise.resolve(this.copyBatch(snapshot));
  }

  public findBatchById(
    tenantId: string,
    batchId: string,
  ): Promise<PackagingBatchSnapshot | undefined> {
    const snapshot = this.batches.get(batchId);
    if (snapshot === undefined || snapshot.tenantId !== tenantId) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(this.copyBatch(snapshot));
  }

  public findBatchByCode(
    tenantId: string,
    code: string,
  ): Promise<PackagingBatchSnapshot | undefined> {
    const codeKey = this.codeKey(tenantId, code);
    const id = this.batchByTenantAndCode.get(codeKey);
    if (id === undefined) {
      return Promise.resolve(undefined);
    }
    const snapshot = this.batches.get(id);
    if (snapshot === undefined) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(this.copyBatch(snapshot));
  }

  public saveBatch(batch: PackagingBatchAggregate): Promise<PackagingBatchSnapshot> {
    const next = batch.snapshot();
    const current = this.batches.get(next.id);

    if (current === undefined || current.tenantId !== next.tenantId) {
      throw new DomainError(
        "INVALID_ARGUMENT",
        "PackagingBatch was not found for the current tenant",
      );
    }

    this.batches.set(next.id, next);
    return Promise.resolve(this.copyBatch(next));
  }

  public async importPackagings(
    job: ImportJobAggregate,
    batch: PackagingBatchAggregate,
    packagings: PackagingAggregate[],
  ): Promise<void> {
    // In-memory atomic import simulation
    await this.saveImportJob(job);
    await this.saveBatch(batch);
    for (const pkg of packagings) {
      const snap = pkg.snapshot();
      const serialKey = `${snap.tenantId}:${snap.serial}`;
      for (const existing of this.packagings.values()) {
        if (existing.tenantId === snap.tenantId && existing.serial === snap.serial) {
          throw new DomainError(
            "PACKAGING_SERIAL_ALREADY_EXISTS",
            `A packaging with serial ${snap.serial} already exists`,
          );
        }
      }
      this.packagings.set(snap.id, snap);
    }
  }

  private codeKey(tenantId: string, code: string): string {
    return `${tenantId}:${code}`;
  }

  private copyJob(snapshot: ImportJobSnapshot): ImportJobSnapshot {
    return {
      ...snapshot,
      createdAt: new Date(snapshot.createdAt),
      expiresAt: new Date(snapshot.expiresAt),
      updatedAt: new Date(snapshot.updatedAt),
    };
  }

  private copyBatch(snapshot: PackagingBatchSnapshot): PackagingBatchSnapshot {
    return {
      ...snapshot,
      createdAt: new Date(snapshot.createdAt),
      updatedAt: new Date(snapshot.updatedAt),
    };
  }
}
