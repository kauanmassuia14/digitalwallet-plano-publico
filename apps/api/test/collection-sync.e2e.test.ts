import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { Server } from "node:http";
import * as crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { DatabaseService } from "../src/common/database/database.service.js";
import { configureApplication } from "../src/configure-application.js";

const tenantEs = "11111111-1111-4111-8111-111111111111";
const userEs = "55555555-5555-4555-8555-555555555555";
const consumerId = "99999999-9999-4999-8999-999999999999";
const batchId = "22222222-2222-4222-8222-222222222222";
const coopId = "77777777-7777-4777-8777-777777777777";

describe("Collection Offline Sync E2E", () => {
  let app: INestApplication;
  let database: DatabaseService;
  let privateKey: string;
  let publicKey: string;

  beforeEach(async () => {
    // 1. Generate RSA key pair for testing signature
    const keyPair = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "pkcs1", format: "pem" },
      privateKeyEncoding: { type: "pkcs1", format: "pem" },
    });
    privateKey = keyPair.privateKey;
    publicKey = keyPair.publicKey;

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    configureApplication(app);
    await app.init();
    database = app.get(DatabaseService);

    await resetDatabase(database);
    await seedBaseData(database, publicKey);
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

  it("successfully synchronizes offline scans using signed payload and credits consumer", async () => {
    const pkgId1 = "33333333-3333-4333-8333-333333333331";
    const pkgId2 = "33333333-3333-4333-8333-333333333332";

    // 1. Insert packages as IN_CIRCULATION
    await database.client.packaging.createMany({
      data: [
        {
          id: pkgId1,
          tenantId: tenantEs,
          batchId,
          serial: "SN-OFFLINE-1",
          status: "IN_CIRCULATION",
          materialCode: "PET",
          expectedWeightGrams: 100,
          rewardCents: 10,
          unitCostCents: 2,
          externalQrHash:
            "a0f30c6a51d9e2fb42a691456d95319cf83a21644784a0d957d54407b46187cc",
          internalQrHash:
            "c0f30c6a51d9e2fb42a691456d95319cf83a21644784a0d957d54407b46187cc",
        },
        {
          id: pkgId2,
          tenantId: tenantEs,
          batchId,
          serial: "SN-OFFLINE-2",
          status: "MINTED", // Testing auto IN_CIRCULATION transition
          materialCode: "PET",
          expectedWeightGrams: 100,
          rewardCents: 20,
          unitCostCents: 2,
          externalQrHash:
            "b0f30c6a51d9e2fb42a691456d95319cf83a21644784a0d957d54407b46187cc",
          internalQrHash:
            "d0f30c6a51d9e2fb42a691456d95319cf83a21644784a0d957d54407b46187cc",
        },
      ],
    });

    const collectedAt1 = new Date(Date.now() + 10000).toISOString();
    const collectedAt2 = new Date(Date.now() + 20000).toISOString();

    const scans = [
      {
        packagingId: pkgId1,
        externalQrHash:
          "a0f30c6a51d9e2fb42a691456d95319cf83a21644784a0d957d54407b46187cc",
        actualWeightGrams: 100.5,
        consumerUserId: consumerId,
        collectedAt: collectedAt1,
      },
      {
        packagingId: pkgId2,
        externalQrHash:
          "b0f30c6a51d9e2fb42a691456d95319cf83a21644784a0d957d54407b46187cc",
        actualWeightGrams: 99.8,
        consumerUserId: consumerId,
        collectedAt: collectedAt2,
      },
    ];

    // 2. Sign the message
    const message = JSON.stringify(scans);
    const signer = crypto.createSign("SHA256");
    signer.update(message);
    const signature = signer.sign(privateKey, "base64");

    // 3. Post to endpoint
    const response = await request(httpServer(app))
      .post("/api/v1/collections/sync")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({
        cooperativeId: coopId,
        operatorUserId: userEs,
        scans,
        signature,
      })
      .expect(200);

    expect(response.body.successCount).toBe(2);
    expect(response.body.failedScans).toHaveLength(0);

    // 4. Verify packaging statuses transitioned to COLLECTED
    const pkg1 = await database.client.packaging.findUnique({
      where: { id: pkgId1 },
    });
    expect(pkg1?.status).toBe("COLLECTED");
    expect(pkg1?.cooperativeId).toBe(coopId);

    const pkg2 = await database.client.packaging.findUnique({
      where: { id: pkgId2 },
    });
    expect(pkg2?.status).toBe("COLLECTED");
    expect(pkg2?.cooperativeId).toBe(coopId);

    // 5. Verify rewards were credited (10 + 20 = 30 cents)
    const rewardAccount = await database.client.rewardAccount.findFirst({
      where: { userId: consumerId, tenantId: tenantEs },
    });
    expect(Number(rewardAccount?.balanceCents)).toBe(30);

    // 6. Verify Idempotency (resubmitting same payload succeeds and does not double-credit)
    const responseIdempotent = await request(httpServer(app))
      .post("/api/v1/collections/sync")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({
        cooperativeId: coopId,
        operatorUserId: userEs,
        scans,
        signature,
      })
      .expect(200);

    expect(responseIdempotent.body.successCount).toBe(2);

    const rewardAccountAfter = await database.client.rewardAccount.findFirst({
      where: { userId: consumerId, tenantId: tenantEs },
    });
    expect(Number(rewardAccountAfter?.balanceCents)).toBe(30); // Unchanged!
  });

  it("fails if signature is invalid", async () => {
    const scans = [
      {
        packagingId: "33333333-3333-4333-8333-333333333331",
        externalQrHash: "hash-ext-offline-1",
        actualWeightGrams: 100.5,
        consumerUserId: consumerId,
        collectedAt: "2026-07-23T10:00:00.000Z",
      },
    ];

    await request(httpServer(app))
      .post("/api/v1/collections/sync")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({
        cooperativeId: coopId,
        operatorUserId: userEs,
        scans,
        signature: "invalid-signature-base64",
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
    database.client.collectionRequest.deleteMany({}),
    database.client.condominium.deleteMany({}),
    database.client.cooperative.deleteMany({}),
    database.client.tenantMembership.deleteMany({}),
    database.client.user.deleteMany({}),
    database.client.tenant.deleteMany({}),
  ]);
}

async function seedBaseData(
  database: DatabaseService,
  opPublicKey: string,
): Promise<void> {
  await database.client.tenant.create({
    data: {
      countryCodes: ["ES"],
      id: tenantEs,
      name: "Pilot Spain",
      slug: "pilot-es",
    },
  });
  await database.client.user.createMany({
    data: [
      {
        email: "es@example.com",
        externalSubject: "auth0|es",
        id: userEs,
        publicKey: opPublicKey,
      },
      {
        email: "consumer@example.com",
        externalSubject: "auth0|consumer",
        id: consumerId,
      },
    ],
  });
  await database.client.tenantMembership.create({
    data: { role: "OPERATOR", tenantId: tenantEs, userId: userEs },
  });
  await database.client.cooperative.create({
    data: {
      id: coopId,
      tenantId: tenantEs,
      name: "Coop Spain",
      slug: "coop-es",
    },
  });
  await database.client.packagingBatch.create({
    data: {
      id: batchId,
      tenantId: tenantEs,
      code: "BATCH-SYNC-01",
      countryCode: "ES",
      currencyCode: "EUR",
      status: "VALIDATED",
    },
  });
}
