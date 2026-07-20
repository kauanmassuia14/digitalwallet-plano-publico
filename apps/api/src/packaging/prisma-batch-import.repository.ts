import {
  Prisma,
  type ImportJob as ImportJobRecord,
  type PackagingBatch as PackagingBatchRecord,
} from "@digitalwallet/database";
import {
  DomainError,
  type ImportJobAggregate,
  type ImportJobSnapshot,
  type PackagingAggregate,
  type PackagingBatchAggregate,
  type PackagingBatchSnapshot,
} from "@digitalwallet/domain";
import { Injectable } from "@nestjs/common";

import { DatabaseService } from "../common/database/database.service.js";
import { BatchImportRepository } from "./batch-import.repository.js";

@Injectable()
export class PrismaBatchImportRepository extends BatchImportRepository {
  public constructor(private readonly database: DatabaseService) {
    super();
  }

  public async createImportJob(job: ImportJobAggregate): Promise<ImportJobSnapshot> {
    const snapshot = job.snapshot();
    const created = await this.database.client.importJob.create({
      data: {
        acceptedRows: snapshot.acceptedRows,
        contractVersion: snapshot.contractVersion,
        createdAt: snapshot.createdAt,
        createdByUserId: snapshot.createdByUserId,
        errorReportKey: snapshot.errorReportKey,
        expiresAt: snapshot.expiresAt,
        fileHash: snapshot.fileHash,
        id: snapshot.id,
        objectKey: snapshot.objectKey,
        originalFileName: snapshot.originalFileName,
        rejectedRows: snapshot.rejectedRows,
        sourceEventId: snapshot.sourceEventId,
        status: snapshot.status,
        tenantId: snapshot.tenantId,
        totalRows: snapshot.totalRows,
        updatedAt: snapshot.updatedAt,
      },
    });
    return this.toJobSnapshot(created);
  }

  public async findImportJobById(
    tenantId: string,
    jobId: string,
  ): Promise<ImportJobSnapshot | undefined> {
    const record = await this.database.client.importJob.findFirst({
      where: { id: jobId, tenantId },
    });
    return record === null ? undefined : this.toJobSnapshot(record);
  }

  public async saveImportJob(job: ImportJobAggregate): Promise<ImportJobSnapshot> {
    const snapshot = job.snapshot();
    const record = await this.database.client.importJob.update({
      data: {
        acceptedRows: snapshot.acceptedRows,
        errorReportKey: snapshot.errorReportKey,
        rejectedRows: snapshot.rejectedRows,
        status: snapshot.status,
        totalRows: snapshot.totalRows,
        updatedAt: snapshot.updatedAt,
      },
      where: { id: snapshot.id },
    });
    return this.toJobSnapshot(record);
  }

  public async createBatch(batch: PackagingBatchAggregate): Promise<PackagingBatchSnapshot> {
    const snapshot = batch.snapshot();
    try {
      const created = await this.database.client.packagingBatch.create({
        data: {
          code: snapshot.code,
          countryCode: snapshot.countryCode,
          createdAt: snapshot.createdAt,
          currencyCode: snapshot.currencyCode,
          id: snapshot.id,
          importJobId: snapshot.importJobId,
          status: snapshot.status,
          tenantId: snapshot.tenantId,
          updatedAt: snapshot.updatedAt,
        },
      });
      return this.toBatchSnapshot(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new DomainError(
          "BATCH_CODE_ALREADY_EXISTS",
          `A batch with code ${snapshot.code} already exists for this tenant`,
          { code: snapshot.code },
        );
      }
      throw error;
    }
  }

  public async findBatchById(
    tenantId: string,
    batchId: string,
  ): Promise<PackagingBatchSnapshot | undefined> {
    const record = await this.database.client.packagingBatch.findFirst({
      where: { id: batchId, tenantId },
    });
    return record === null ? undefined : this.toBatchSnapshot(record);
  }

