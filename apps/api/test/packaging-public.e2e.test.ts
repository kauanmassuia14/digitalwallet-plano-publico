import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { DatabaseService } from "../src/common/database/database.service.js";
import { configureApplication } from "../src/configure-application.js";

const tenantEs = "11111111-1111-4111-8111-111111111111";
const userEs = "55555555-5555-4555-8555-555555555555";

describe("Packaging Public API E2E", () => {
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

  it("can lookup packaging by external QR hash publicly without auth", async () => {
    // 1. Create a batch first
    const batchId = "33333333-3333-4333-8333-333333333333";
    await database.client.packagingBatch.create({
      data: {
        id: batchId,
        tenantId: tenantEs,
        code: "BATCH-PUB-01",
        countryCode: "ES",
        currencyCode: "EUR",
        status: "IMPORTED",
      },
    });

    // 2. Insert a packaging record directly
    const packagingId = "44444444-4444-4444-8444-444444444444";
    const externalQrHash = "hash-ext-qr-public-test-123";
    await database.client.packaging.create({
      data: {
        id: packagingId,
        tenantId: tenantEs,
        batchId: batchId,
        serial: "PUB-SER-001",
        materialCode: "PET_01",
        expectedWeightGrams: 200,
        rewardCents: 15,
        unitCostCents: 2,
        externalQrHash,
        internalQrHash: "hash-int-qr-public-test-123",
        status: "MINTED",
        version: 1,
      },
    });

    // 3. Query the public lookup endpoint
    const response = await request(httpServer(app))
      .get(`/api/v1/packaging/public/lookup/${externalQrHash}`)
      .expect(200);

    expect(response.body).toEqual({
      id: packagingId,
      status: "MINTED",
      materialCode: "PET_01",
      rewardCents: 15,
      tenantName: "Pilot Spain",
      allowedCountries: ["ES"],
    });
  });

  it("returns 404 if public lookup qr hash does not exist", async () => {
    await request(httpServer(app))
      .get("/api/v1/packaging/public/lookup/non-existent-hash-999")
      .expect(404);
  });

  it("still enforces tenant context and block access to private routes without auth", async () => {
    await request(httpServer(app))
      .get("/api/v1/packaging/44444444-4444-4444-8444-444444444444")
      .expect(400); // TenantContextGuard throws Bad Request for missing tenant/user context headers
  });
});

async function resetDatabase(database: DatabaseService): Promise<void> {
  await database.client.$transaction([
    database.client.packaging.deleteMany({}),
    database.client.packagingBatch.deleteMany({}),
    database.client.importJob.deleteMany({}),
    database.client.collectionRequest.deleteMany({}),
    database.client.condominium.deleteMany({}),
    database.client.cooperative.deleteMany({}),
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
