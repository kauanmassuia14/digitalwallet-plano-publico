import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { DatabaseService } from "../src/common/database/database.service.js";
import { configureApplication } from "../src/configure-application.js";

const tenantEs = "11111111-1111-4111-8111-111111111111";
const userEs = "55555555-5555-4555-8555-555555555555";
const batchId = "22222222-2222-4222-8222-222222222222";
const packagingId1 = "33333333-3333-4333-8333-333333333333";
const packagingId2 = "33333333-3333-4333-8333-333333333334";

interface BalanceBody {
  balanceCents: number;
}

interface TransactionBody {
  id: string;
  type: string;
  status: string;
  amountCents: number;
  providerReference?: string;
  failureCode?: string;
  reversalOfId?: string;
}

interface ErrorMessage {
  message: string;
}

interface ErrorResponse {
  error: ErrorMessage;
}

interface LedgerPayload {
  eventType?: string;
  packagingId?: string;
}

function httpServer(app: INestApplication): any {
  return app.getHttpServer();
}

describe("Rewards and Cashout E2E", () => {
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

  it("checks initial balance is 0 and history is empty", async () => {
    const res = await request(httpServer(app))
      .get("/api/v1/rewards/balance")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(200);

    const body = res.body as BalanceBody;
    expect(body.balanceCents).toBe(0);

    const history = await request(httpServer(app))
      .get("/api/v1/rewards/transactions")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(200);

    const list = history.body as TransactionBody[];
    expect(list).toHaveLength(0);
  });

  it("earns rewards, prevents double-crediting package, and registers in the Ledger", async () => {
    // 1. Earn 150 cents
    const earnRes = await request(httpServer(app))
      .post("/api/v1/rewards/earn")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({
        userId: userEs,
        packagingId: packagingId1,
        amountCents: 150,
        idempotencyKey: "idem-earn-1",
      })
      .expect(201);

    const earnBody = earnRes.body as TransactionBody;
    expect(earnBody.amountCents).toBe(150);
    expect(earnBody.type).toBe("EARN");
    expect(earnBody.status).toBe("SETTLED");

    // Check balance
    const balRes = await request(httpServer(app))
      .get("/api/v1/rewards/balance")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(200);

    const balBody = balRes.body as BalanceBody;
    expect(balBody.balanceCents).toBe(150);

    // 2. Prevent double-crediting the same package (W07.2)
    const duplicateRes = await request(httpServer(app))
      .post("/api/v1/rewards/earn")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({
        userId: userEs,
        packagingId: packagingId1,
        amountCents: 200,
        idempotencyKey: "idem-earn-2",
      })
      .expect(400);

    const dupBody = duplicateRes.body as ErrorResponse;
    expect(dupBody.error.message).toContain("already credited");

    // 3. Verify cryptographic Ledger row was appended in the same transaction
    const ledgerEntries = await database.client.auditLedger.findMany({
      orderBy: { createdAt: "desc" },
    });
    expect(ledgerEntries.length).toBeGreaterThan(0);
    const ledgerPayload = ledgerEntries[0]!.payload as LedgerPayload;
    expect(ledgerPayload.eventType).toBe("REWARD_EARNED");
    expect(ledgerPayload.packagingId).toBe(packagingId1);
  });

  it("handles cashout success, failure/refund, and insufficient balance", async () => {
    // Earn some starting balance first
    await request(httpServer(app))
      .post("/api/v1/rewards/earn")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({
        userId: userEs,
        packagingId: packagingId1,
        amountCents: 200,
        idempotencyKey: "idem-earn-starter",
      })
      .expect(201);

    // 1. Request cashout of 100 cents (succeeds)
    const cashoutRes1 = await request(httpServer(app))
      .post("/api/v1/rewards/cashout")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({
        amountCents: 100,
        destinationKey: "valid_pix_key",
        idempotencyKey: "idem-cashout-1",
      })
      .expect(201);

    const cashoutBody1 = cashoutRes1.body as TransactionBody;
    expect(cashoutBody1.amountCents).toBe(100);
    expect(cashoutBody1.type).toBe("CASHOUT");
    expect(cashoutBody1.status).toBe("SETTLED");
    expect(cashoutBody1.providerReference).toBeDefined();

    // Verify balance dropped to 100 cents
    const balRes1 = await request(httpServer(app))
      .get("/api/v1/rewards/balance")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(200);

    const balBody1 = balRes1.body as BalanceBody;
    expect(balBody1.balanceCents).toBe(100);

    // 2. Request cashout that fails in sandbox (reverted/refunded)
    const cashoutRes2 = await request(httpServer(app))
      .post("/api/v1/rewards/cashout")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({
        amountCents: 50,
        destinationKey: "FAIL_KEY",
        idempotencyKey: "idem-cashout-2",
      })
      .expect(201);

    const cashoutBody2 = cashoutRes2.body as TransactionBody;
    expect(cashoutBody2.type).toBe("CASHOUT");
    expect(cashoutBody2.status).toBe("FAILED");
    expect(cashoutBody2.failureCode).toBe("INSUFFICIENT_PROVIDER_LIQUIDITY");

    // Verify balance was refunded (still 100 cents)
    const balRes2 = await request(httpServer(app))
      .get("/api/v1/rewards/balance")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(200);

    const balBody2 = balRes2.body as BalanceBody;
    expect(balBody2.balanceCents).toBe(100);

    // 3. Insufficient balance test
    await request(httpServer(app))
      .post("/api/v1/rewards/cashout")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({
        amountCents: 500,
        destinationKey: "valid_pix_key2",
        idempotencyKey: "idem-cashout-3",
      })
      .expect(400);
  });

  it("handles transaction reversals", async () => {
    // 1. Earn reward of 100 cents
    const earnRes = await request(httpServer(app))
      .post("/api/v1/rewards/earn")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({
        userId: userEs,
        packagingId: packagingId2,
        amountCents: 100,
        idempotencyKey: "idem-earn-reversal",
      })
      .expect(201);

    const earnBody = earnRes.body as TransactionBody;
    const transactionId = earnBody.id;

    // 2. Perform reversal
    const reverseRes = await request(httpServer(app))
      .post("/api/v1/rewards/reverse")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({
        originalTransactionId: transactionId,
        idempotencyKey: "idem-reversal-1",
      })
      .expect(201);

    const revBody = reverseRes.body as TransactionBody;
    expect(revBody.type).toBe("REVERSAL");
    expect(revBody.reversalOfId).toBe(transactionId);
    expect(revBody.amountCents).toBe(100);

    // 3. Check balance is back to 0
    const balRes = await request(httpServer(app))
      .get("/api/v1/rewards/balance")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(200);

    const balBody = balRes.body as BalanceBody;
    expect(balBody.balanceCents).toBe(0);

    // 4. Prevent duplicate reversal
    await request(httpServer(app))
      .post("/api/v1/rewards/reverse")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({
        originalTransactionId: transactionId,
        idempotencyKey: "idem-reversal-2",
      })
      .expect(400);
  });
});

