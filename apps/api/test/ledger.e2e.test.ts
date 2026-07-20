import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as crypto from "node:crypto";

import { AppModule } from "../src/app.module.js";
import { DatabaseService } from "../src/common/database/database.service.js";
import { LedgerService } from "../src/ledger/ledger.service.js";
import { configureApplication } from "../src/configure-application.js";

function httpServer(app: INestApplication): any {
  return app.getHttpServer();
}

describe("Cryptographic Ledger E2E", () => {
  let app: INestApplication;
  let database: DatabaseService;
  let ledgerService: LedgerService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    configureApplication(app);
    await app.init();

    database = app.get(DatabaseService);
    ledgerService = app.get(LedgerService);

    // Clear ledger before test
    await database.client.auditLedger.deleteMany({});
  });

  afterEach(async () => {
    await database.client.auditLedger.deleteMany({});
    await app.close();
  });

  it("retrieves the ledger public key", async () => {
    const response = await request(httpServer(app))
      .get("/api/v1/ledger/public-key")
      .expect(200);

    expect(response.body.publicKey).toContain("-----BEGIN PUBLIC KEY-----");
  });

  it("appends entries to the ledger, chains them, and validates the healthy chain", async () => {
    // 1. Append first entry
    const entry1 = await ledgerService.appendEntry({ action: "MINT", serial: "SN-001" });
    expect(entry1.prevHash).toBe("0000000000000000000000000000000000000000000000000000000000000000");
    expect(entry1.rowHash).toBeDefined();
    expect(entry1.signature).toBeDefined();

    // 2. Append second entry
    const entry2 = await ledgerService.appendEntry({ action: "TRANSFER", serial: "SN-001" });
    expect(entry2.prevHash).toBe(entry1.rowHash);
    expect(entry2.rowHash).toBeDefined();

    // 3. Append third entry
    const entry3 = await ledgerService.appendEntry({ action: "RECYCLE", serial: "SN-001" });
    expect(entry3.prevHash).toBe(entry2.rowHash);

    // 4. Validate the healthy chain via HTTP API
    const validateRes = await request(httpServer(app))
      .get("/api/v1/ledger/validate")
      .expect(200);

    expect(validateRes.body.isValid).toBe(true);
  });

  it("detects chain broken when prevHash is tampered", async () => {
    const entry1 = await ledgerService.appendEntry({ val: 10 });
    const entry2 = await ledgerService.appendEntry({ val: 20 });

    // Tamper with the prevHash of the second entry in the DB directly
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

  it("detects hash mismatch when payload is tampered", async () => {
    const entry1 = await ledgerService.appendEntry({ data: "original payload" });

    // Tamper with the payload directly in the DB
    await database.client.auditLedger.update({
      where: { id: entry1.id },
      data: { payload: { data: "tampered payload" } },
    });

    const validateRes = await request(httpServer(app))
      .get("/api/v1/ledger/validate")
      .expect(200);

    expect(validateRes.body.isValid).toBe(false);
    expect(validateRes.body.error).toContain("Hash mismatch at entry");
  });

  it("detects signature invalidity when signature is tampered", async () => {
    const entry1 = await ledgerService.appendEntry({ data: "some data" });

    // Tamper with the signature
    await database.client.auditLedger.update({
      where: { id: entry1.id },
      data: { signature: "invalid-signature-value" },
    });

    const validateRes = await request(httpServer(app))
      .get("/api/v1/ledger/validate")
      .expect(200);

    expect(validateRes.body.isValid).toBe(false);
    expect(validateRes.body.error).toContain("Invalid signature at entry");
  });
});