  public async findBatchByCode(
    tenantId: string,
    code: string,
  ): Promise<PackagingBatchSnapshot | undefined> {
    const record = await this.database.client.packagingBatch.findFirst({
      where: { code, tenantId },
    });
    return record === null ? undefined : this.toBatchSnapshot(record);
  }

  public async saveBatch(batch: PackagingBatchAggregate): Promise<PackagingBatchSnapshot> {
    const snapshot = batch.snapshot();
    const record = await this.database.client.packagingBatch.update({
      data: {
        status: snapshot.status,
        updatedAt: snapshot.updatedAt,
      },
      where: { id: snapshot.id },
    });
    return this.toBatchSnapshot(record);
  }

  public async importPackagings(
    job: ImportJobAggregate,
    batch: PackagingBatchAggregate,
    packagings: PackagingAggregate[],
  ): Promise<void> {
    const jobSnap = job.snapshot();
    const batchSnap = batch.snapshot();

    await this.database.client.$transaction(async (tx) => {
      await tx.importJob.update({
        data: {
          acceptedRows: jobSnap.acceptedRows,
          errorReportKey: jobSnap.errorReportKey,
          rejectedRows: jobSnap.rejectedRows,
          status: jobSnap.status,
          totalRows: jobSnap.totalRows,
          updatedAt: jobSnap.updatedAt,
        },
        where: { id: jobSnap.id },
      });

      await tx.packagingBatch.update({
        data: {
          status: batchSnap.status,
          updatedAt: batchSnap.updatedAt,
        },
        where: { id: batchSnap.id },
      });

      const packagingData = packagings.map((pkg) => {
        const snap = pkg.snapshot();
        return {
          batchId: snap.batchId,
          expectedWeightGrams: snap.expectedWeightGrams,
          externalQrHash: snap.externalQrHash,
          id: snap.id,
          internalQrHash: snap.internalQrHash,
          materialCode: snap.materialCode,
          mintedAt: snap.createdAt,
          rewardCents: snap.rewardCents,
          serial: snap.serial,
          status: snap.status,
          tenantId: snap.tenantId,
          unitCostCents: snap.unitCostCents,
          updatedAt: snap.updatedAt,
          version: snap.version,
        };
      });

      try {
        await tx.packaging.createMany({
          data: packagingData,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          const target = Array.isArray(error.meta?.target)
            ? error.meta.target.map(String)
            : [];
          const isSerialConflict = target.some(
            (t) => t.includes("serial") || t.includes("tenantId_serial_key")
          );
          if (isSerialConflict) {
            throw new DomainError(
              "PACKAGING_SERIAL_ALREADY_EXISTS",
              "A packaging with this serial already exists for the tenant",
            );
          }
          throw new DomainError(
            "QR_HASH_ALREADY_EXISTS",
            "An external or internal QR hash is already registered",
            { target },
          );
        }
        throw error;
      }
    });
  }

  private toJobSnapshot(record: ImportJobRecord): ImportJobSnapshot {
    return {
      acceptedRows: record.acceptedRows,
      contractVersion: record.contractVersion,
      createdAt: record.createdAt,
      createdByUserId: record.createdByUserId,
      errorReportKey: record.errorReportKey,
      expiresAt: record.expiresAt,
      fileHash: record.fileHash,
      id: record.id,
      objectKey: record.objectKey,
      originalFileName: record.originalFileName,
      rejectedRows: record.rejectedRows,
      sourceEventId: record.sourceEventId,
      status: record.status,
      tenantId: record.tenantId,
      totalRows: record.totalRows,
      updatedAt: record.updatedAt,
    };
  }

  private toBatchSnapshot(record: PackagingBatchRecord): PackagingBatchSnapshot {
    return {
      code: record.code,
      countryCode: record.countryCode,
      createdAt: record.createdAt,
      currencyCode: record.currencyCode,
      id: record.id,
      importJobId: record.importJobId,
      status: record.status,
      tenantId: record.tenantId,
      updatedAt: record.updatedAt,
    };
  }
}