async function resetDatabase(database: DatabaseService): Promise<void> {
  await database.client.$transaction([
    database.client.auditLog.deleteMany({}),
    database.client.auditLedger.deleteMany({}),
    database.client.rewardTransaction.deleteMany({}),
    database.client.rewardAccount.deleteMany({}),
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
      {
        countryCodes: ["ES"],
        id: tenantEs,
        name: "Pilot Spain",
        slug: "pilot-es",
      },
    ],
  });

  await database.client.user.createMany({
    data: [
      { email: "es@example.com", externalSubject: "auth0|es", id: userEs },
    ],
  });

  await database.client.tenantMembership.createMany({
    data: [{ role: "OPERATOR", tenantId: tenantEs, userId: userEs }],
  });

  await database.client.packagingBatch.createMany({
    data: [
      {
        id: batchId,
        tenantId: tenantEs,
        code: "BATCH-001",
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
        batchId: batchId,
        serial: "SN-REWARD-1",
        status: "COLLECTED",
        materialCode: "PET",
        expectedWeightGrams: 50.0,
        unitCostCents: 10,
        rewardCents: 15,
        externalQrHash: "qr-ext-1",
        internalQrHash: "qr-int-1",
      },
      {
        id: packagingId2,
        tenantId: tenantEs,
        batchId: batchId,
        serial: "SN-REWARD-2",
        status: "COLLECTED",
        materialCode: "PET",
        expectedWeightGrams: 50.0,
        unitCostCents: 10,
        rewardCents: 15,
        externalQrHash: "qr-ext-2",
        internalQrHash: "qr-int-2",
      },
    ],
  });
}
