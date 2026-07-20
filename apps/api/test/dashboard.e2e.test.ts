import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { DatabaseService } from "../src/common/database/database.service.js";
import { RewardsService } from "../src/rewards/rewards.service.js";
import { configureApplication } from "../src/configure-application.js";

const tenantEs = "11111111-1111-4111-8111-111111111111";
const userEs = "55555555-5555-4555-8555-555555555555";
const batchIdEs = "22222222-2222-4222-8222-222222222222";
const packagingId1 = "33333333-3333-4333-8333-333333333333";
const packagingId2 = "33333333-3333-4333-8333-333333333334";
const packagingId3 = "33333333-3333-4333-8333-333333333335";

function httpServer(app: INestApplication): any {
  return app.getHttpServer();
}

describe("Dashboard and Versioned KPIs E2E", () => {
  let app: INestApplication;
  let database: DatabaseService;
  let rewardsService: RewardsService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    configureApplication(app);
    await app.init();

    database = app.get(DatabaseService);
    rewardsService = app.get(RewardsService);

    await resetDatabase(database);
    await seedBaseData(database);
  });

  afterEach(async () => {
    await resetDatabase(database);
    await app.close();
  });

  it("calculates versioned KPIs v1 and v2 with correct math", async () => {
    // 1. Process Earn reward for packagingId1 (amount: 100) -> status: SETTLED
    await rewardsService.earn(tenantEs, userEs, packagingId1, 100, "idem-kpi-earn-1");

    // 2. Process Earn reward for packagingId2 (amount: 200) -> status: SETTLED
    await rewardsService.earn(tenantEs, userEs, packagingId2, 200, "idem-kpi-earn-2");

    // 3. Request a cashout (amount: 50) -> status: SETTLED (successful sandbox cashout)
    await rewardsService.cashout(tenantEs, userEs, 50, "valid_dest", "idem-kpi-cashout-1");

    // 4. Request a cashout that fails (amount: 30) -> status: FAILED (failed sandbox cashout, refunded)
    await rewardsService.cashout(tenantEs, userEs, 30, "FAIL_KEY", "idem-kpi-cashout-2");

    // 5. Query KPI version v1
    const resV1 = await request(httpServer(app))
      .get("/api/v1/dashboard/kpis")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .query({ version: "v1" })
      .expect(200);

    expect(resV1.body.mintedCount).toBe(3); // packagingId1, packagingId2, packagingId3
    expect(resV1.body.collectedCount).toBe(2); // packagingId1, packagingId2 are COLLECTED
    expect(resV1.body.recycledCount).toBe(0); // none are RECYCLED yet
    expect(resV1.body.totalCollectedWeightGrams).toBe(100.0); // 50g + 50g

    // v1 returnRate = (collectedCount / mintedCount) * 100 = (2 / 3) * 100 = 66.6666...
    expect(resV1.body.returnRate).toBeCloseTo(66.67, 1);
    // v1 co2SavedKg = weight * 0.0025 = 100 * 0.0025 = 0.25
    expect(resV1.body.co2SavedKg).toBe(0.25);
    // v1 redemptionRate = (cashedOut / earned) * 100 = (50 / 300) * 100 = 16.666...
    expect(resV1.body.redemptionRate).toBeCloseTo(16.67, 1);
    expect(resV1.body.activeUsersCount).toBe(1);

    // 6. Transition packagingId1 to RECYCLED
    await database.client.packaging.update({
      where: { id: packagingId1 },
      data: { status: "RECYCLED", recycledAt: new Date() },
    });

    // Query KPI version v2
    const resV2 = await request(httpServer(app))
      .get("/api/v1/dashboard/kpis")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .query({ version: "v2" })
      .expect(200);

    // v2 returnRate = (recycledCount / mintedCount) * 100 = (1 / 3) * 100 = 33.333...
    expect(resV2.body.returnRate).toBeCloseTo(33.33, 1);
    // v2 co2SavedKg = weight * 0.0030 = 100 * 0.0030 = 0.30
    expect(resV2.body.co2SavedKg).toBe(0.30);
  });

  it("filters KPIs by countryCode, batchId and date ranges", async () => {
    const resFiltered = await request(httpServer(app))
      .get("/api/v1/dashboard/kpis")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .query({
        countryCode: "ES",
        batchId: batchIdEs,
      })
      .expect(200);

    expect(resFiltered.body.mintedCount).toBe(3);
  });

  it("exports audit-ready financial reconciliation showing 0 discrepancy and valid ledger", async () => {
    // 1. Earn 100
    await rewardsService.earn(tenantEs, userEs, packagingId1, 100, "idem-recon-earn-1");
    // 2. Cashout 40 (succeeds)
    await rewardsService.cashout(tenantEs, userEs, 40, "valid_dest", "idem-recon-cashout-1");

    // 3. Export reconciliation
    const reconRes = await request(httpServer(app))
      .get("/api/v1/dashboard/reconciliation/export")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(200);

    expect(reconRes.body.financialTotals.totalEarnedCents).toBe(100);
    expect(reconRes.body.financialTotals.totalCashedOutCents).toBe(40);
    expect(reconRes.body.financialTotals.totalCurrentBalanceCents).toBe(60);
    expect(reconRes.body.financialTotals.discrepancyCents).toBe(0);
    expect(reconRes.body.financialTotals.isReconciled).toBe(true);
    expect(reconRes.body.ledgerValidation.isValid).toBe(true);
  });
});

