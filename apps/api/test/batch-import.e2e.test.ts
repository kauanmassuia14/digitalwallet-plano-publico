import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DomainError,
  ImportJobAggregate,
  PackagingAggregate,
  PackagingBatchAggregate,
} from "@digitalwallet/domain";

import { AppModule } from "../src/app.module.js";
import { DatabaseService } from "../src/common/database/database.service.js";
import { BatchImportRepository } from "../src/packaging/batch-import.repository.js";

const tenantEs = "11111111-1111-4111-8111-111111111111";
const userEs = "55555555-5555-4555-8555-555555555555";

describe("PrismaBatchImportRepository E2E", () => {
  let app: INestApplication;
  let database: DatabaseService;
  let repository: BatchImportRepository;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    await app.init();
    database = app.get(DatabaseService);
    repository = app.get(BatchImportRepository);

    await resetDatabase(database);
    await seedBaseData(database);
  });

  afterEach(async () => {
    await resetDatabase(database);
    await app.close();
  });

  it("creates, retrieves and saves an import job", async () => {
    const jobId = "99999999-9999-4999-8999-999999999999";
    const job = ImportJobAggregate.create({
      contractVersion: "v1",
      createdAt: new Date(),
      createdByUserId: userEs,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      fileHash: "a".repeat(64),
      id: jobId,
      objectKey: "uploads/test.csv",
      originalFileName: "test.csv",
      sourceEventId: "evt-001",
      tenantId: tenantEs,
    });

    const created = await repository.createImportJob(job);
    expect(created.id).toBe(jobId);

    const found = await repository.findImportJobById(tenantEs, jobId);
    expect(found).toBeDefined();
    expect(found?.status).toBe("UPLOADED");

    // Change status & save
    const runningJob = ImportJobAggregate.rehydrate(found!);
    const validating = runningJob.startValidating(new Date());
    const updated = await repository.saveImportJob(validating);
    expect(updated.status).toBe("VALIDATING");

    const foundAgain = await repository.findImportJobById(tenantEs, jobId);
    expect(foundAgain?.status).toBe("VALIDATING");
  });

  it("creates, retrieves and saves a packaging batch", async () => {
    const batchId = "88888888-8888-4888-8888-888888888888";
    const batch = PackagingBatchAggregate.create({
      code: "BATCH-TEST-E2E",
      countryCode: "ES",
      createdAt: new Date(),
      currencyCode: "EUR",
      id: batchId,
      tenantId: tenantEs,
    });

    const created = await repository.createBatch(batch);
    expect(created.id).toBe(batchId);

    const foundById = await repository.findBatchById(tenantEs, batchId);
    expect(foundById).toBeDefined();
    expect(foundById?.code).toBe("BATCH-TEST-E2E");

    const foundByCode = await repository.findBatchByCode(
      tenantEs,
      "BATCH-TEST-E2E",
    );
    expect(foundByCode?.id).toBe(batchId);
  });

  it("performs a successful transactional import and commits updates", async () => {
    const jobId = "99999999-9999-4999-8999-999999999999";
    const batchId = "88888888-8888-4888-8888-888888888888";

    // 1. Pre-create the job and batch in DRAFT/UPLOADED state
    const job = ImportJobAggregate.create({
      contractVersion: "v1",
      createdAt: new Date(),
      createdByUserId: userEs,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      fileHash: "a".repeat(64),
      id: jobId,
      objectKey: "uploads/test.csv",
      originalFileName: "test.csv",
      sourceEventId: "evt-001",
      tenantId: tenantEs,
    });
    await repository.createImportJob(job);

    const batch = PackagingBatchAggregate.create({
      code: "BATCH-TRANSACTION",
      countryCode: "ES",
      createdAt: new Date(),
      currencyCode: "EUR",
      id: batchId,
      importJobId: jobId,
      tenantId: tenantEs,
    });
    await repository.createBatch(batch);

    // 2. Prepare transition updates and packagings to import
    const runningJob = ImportJobAggregate.rehydrate(
      (await repository.findImportJobById(tenantEs, jobId))!,
    );
    const readyJob = runningJob
      .ready({ acceptedRows: 2, rejectedRows: 0, totalRows: 2 }, new Date())
      .commit(new Date());

    const runningBatch = PackagingBatchAggregate.rehydrate(
      (await repository.findBatchById(tenantEs, batchId))!,
    );
    const importedBatch = runningBatch.import(new Date());

    const pkg1 = PackagingAggregate.create({
      batchId,
      expectedWeightGrams: 200,
      externalQrHash: "1".repeat(64),
      id: "11111111-2222-4333-8444-555555555551",
      internalQrHash: "1".repeat(63) + "a",
      materialCode: "PET",
      mintedAt: new Date(),
      rewardCents: 50,
      serial: "SR-001",
      tenantId: tenantEs,
      unitCostCents: 40,
    });

    const pkg2 = PackagingAggregate.create({
      batchId,
      expectedWeightGrams: 250,
      externalQrHash: "2".repeat(64),
      id: "11111111-2222-4333-8444-555555555552",
      internalQrHash: "2".repeat(63) + "a",
      materialCode: "PET",
      mintedAt: new Date(),
      rewardCents: 60,
      serial: "SR-002",
      tenantId: tenantEs,
      unitCostCents: 45,
    });

    // 3. Execute transactional import
    await repository.importPackagings(readyJob, importedBatch, [pkg1, pkg2]);

    // 4. Verify everything was written
    const updatedJob = await repository.findImportJobById(tenantEs, jobId);
    expect(updatedJob?.status).toBe("COMMITTED");
    expect(updatedJob?.acceptedRows).toBe(2);

    const updatedBatch = await repository.findBatchById(tenantEs, batchId);
    expect(updatedBatch?.status).toBe("IMPORTED");

    const packagingsInDb = await database.client.packaging.findMany({
      where: { batchId },
    });
    expect(packagingsInDb.length).toBe(2);
    expect(packagingsInDb.map((p) => p.serial)).toContain("SR-001");
    expect(packagingsInDb.map((p) => p.serial)).toContain("SR-002");
  });

  it("rolls back the entire transaction if a packaging duplicate conflict occurs", async () => {
    const jobId = "99999999-9999-4999-8999-999999999999";
    const batchId = "88888888-8888-4888-8888-888888888888";

    const job = ImportJobAggregate.create({
      contractVersion: "v1",
      createdAt: new Date(),
      createdByUserId: userEs,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      fileHash: "a".repeat(64),
      id: jobId,
      objectKey: "uploads/test.csv",
      originalFileName: "test.csv",
      sourceEventId: "evt-001",
      tenantId: tenantEs,
    });
    await repository.createImportJob(job);

    const batch = PackagingBatchAggregate.create({
      code: "BATCH-ROLLBACK",
      countryCode: "ES",
      createdAt: new Date(),
      currencyCode: "EUR",
      id: batchId,
      importJobId: jobId,
      tenantId: tenantEs,
    });
    await repository.createBatch(batch);

    // Pre-insert a packaging with serial "DUPLICATE-SR" using regular database
    await database.client.packaging.create({
      data: {
        batchId,
        expectedWeightGrams: 300,
        externalQrHash: "f".repeat(64),
        id: "77777777-7777-4777-8777-777777777777",
        internalQrHash: "e".repeat(64),
        materialCode: "PET",
        mintedAt: new Date(),
        rewardCents: 10,
        serial: "DUPLICATE-SR",
        status: "MINTED",
        tenantId: tenantEs,
        unitCostCents: 10,
        updatedAt: new Date(),
        version: 0,
      },
    });

    const runningJob = ImportJobAggregate.rehydrate(
      (await repository.findImportJobById(tenantEs, jobId))!,
    );
    const readyJob = runningJob
      .ready({ acceptedRows: 2, rejectedRows: 0, totalRows: 2 }, new Date())
      .commit(new Date());

    const runningBatch = PackagingBatchAggregate.rehydrate(
      (await repository.findBatchById(tenantEs, batchId))!,
    );
    const importedBatch = runningBatch.import(new Date());

    const pkg1 = PackagingAggregate.create({
      batchId,
      expectedWeightGrams: 200,
      externalQrHash: "1".repeat(64),
      id: "11111111-2222-4333-8444-555555555551",
      internalQrHash: "1".repeat(63) + "a",
      materialCode: "PET",
      mintedAt: new Date(),
      rewardCents: 50,
      serial: "OK-SR",
      tenantId: tenantEs,
      unitCostCents: 40,
    });

    // pkg2 has the duplicate serial "DUPLICATE-SR"
    const pkg2 = PackagingAggregate.create({
      batchId,
      expectedWeightGrams: 250,
      externalQrHash: "2".repeat(64),
      id: "11111111-2222-4333-8444-555555555552",
      internalQrHash: "2".repeat(63) + "a",
      materialCode: "PET",
      mintedAt: new Date(),
      rewardCents: 60,
      serial: "DUPLICATE-SR",
      tenantId: tenantEs,
      unitCostCents: 45,
    });

    // Expect transaction to fail due to duplicate serial
    await expect(
      repository.importPackagings(readyJob, importedBatch, [pkg1, pkg2]),
    ).rejects.toThrow(DomainError);

    // Verify transaction rolled back:
    // 1. The job status must still be UPLOADED (not COMMITTED)
    const rolledBackJob = await repository.findImportJobById(tenantEs, jobId);
    expect(rolledBackJob?.status).toBe("UPLOADED");

    // 2. The batch status must still be DRAFT (not IMPORTED)
    const rolledBackBatch = await repository.findBatchById(tenantEs, batchId);
    expect(rolledBackBatch?.status).toBe("DRAFT");

    // 3. The new packaging "OK-SR" must NOT have been persisted
    const okPkg = await database.client.packaging.findFirst({
      where: { serial: "OK-SR" },
    });
    expect(okPkg).toBeNull();
  });
});

async function resetDatabase(database: DatabaseService): Promise<void> {
  await database.client.$transaction([
    database.client.packaging.deleteMany({}),
    database.client.packagingBatch.deleteMany({}),
    database.client.importJob.deleteMany({}),
    database.client.tenantMembership.deleteMany({}),
    database.client.user.deleteMany({}),
    database.client.tenant.deleteMany({}),
  ]);
}

async function seedBaseData(database: DatabaseService): Promise<void> {
  await database.client.tenant.create({
    data: {
      countryCodes: ["ES"],
      id: tenantEs,
      name: "Pilot Spain",
      slug: "pilot-es",
    },
  });
  await database.client.user.create({
    data: { email: "es@example.com", externalSubject: "auth0|es", id: userEs },
  });
  await database.client.tenantMembership.create({
    data: { role: "OPERATOR", tenantId: tenantEs, userId: userEs },
  });
}
