import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
} from "@nestjs/common";
import {
  ImportJobAggregate,
  type ImportJobSnapshot,
  PackagingAggregate,
  PackagingBatchAggregate,
} from "@digitalwallet/domain";

import { DatabaseService } from "../common/database/database.service.js";
import { BatchImportRepository } from "./batch-import.repository.js";
import type { UploadImportDto } from "./dto/upload-import.dto.js";

interface RowValidationError {
  readonly line: number;
  readonly serial: string;
  readonly errors: readonly string[];
}

@Injectable()
export class ImportService {
  private readonly uploadsDir = join(process.cwd(), "uploads", "files");
  private readonly errorsDir = join(process.cwd(), "uploads", "error-reports");

  public constructor(
    @Inject(BatchImportRepository)
    private readonly repository: BatchImportRepository,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  public async upload(
    tenantId: string,
    userId: string,
    fileBuffer: Buffer,
    originalFileName: string,
    dto: UploadImportDto,
  ): Promise<ImportJobSnapshot> {
    // 1. Ensure directories exist
    await fs.mkdir(this.uploadsDir, { recursive: true });
    await fs.mkdir(this.errorsDir, { recursive: true });

    // 2. Compute file hash
    const fileHash = createHash("sha256").update(fileBuffer).digest("hex");
    const objectKey = `uploads/${tenantId}/${fileHash}.csv`;

    // 3. Check for existing file hash or batch code
    const existingJob = await this.database.client.importJob.findFirst({
      where: { tenantId, fileHash },
    });
    if (existingJob !== null) {
      throw new ConflictException("This file has already been uploaded");
    }

    const existingBatch = await this.repository.findBatchByCode(
      tenantId,
      dto.batchCode,
    );
    if (existingBatch !== undefined) {
      throw new ConflictException(
        `A batch with code ${dto.batchCode} already exists for this tenant`,
      );
    }

    // 4. Save file to disk
    const filePath = join(this.uploadsDir, `${tenantId}_${fileHash}.csv`);
    await fs.writeFile(filePath, fileBuffer);

    // 5. Create draft entities in domain
    const jobId = randomUUID();
    const batchId = randomUUID();

    const job = ImportJobAggregate.create({
      contractVersion: dto.contractVersion,
      createdAt: new Date(),
      createdByUserId: userId,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000), // 24 hours
      fileHash,
      id: jobId,
      objectKey,
      originalFileName,
      sourceEventId: dto.sourceEventId,
      tenantId,
    });

    const batch = PackagingBatchAggregate.create({
      code: dto.batchCode,
      countryCode: dto.countryCode,
      createdAt: new Date(),
      currencyCode: dto.currencyCode,
      id: batchId,
      importJobId: jobId,
      tenantId,
    });

    await this.repository.createImportJob(job);
    await this.repository.createBatch(batch);

    // 6. Run validation synchronously for simplicity/guarantee in pilot
    return this.validateJob(tenantId, jobId);
  }

  public async getJob(
    tenantId: string,
    jobId: string,
  ): Promise<ImportJobSnapshot> {
    const job = await this.repository.findImportJobById(tenantId, jobId);
    if (job === undefined) {
      throw new NotFoundException("Import job not found");
    }
    return job;
  }