async function resetDatabase(database: DatabaseService): Promise<void> {
  await database.client.$transaction([
    database.client.auditLog.deleteMany({}),
    database.client.auditLedger.deleteMany({}),
    database.client.rewardTransaction.deleteMany({}),
    database.client.rewardAccount.deleteMany({}),
    database.client.packagingEvent.deleteMany({}),
    database.client.packaging.deleteMany({}),
    database.client.packagingBatch.deleteMany({}),
    database.client.tenantMembership.deleteMany({}),
    database.client.user.deleteMany({}),
    database.client.tenant.deleteMany({}),
  ]);
}

async function seedBaseData(database: DatabaseService): Promise<void> {
  await database.client.tenant.createMany({
    data: [
      { countryCodes: ["ES"], id: tenantEs, name: "Pilot Spain", slug: "pilot-es" },
    ],
  });

  await database.client.user.createMany({
    data: [
      { email: "es@example.com", externalSubject: "auth0|es", id: userEs },
    ],
  });

  await database.client.tenantMembership.createMany({
    data: [
      { role: "OPERATOR", tenantId: tenantEs, userId: userEs },
    ],
  });

  await database.client.packagingBatch.createMany({
    data: [
      {
        id: batchIdEs,
        tenantId: tenantEs,
        code: "BATCH-ES-1",
        countryCode: "ES",
        currencyCode: "EUR",
        status: "VALIDATED",
      },
    ],
  });

  await database.client.packaging.createMany({
    data: [
      {
        id: packagingId1,
        tenantId: tenantEs,
        batchId: batchIdEs,
        serial: "SN-KPI-1",
        status: "COLLECTED",
        materialCode: "PET",
        expectedWeightGrams: 50.0,
        unitCostCents: 10,
        rewardCents: 15,
        externalQrHash: "qr-ext-1",
        internalQrHash: "qr-int-1",
        collectedAt: new Date(),
      },
      {
        id: packagingId2,
        tenantId: tenantEs,
        batchId: batchIdEs,
        serial: "SN-KPI-2",
        status: "COLLECTED",
        materialCode: "PET",
        expectedWeightGrams: 50.0,
        unitCostCents: 10,
        rewardCents: 15,
        externalQrHash: "qr-ext-2",
        internalQrHash: "qr-int-2",
        collectedAt: new Date(),
      },
      {
        id: packagingId3,
        tenantId: tenantEs,
        batchId: batchIdEs,
        serial: "SN-KPI-3",
        status: "MINTED",
        materialCode: "PET",
        expectedWeightGrams: 50.0,
        unitCostCents: 10,
        rewardCents: 15,
        externalQrHash: "qr-ext-3",
        internalQrHash: "qr-int-3",
      },
    ],
  });

  // Seed events representing coletas
  await database.client.packagingEvent.createMany({
    data: [
      {
        id: "aaaaaaaa-1111-2222-3333-444444444444",
        tenantId: tenantEs,
        packagingId: packagingId1,
        type: "COLLECTED",
        actorType: "USER",
        actorId: userEs,
        idempotencyKey: "evt-kpi-1",
        actualWeightGrams: 50.0,
        occurredAt: new Date(),
      },
      {
        id: "bbbbbbbb-1111-2222-3333-444444444444",
        tenantId: tenantEs,
        packagingId: packagingId2,
        type: "COLLECTED",
        actorType: "USER",
        actorId: userEs,
        idempotencyKey: "evt-kpi-2",
        actualWeightGrams: 50.0,
        occurredAt: new Date(),
      },
    ],
  });
}
