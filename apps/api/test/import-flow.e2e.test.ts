import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { DatabaseService } from "../src/common/database/database.service.js";
import { configureApplication } from "../src/configure-application.js";

const tenantEs = "11111111-1111-4111-8111-111111111111";
const tenantPt = "22222222-2222-4222-8222-222222222222";
const userEs = "55555555-5555-4555-8555-555555555555";
const userPt = "66666666-6666-4666-8666-666666666666";

describe("Import Flow API E2E", () => {
  let app: INestApplication;
  let database: DatabaseService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    configureApplication(app);
    await app.init();
    database = app.get(DatabaseService);

    await resetDatabase(database);
    await seedBaseData(database);
  });

  afterEach(async () => {
    await resetDatabase(database);
    await app.close();
  });

  function httpServer(application: INestApplication): Server {
    const candidate = application.getHttpServer();
    if (!(candidate instanceof Server)) {
      throw new TypeError("Nest did not expose a Node HTTP server");
    }
    return candidate;
  }

  it("rejects file upload with missing columns (contract check)", async () => {
    const invalidCsv = "serial,materialCode,expectedWeightGrams\n123,PET,400";

    const response = await request(httpServer(app))
      .post("/api/v1/imports")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .attach("file", Buffer.from(invalidCsv), "invalid.csv")
      .field("contractVersion", "v1")
      .field("sourceEventId", "evt-contract-001")
      .field("batchCode", "BATCH-ERR-C")
      .field("countryCode", "ES")
      .field("currencyCode", "EUR")
      .expect(400);

    expect(response.body.error.message).toContain("Missing required CSV header");
  });

  it("validates line items, reports partial errors, and commits accepted rows only", async () => {
    // 1. Pre-insert a duplicate packaging in the database
    await database.client.packagingBatch.create({
      data: {
        code: "BATCH-EXISTING",
        countryCode: "ES",
        currencyCode: "EUR",
        id: "77777777-7777-4777-8777-777777777777",
        tenantId: tenantEs,
      },
    });

    await database.client.packaging.create({
      data: {
        batchId: "77777777-7777-4777-8777-777777777777",
        expectedWeightGrams: 300,
        externalQrHash: "d".repeat(64),
        id: "77777777-7777-4777-8777-777777777778",
        internalQrHash: "c".repeat(64),
        materialCode: "PET",
        mintedAt: new Date(),
        rewardCents: 10,
        serial: "DB-DUP-SERIAL",
        status: "MINTED",
        tenantId: tenantEs,
        unitCostCents: 10,
        updatedAt: new Date(),
        version: 0,
      },
    });

    // 2. Prepare a CSV containing:
    // - Line 2: Valid packaging (will be accepted)
    // - Line 3: Invalid expectedWeightGrams (rejected)
    // - Line 4: Duplicate serial within file (rejected)
    // - Line 5: Duplicate serial in DB (rejected)
    // - Line 6: Duplicate external QR hash within file (rejected)
    const validQr1 = "1".repeat(64);
    const validQr2 = "2".repeat(64);
    const dbQr1 = "d".repeat(64);
    const dbQr2 = "c".repeat(64);

    const csvData = [
      "serial,materialCode,expectedWeightGrams,unitCostCents,rewardCents,externalQrHash,internalQrHash",
      `OK-SERIAL-001,PET,400.5,50,60,${validQr1},${validQr2}`,
      `ERR-WEIGHT,PET,-5.5,50,60,${"3".repeat(64)},${"4".repeat(64)}`,
      `OK-SERIAL-001,PET,400.5,50,60,${"5".repeat(64)},${"6".repeat(64)}`, // duplicate serial in file
      `DB-DUP-SERIAL,PET,400.5,50,60,${"7".repeat(64)},${"8".repeat(64)}`, // duplicate serial in DB
      `DUP-QR-SERIAL,PET,400.5,50,60,${validQr1},${"9".repeat(64)}`, // duplicate external QR hash in file
    ].join("\n");

    const uploadResponse = await request(httpServer(app))
      .post("/api/v1/imports")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .attach("file", Buffer.from(csvData), "import.csv")
      .field("contractVersion", "v1")
      .field("sourceEventId", "evt-import-002")
      .field("batchCode", "BATCH-FLOW-PARTIAL")
      .field("countryCode", "ES")
      .field("currencyCode", "EUR")
      .expect(201);

    const job = uploadResponse.body;
    expect(job.status).toBe("READY");
    expect(job.totalRows).toBe(5);
    expect(job.acceptedRows).toBe(1);
    expect(job.rejectedRows).toBe(4);
    expect(job.errorReportKey).toBeDefined();

    // 3. Download the error report
    const errorReportResponse = await request(httpServer(app))
      .get(`/api/v1/imports/${job.id}/errors`)
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(200);

    const errors = errorReportResponse.body;
    expect(errors.length).toBe(4);

    // Verify specific error reports by line
    const errWeight = errors.find((e: any) => e.line === 3);
    expect(errWeight.errors).toContain("ExpectedWeightGrams must be a finite number greater than zero");

    const errFileDup = errors.find((e: any) => e.line === 4);
    expect(errFileDup.errors[0]).toContain("Duplicate serial within the file");

    const errDbDup = errors.find((e: any) => e.line === 5);
    expect(errDbDup.errors[0]).toContain("Serial already exists in the database");

    const errQrDup = errors.find((e: any) => e.line === 6);
    expect(errQrDup.errors[0]).toContain("Duplicate external QR hash within the file");

    // 4. Commit the import job
    const commitResponse = await request(httpServer(app))
      .post(`/api/v1/imports/${job.id}/commit`)
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(201);

    expect(commitResponse.body.status).toBe("COMMITTED");

    // 5. Verify database contents:
    // Only one packaging (OK-SERIAL-001) should have been created
    const packagings = await database.client.packaging.findMany({
      where: { tenantId: tenantEs, serial: "OK-SERIAL-001" },
    });
    expect(packagings.length).toBe(1);

    const rejectedPackagingInDb = await database.client.packaging.findFirst({
      where: { tenantId: tenantEs, serial: "ERR-WEIGHT" },
    });
    expect(rejectedPackagingInDb).toBeNull();
  });

  it("enforces tenant isolation on import lookup and error download", async () => {
    const csvData = "serial,materialCode,expectedWeightGrams,unitCostCents,rewardCents,externalQrHash,internalQrHash\n" +
      `OK-SERIAL-PT,PET,400.5,50,60,${"a".repeat(64)},${"b".repeat(64)}`;

    const uploadResponse = await request(httpServer(app))
      .post("/api/v1/imports")
      .set("x-user-id", userPt)
      .set("x-tenant-id", tenantPt)
      .attach("file", Buffer.from(csvData), "import.csv")
      .field("contractVersion", "v1")
      .field("sourceEventId", "evt-pt-001")
      .field("batchCode", "BATCH-PT-001")
      .field("countryCode", "PT")
      .field("currencyCode", "EUR")
      .expect(201);

    const jobId = uploadResponse.body.id;

    // Spanish user attempting to fetch or commit Portuguese import job -> 404 (isolates existence)
    await request(httpServer(app))
      .get(`/api/v1/imports/${jobId}`)
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(404);

    await request(httpServer(app))
      .post(`/api/v1/imports/${jobId}/commit`)
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(404);
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
  await database.client.tenant.createMany({
    data: [
      { countryCodes: ["ES"], id: tenantEs, name: "Pilot Spain", slug: "pilot-es" },
      { countryCodes: ["PT"], id: tenantPt, name: "Pilot Portugal", slug: "pilot-pt" },
    ],
  });
  await database.client.user.createMany({
    data: [
      { email: "es@example.com", externalSubject: "auth0|es", id: userEs },
      { email: "pt@example.com", externalSubject: "auth0|pt", id: userPt },
    ],
  });
  await database.client.tenantMembership.createMany({
    data: [
      { role: "OPERATOR", tenantId: tenantEs, userId: userEs },
      { role: "OPERATOR", tenantId: tenantPt, userId: userPt },
    ],
  });
}