  public async listJobs(tenantId: string): Promise<ImportJobSnapshot[]> {
    const records = await this.database.client.importJob.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => ({
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
    }));
  }

  public async getErrorReport(
    tenantId: string,
    jobId: string,
  ): Promise<string> {
    const job = await this.getJob(tenantId, jobId);
    if (job.errorReportKey === null) {
      throw new NotFoundException("No error report found for this job");
    }
    const reportPath = join(this.errorsDir, `${jobId}.json`);
    try {
      return await fs.readFile(reportPath, "utf8");
    } catch {
      throw new NotFoundException("Error report file is missing");
    }
  }

  public async commitJob(
    tenantId: string,
    jobId: string,
  ): Promise<ImportJobSnapshot> {
    const jobSnap = await this.repository.findImportJobById(tenantId, jobId);
    if (jobSnap === undefined) {
      throw new NotFoundException("Import job not found");
    }

    if (jobSnap.status !== "READY") {
      throw new BadRequestException(
        `Import job is not ready to be committed. Current status: ${jobSnap.status}`,
      );
    }

    if (jobSnap.expiresAt < new Date()) {
      throw new BadRequestException(
        "Import job has expired and cannot be committed",
      );
    }

    const batchSnap = await this.database.client.packagingBatch.findFirst({
      where: { importJobId: jobId, tenantId },
    });
    if (batchSnap === null) {
      throw new NotFoundException("Associated packaging batch not found");
    }

    // Parse and validate again to retrieve accepted aggregates
    const filePath = join(
      this.uploadsDir,
      `${tenantId}_${jobSnap.fileHash}.csv`,
    );
    let fileContent = "";
    try {
      fileContent = await fs.readFile(filePath, "utf8");
    } catch {
      throw new NotFoundException("Uploaded CSV file was not found on disk");
    }

    const { acceptedPackagings } = await this.parseAndValidate(
      tenantId,
      batchSnap.id,
      fileContent,
    );

    if (acceptedPackagings.length === 0) {
      throw new BadRequestException("No valid packagings to import");
    }

    // Transition aggregates
    const job = ImportJobAggregate.rehydrate(jobSnap);
    const committedJob = job.commit(new Date());

    const batch = PackagingBatchAggregate.rehydrate({
      code: batchSnap.code,
      countryCode: batchSnap.countryCode,
      createdAt: batchSnap.createdAt,
      currencyCode: batchSnap.currencyCode,
      id: batchSnap.id,
      importJobId: batchSnap.importJobId,
      status: batchSnap.status,
      tenantId: batchSnap.tenantId,
      updatedAt: batchSnap.updatedAt,
    });
    const importedBatch = batch.import(new Date());

    // Transactional save
    await this.repository.importPackagings(
      committedJob,
      importedBatch,
      acceptedPackagings as PackagingAggregate[],
    );

    return committedJob.snapshot();
  }

  private async validateJob(
    tenantId: string,
    jobId: string,
  ): Promise<ImportJobSnapshot> {
    const jobSnap = await this.repository.findImportJobById(tenantId, jobId);
    if (jobSnap === undefined) {
      throw new NotFoundException("Import job not found");
    }

    const batchSnap = await this.database.client.packagingBatch.findFirst({
      where: { importJobId: jobId, tenantId },
    });
    if (batchSnap === null) {
      throw new NotFoundException("Associated packaging batch not found");
    }

    // Transition job to VALIDATING
    const job = ImportJobAggregate.rehydrate(jobSnap);
    const validatingJob = job.startValidating(new Date());
    await this.repository.saveImportJob(validatingJob);

    // Read CSV file
    const filePath = join(
      this.uploadsDir,
      `${tenantId}_${jobSnap.fileHash}.csv`,
    );
    const fileContent = await fs.readFile(filePath, "utf8");

    // Perform validation
    const { acceptedPackagings, rejectedRows, totalRows } =
      await this.parseAndValidate(tenantId, batchSnap.id, fileContent);

    const acceptedRows = acceptedPackagings.length;
    const errorsCount = rejectedRows.length;

    let finalJob: ImportJobAggregate;
    let finalBatch: PackagingBatchAggregate;

    const batch = PackagingBatchAggregate.rehydrate({
      code: batchSnap.code,
      countryCode: batchSnap.countryCode,
      createdAt: batchSnap.createdAt,
      currencyCode: batchSnap.currencyCode,
      id: batchSnap.id,
      importJobId: batchSnap.importJobId,
      status: batchSnap.status,
      tenantId: batchSnap.tenantId,
      updatedAt: batchSnap.updatedAt,
    });

    if (acceptedRows === 0) {
      // All rows failed, reject the job
      finalJob = validatingJob.reject(
        `uploads/error-reports/${jobId}.json`,
        new Date(),
      );
      finalJob = ImportJobAggregate.rehydrate({
        ...finalJob.snapshot(),
        acceptedRows: 0,
        rejectedRows: errorsCount,
        totalRows,
      });
      finalBatch = batch.fail(new Date());
    } else {
      // Some or all rows succeeded
      finalJob = validatingJob.ready(
        { acceptedRows, rejectedRows: errorsCount, totalRows },
        new Date(),
      );
      if (errorsCount > 0) {
        finalJob = ImportJobAggregate.rehydrate({
          ...finalJob.snapshot(),
          errorReportKey: `uploads/error-reports/${jobId}.json`,
        });
      }
      finalBatch = batch.validate(new Date());
    }

    // Save error report to disk if any rejections occurred
    if (errorsCount > 0) {
      const reportPath = join(this.errorsDir, `${jobId}.json`);
      await fs.writeFile(reportPath, JSON.stringify(rejectedRows, null, 2));
    }

    // Save state
    await this.repository.saveImportJob(finalJob);
    await this.repository.saveBatch(finalBatch);

    return finalJob.snapshot();
  }

  private async parseAndValidate(
    tenantId: string,
    batchId: string,
    csvContent: string,
  ): Promise<{
    readonly acceptedPackagings: readonly PackagingAggregate[];
    readonly rejectedRows: readonly RowValidationError[];
    readonly totalRows: number;
  }> {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) {
      throw new BadRequestException("CSV file is empty or has no data rows");
    }

    // 1. Parse headers
    const headers = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
    const requiredHeaders = [
      "serial",
      "materialcode",
      "expectedweightgrams",
      "unitcostcents",
      "rewardcents",
      "externalqrhash",
      "internalqrhash",
    ];

    for (const req of requiredHeaders) {
      if (!headers.includes(req)) {
        throw new BadRequestException(`Missing required CSV header: ${req}`);
      }
    }

    const colIndex = (name: string) => headers.indexOf(name);

    const acceptedPackagings: PackagingAggregate[] = [];
    const rejectedRows: RowValidationError[] = [];

    // Parse all rows first
    const rawRows = lines.slice(1).map((line, idx) => {
      const parts = this.parseCsvLine(line);
      return {
        lineNum: idx + 2, // 1-based, plus 1 for header
        serial: parts[colIndex("serial")] || "",
        materialCode: parts[colIndex("materialcode")] || "",
        expectedWeightGrams: parts[colIndex("expectedweightgrams")] || "",
        unitCostCents: parts[colIndex("unitcostcents")] || "",
        rewardCents: parts[colIndex("rewardcents")] || "",
        externalQrHash: parts[colIndex("externalqrhash")] || "",
        internalQrHash: parts[colIndex("internalqrhash")] || "",
      };
    });

    const totalRows = rawRows.length;

    // Collect all valid formats to bulk check database uniqueness
    const fileSerials = new Set<string>();
    const fileExternalHashes = new Set<string>();
    const fileInternalHashes = new Set<string>();

    for (const r of rawRows) {
      if (r.serial) fileSerials.add(r.serial);
      if (r.externalQrHash && /^[0-9a-fA-F]{64}$/.test(r.externalQrHash)) {
        fileExternalHashes.add(r.externalQrHash.toLowerCase());
      }
      if (r.internalQrHash && /^[0-9a-fA-F]{64}$/.test(r.internalQrHash)) {
        fileInternalHashes.add(r.internalQrHash.toLowerCase());
      }
    }

    // Bulk query existing records in database to avoid N+1 queries
    const [dbSerials, dbExternalHashes, dbInternalHashes] = await Promise.all([
      this.database.client.packaging.findMany({
        where: { tenantId, serial: { in: Array.from(fileSerials) } },
        select: { serial: true },
      }),
      this.database.client.packaging.findMany({
        where: {
          tenantId,
          externalQrHash: { in: Array.from(fileExternalHashes) },
        },
        select: { externalQrHash: true },
      }),
      this.database.client.packaging.findMany({
        where: {
          tenantId,
          internalQrHash: { in: Array.from(fileInternalHashes) },
        },
        select: { internalQrHash: true },
      }),
    ]);

    const existingSerialsInDb = new Set(dbSerials.map((s) => s.serial));
    const existingExternalHashesInDb = new Set(
      dbExternalHashes.map((h) => h.externalQrHash),
    );
    const existingInternalHashesInDb = new Set(
      dbInternalHashes.map((h) => h.internalQrHash),
    );

    // Sets to track duplicates within the file itself
    const processedSerils = new Set<string>();
    const processedExternalHashes = new Set<string>();
    const processedInternalHashes = new Set<string>();

    for (const r of rawRows) {
      const rowErrors: string[] = [];

      // Validate required formats and bounds
      if (!r.serial.trim()) {
        rowErrors.push("Serial must not be blank");
      }
      if (!r.materialCode.trim()) {
        rowErrors.push("MaterialCode must not be blank");
      }

      const weight = parseFloat(r.expectedWeightGrams);
      if (Number.isNaN(weight) || weight <= 0) {
        rowErrors.push(
          "ExpectedWeightGrams must be a finite number greater than zero",
        );
      }

      const unitCost = parseInt(r.unitCostCents, 10);
      if (Number.isNaN(unitCost) || unitCost < 0) {
        rowErrors.push("UnitCostCents must be a non-negative integer");
      }

      const reward = parseInt(r.rewardCents, 10);
      if (Number.isNaN(reward) || reward < 0) {
        rowErrors.push("RewardCents must be a non-negative integer");
      }

      const extHash = r.externalQrHash.trim().toLowerCase();
      const intHash = r.internalQrHash.trim().toLowerCase();

      if (!/^[0-9a-f]{64}$/.test(extHash)) {
        rowErrors.push("ExternalQrHash must be a SHA-256 hex digest");
      }
      if (!/^[0-9a-f]{64}$/.test(intHash)) {
        rowErrors.push("InternalQrHash must be a SHA-256 hex digest");
      }

      if (extHash === intHash && extHash.length === 64) {
        rowErrors.push("External and internal QR hashes must be different");
      }

      // If formatting is fine, validate uniqueness
      if (rowErrors.length === 0) {
        // File-level duplicity check
        if (processedSerils.has(r.serial)) {
          rowErrors.push(`Duplicate serial within the file: ${r.serial}`);
        }
        if (processedExternalHashes.has(extHash)) {
          rowErrors.push(
            `Duplicate external QR hash within the file: ${extHash}`,
          );
        }
        if (processedInternalHashes.has(intHash)) {
          rowErrors.push(
            `Duplicate internal QR hash within the file: ${intHash}`,
          );
        }

        // Database-level duplicity check
        if (existingSerialsInDb.has(r.serial)) {
          rowErrors.push(`Serial already exists in the database: ${r.serial}`);
        }
        if (existingExternalHashesInDb.has(extHash)) {
          rowErrors.push(
            `External QR hash already exists in the database: ${extHash}`,
          );
        }
        if (existingInternalHashesInDb.has(intHash)) {
          rowErrors.push(
            `Internal QR hash already exists in the database: ${intHash}`,
          );
        }
      }

      // If clean, create aggregate, else report error
      if (rowErrors.length === 0) {
        processedSerils.add(r.serial);
        processedExternalHashes.add(extHash);
        processedInternalHashes.add(intHash);

        try {
          const pkg = PackagingAggregate.create({
            batchId,
            expectedWeightGrams: weight,
            externalQrHash: extHash,
            id: randomUUID(),
            internalQrHash: intHash,
            materialCode: r.materialCode,
            mintedAt: new Date(),
            rewardCents: reward,
            serial: r.serial,
            tenantId,
            unitCostCents: unitCost,
          });
          acceptedPackagings.push(pkg);
        } catch (err: any) {
          rowErrors.push(
            err.message || "Failed to instantiate domain aggregate",
          );
        }
      }

      if (rowErrors.length > 0) {
        rejectedRows.push({
          line: r.lineNum,
          serial: r.serial,
          errors: rowErrors,
        });
      }
    }

    return {
      acceptedPackagings,
      rejectedRows,
      totalRows,
    };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  public async expirePendingImports(): Promise<number> {
    const now = new Date();
    const expiredJobs = await this.database.client.importJob.findMany({
      where: {
        expiresAt: { lt: now },
        status: { in: ["UPLOADED", "VALIDATING", "READY"] },
      },
    });

    for (const jobSnap of expiredJobs) {
      const job = ImportJobAggregate.rehydrate(jobSnap);
      const expiredJob = job.expire(now);
      await this.repository.saveImportJob(expiredJob);

      const batchSnap = await this.database.client.packagingBatch.findFirst({
        where: { importJobId: jobSnap.id, tenantId: jobSnap.tenantId },
      });
      if (batchSnap !== null) {
        const batch = PackagingBatchAggregate.rehydrate({
          code: batchSnap.code,
          countryCode: batchSnap.countryCode,
          createdAt: batchSnap.createdAt,
          currencyCode: batchSnap.currencyCode,
          id: batchSnap.id,
          importJobId: batchSnap.importJobId,
          status: batchSnap.status,
          tenantId: batchSnap.tenantId,
          updatedAt: batchSnap.updatedAt,
        });
        const failedBatch = batch.fail(now);
        await this.repository.saveBatch(failedBatch);
      }
    }

    return expiredJobs.length;
  }
}
