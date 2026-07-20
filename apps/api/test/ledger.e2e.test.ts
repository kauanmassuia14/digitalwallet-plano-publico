import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { DatabaseService } from "../src/common/database/database.service.js";
import { LedgerService } from "../src/ledger/ledger.service.js";
import { AuditLogService } from "../src/ledger/audit-log.service.js";
import { configureApplication } from "../src/configure-application.js";

const tenantEs = "11111111-1111-4111-8111-111111111111";
const tenantPt = "22222222-2222-4222-8222-222222222222";
const userEs = "55555555-5555-4555-8555-555555555555";
const userPt = "66666666-6666-4666-8666-666666666666";
const condoEs = "33333333-3333-4333-8333-333333333333";
const coopEs = "44444444-4444-4444-8444-444444444444";

function httpServer(app: INestApplication): any {
  return app.getHttpServer();
}

describe("Cryptographic Ledger and Reconciliation E2E", () => {
  let app: INestApplication;
  let database: DatabaseService;
  let ledgerService: LedgerService;
  let auditLogService: AuditLogService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    configureApplication(app);
    await app.init();

    database = app.get(DatabaseService);
    ledgerService = app.get(LedgerService);
    auditLogService = app.get(AuditLogService);

    await resetDatabase(database);
    await seedBaseData(database);
  });

  afterEach(async () => {
    await resetDatabase(database);
    await app.close();
  });

  it("retrieves the ledger public key", async () => {
    const response = await request(httpServer(app))
      .get("/api/v1/ledger/public-key")
      .expect(200);

    expect(response.body.publicKey).toContain("-----BEGIN PUBLIC KEY-----");
  });

  it("appends entries to the ledger, chains them, and validates the healthy chain", async () => {
    const entry1 = await ledgerService.appendEntry({ action: "MINT", serial: "SN-001" });
    expect(entry1.prevHash).toBe("0000000000000000000000000000000000000000000000000000000000000000");
    expect(entry1.rowHash).toBeDefined();

    const entry2 = await ledgerService.appendEntry({ action: "TRANSFER", serial: "SN-001" });
    expect(entry2.prevHash).toBe(entry1.rowHash);

    const validateRes = await request(httpServer(app))
      .get("/api/v1/ledger/validate")
      .expect(200);

    expect(validateRes.body.isValid).toBe(true);
  });

  it("detects chain broken when prevHash is tampered", async () => {
    const entry1 = await ledgerService.appendEntry({ val: 10 });
    const entry2 = await ledgerService.appendEntry({ val: 20 });

    await database.client.auditLedger.update({
      where: { id: entry2.id },
      data: { prevHash: "1111111111111111111111111111111111111111111111111111111111111111" },
    });

    const validateRes = await request(httpServer(app))
      .get("/api/v1/ledger/validate")
      .expect(200);

    expect(validateRes.body.isValid).toBe(false);
    expect(validateRes.body.error).toContain("Chain broken at entry");
  });

  it("creates, AES-encrypts, and decrypts audit logs transparently", async () => {
    const beforeObj = { sensitiveField: "secretValueBefore" };
    const afterObj = { sensitiveField: "secretValueAfter" };

    const rawLog = await auditLogService.createLog({
      tenantId: tenantEs,
      actorType: "USER",
      actorId: userEs,
      action: "UPDATE_RESOURCE",
      resourceType: "TestResource",
      resourceId: "res-123",
      requestId: "req-123",
      correlationId: "corr-123",
      before: beforeObj,
      after: afterObj,
    });

    // 1. Verify in the database it is encrypted (stores iv, content, tag)
    const dbRecord = await database.client.auditLog.findUnique({
      where: { id: rawLog.id },
    });

    expect(dbRecord?.before).toHaveProperty("iv");
    expect(dbRecord?.before).toHaveProperty("content");
    expect(dbRecord?.before).toHaveProperty("tag");

    // 2. Retrieve via the endpoint and check it is automatically decrypted
    const response = await request(httpServer(app))
      .get("/api/v1/ledger/audit-logs")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(200);

    const logItem = response.body.find((l: any) => l.id === rawLog.id);
    expect(logItem).toBeDefined();
    expect(logItem.before).toEqual(beforeObj);
    expect(logItem.after).toEqual(afterObj);
  });

  it("reconciles physical collection data against cryptographic ledger entries", async () => {
    // 1. Create a collection request
    const createRes = await request(httpServer(app))
      .post("/api/v1/collections/requests")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({ condominiumId: condoEs })
      .expect(201);

    const requestId = createRes.body.id;

    // 2. Match request to cooperative
    await request(httpServer(app))
      .post("/api/v1/collections/match")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({ cooperativeId: coopEs })
      .expect(200);

    // 3. Complete request (triggers audit log + cryptographic ledger entry)
    await request(httpServer(app))
      .post(`/api/v1/collections/requests/${requestId}/complete`)
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(200);

    // 4. Run reconciliation - should succeed with 0 discrepancies
    const reconcileRes1 = await request(httpServer(app))
      .post("/api/v1/ledger/reconcile")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(201);

    expect(reconcileRes1.body.reconciledCount).toBe(1);
    expect(reconcileRes1.body.discrepancyCount).toBe(0);

    // 5. Tamper with the ledger payload (change condominiumId in ledger payload)
    const ledgerEntry = await database.client.auditLedger.findFirst({
      where: {
        payload: {
          path: ["requestId"],
          equals: requestId,
        },
      },
    });

    expect(ledgerEntry).toBeDefined();
    const tamperedPayload = { ...(ledgerEntry!.payload as any), condominiumId: "wrong-condo-id" };
    
    // Recalculate rowHash for the tampered payload so it matches, but details mismatch
    const tamperedRowHash = ledgerService.calculateRowHash(ledgerEntry!.prevHash, tamperedPayload);

    await database.client.auditLedger.update({
      where: { id: ledgerEntry!.id },
      data: {
        payload: tamperedPayload,
        rowHash: tamperedRowHash,
      },
    });

    // 6. Run reconciliation again - should report discrepancy
    const reconcileRes2 = await request(httpServer(app))
      .post("/api/v1/ledger/reconcile")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(201);

    expect(reconcileRes2.body.reconciledCount).toBe(0);
    expect(reconcileRes2.body.discrepancyCount).toBe(1);
    expect(reconcileRes2.body.discrepancies[0].reason).toContain("Discrepancy in collection participants");
  });
});

async function resetDatabase(database: DatabaseService): Promise<void> {
  await database.client.$transaction([
    database.client.auditLog.deleteMany({}),
    database.client.auditLedger.deleteMany({}),
    database.client.collectionRequest.deleteMany({}),
    database.client.condominium.deleteMany({}),
    database.client.cooperative.deleteMany({}),
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

  await database.client.condominium.createMany({
    data: [
      { address: "Calle Mayor 1", id: condoEs, name: "Condominium ES 1", slug: "condo-es-1", tenantId: tenantEs },
    ],
  });

  await database.client.cooperative.createMany({
    data: [
      { id: coopEs, name: "Coop ES", slug: "coop-es", tenantId: tenantEs },
    ],
  });
}
