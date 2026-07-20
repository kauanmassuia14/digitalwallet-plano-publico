import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { createHash } from "node:crypto";
import { Server } from "node:http";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { DatabaseService } from "../src/common/database/database.service.js";
import { configureApplication } from "../src/configure-application.js";

const tenantEs = "11111111-1111-4111-8111-111111111111";
const tenantPt = "22222222-2222-4222-8222-222222222222";
const batchEs = "33333333-3333-4333-8333-333333333333";
const batchPt = "44444444-4444-4444-8444-444444444444";

interface PackagingResponse {
  readonly expectedWeightGrams: number;
  readonly id: string;
  readonly rewardCents: number;
  readonly serial: string;
  readonly status: string;
  readonly tenantId: string;
  readonly version: number;
}

interface ErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

describe("DigitalWallet API", () => {
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
    await seedTenantsAndBatches(database);
  });

  afterEach(async () => {
    await resetDatabase(database);
    await app.close();
  });

  it("serves versioned health without a tenant context", async () => {
    const response = await request(httpServer(app))
      .get("/api/v1/health")
      .expect(200);

    expect(response.body).toEqual({
      service: "digitalwallet-api",
      status: "ok",
    });
  });

  it("reports database readiness without a tenant context", async () => {
    const response = await request(httpServer(app))
      .get("/api/v1/health/ready")
      .expect(200);

    expect(response.body).toEqual({
      checks: { database: "ok", process: "ok" },
      status: "ready",
    });
  });

  it("requires a valid local tenant context for domain endpoints", async () => {
    const missing = await request(httpServer(app))
      .post("/api/v1/packaging")
      .send(packagingPayload(tenantEs, "ES-001"))
      .expect(400);
    const invalid = await request(httpServer(app))
      .post("/api/v1/packaging")
      .set("x-tenant-id", "not-a-uuid")
      .send(packagingPayload(tenantEs, "ES-001"))
      .expect(400);

    expect((missing.body as ErrorResponse).error.code).toBe(
      "TENANT_CONTEXT_REQUIRED",
    );
    expect((invalid.body as ErrorResponse).error.code).toBe(
      "TENANT_CONTEXT_INVALID",
    );
  });

  it("isolates packaging lookup by tenant without disclosing existence", async () => {
    const created = await createPackaging(app, tenantEs, "ES-001");

    await request(httpServer(app))
      .get(`/api/v1/packaging/${created.id}`)
      .set("x-tenant-id", tenantPt)
      .expect(404);

    const visible = await request(httpServer(app))
      .get(`/api/v1/packaging/${created.id}`)
      .set("x-tenant-id", tenantEs)
      .expect(200);

    expect((visible.body as PackagingResponse).tenantId).toBe(tenantEs);
  });

  it("enforces serial uniqueness inside a tenant only", async () => {
    await createPackaging(app, tenantEs, "SHARED-001");

    const duplicate = await request(httpServer(app))
      .post("/api/v1/packaging")
      .set("x-tenant-id", tenantEs)
      .send(packagingPayload(tenantEs, "SHARED-001"))
      .expect(409);

    expect((duplicate.body as ErrorResponse).error.code).toBe(
      "PACKAGING_SERIAL_ALREADY_EXISTS",
    );
    await createPackaging(app, tenantPt, "SHARED-001");
  });

  it("rejects a batch that belongs to another tenant", async () => {
    const response = await request(httpServer(app))
      .post("/api/v1/packaging")
      .set("x-tenant-id", tenantEs)
      .send({
        ...packagingPayload(tenantEs, "CROSS-TENANT-BATCH"),
        batchId: batchPt,
      })
      .expect(422);

    expect((response.body as ErrorResponse).error.code).toBe(
      "PACKAGING_SCOPE_INVALID",
    );
  });

  it("applies the lifecycle and rejects an out-of-tolerance collection", async () => {
    const created = await createPackaging(app, tenantEs, "ES-LIFECYCLE");
    const circulation = await transition(app, tenantEs, created.id, {
      occurredAt: "2099-07-15T12:01:00.000Z",
      targetStatus: "IN_CIRCULATION",
    });

    expect(circulation).toMatchObject({
      status: "IN_CIRCULATION",
      version: 1,
    });

    const rejected = await request(httpServer(app))
      .post(`/api/v1/packaging/${created.id}/transitions`)
      .set("x-tenant-id", tenantEs)
      .send({
        actualWeightGrams: 526,
        occurredAt: "2099-07-15T12:02:00.000Z",
        targetStatus: "COLLECTED",
      })
      .expect(422);

    expect((rejected.body as ErrorResponse).error.code).toBe(
      "WEIGHT_OUT_OF_TOLERANCE",
    );

    const collected = await transition(app, tenantEs, created.id, {
      actualWeightGrams: 525,
      occurredAt: "2099-07-15T12:02:00.000Z",
      targetStatus: "COLLECTED",
    });
    const recycled = await transition(app, tenantEs, created.id, {
      occurredAt: "2099-07-15T12:03:00.000Z",
      targetStatus: "RECYCLED",
    });

    expect(collected.status).toBe("COLLECTED");
    expect(recycled).toMatchObject({ status: "RECYCLED", version: 3 });
  });

  it("rejects properties outside the versioned input contract", async () => {
    const response = await request(httpServer(app))
      .post("/api/v1/packaging")
      .set("x-tenant-id", tenantEs)
      .send({
        ...packagingPayload(tenantEs, "ES-EXTRA"),
        tenantId: tenantPt,
      })
      .expect(400);

    expect((response.body as ErrorResponse).error.code).toBe("HTTP_400");
  });

  it("allows only one winner for concurrent state transitions", async () => {
    const created = await createPackaging(app, tenantEs, "ES-CONCURRENT");
    const command = {
      occurredAt: "2099-07-15T12:01:00.000Z",
      targetStatus: "IN_CIRCULATION",
    };

    const responses = await Promise.all([
      request(httpServer(app))
        .post(`/api/v1/packaging/${created.id}/transitions`)
        .set("x-tenant-id", tenantEs)
        .send(command),
      request(httpServer(app))
        .post(`/api/v1/packaging/${created.id}/transitions`)
        .set("x-tenant-id", tenantEs)
        .send(command),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);

    const persisted = await request(httpServer(app))
      .get(`/api/v1/packaging/${created.id}`)
      .set("x-tenant-id", tenantEs)
      .expect(200);
    expect(persisted.body as PackagingResponse).toMatchObject({
      status: "IN_CIRCULATION",
      version: 1,
    });
  });
});

async function createPackaging(
  app: INestApplication,
  tenantId: string,
  serial: string,
): Promise<PackagingResponse> {
  const response = await request(httpServer(app))
    .post("/api/v1/packaging")
    .set("x-tenant-id", tenantId)
    .send(packagingPayload(tenantId, serial))
    .expect(201);

  return response.body as PackagingResponse;
}

async function transition(
  app: INestApplication,
  tenantId: string,
  packagingId: string,
  body: Readonly<Record<string, unknown>>,
): Promise<PackagingResponse> {
  const response = await request(httpServer(app))
    .post(`/api/v1/packaging/${packagingId}/transitions`)
    .set("x-tenant-id", tenantId)
    .send(body)
    .expect(200);

  return response.body as PackagingResponse;
}

function httpServer(app: INestApplication): Server {
  const candidate: unknown = app.getHttpServer();

  if (!(candidate instanceof Server)) {
    throw new TypeError("Nest did not expose a Node HTTP server");
  }

  // Nest exposes this boundary as `any`; instanceof verifies the runtime shape.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return candidate;
}

function packagingPayload(
  tenantId: string,
  serial: string,
): Readonly<Record<string, unknown>> {
  function digest(surface: "external" | "internal"): string {
    return createHash("sha256")
      .update(`${tenantId}:${serial}:${surface}`)
      .digest("hex");
  }

  return {
    batchId: tenantId === tenantPt ? batchPt : batchEs,
    expectedWeightGrams: 500,
    externalQrHash: digest("external"),
    internalQrHash: digest("internal"),
    materialCode: "PET",
    rewardCents: 75,
    serial,
    unitCostCents: 62,
  };
}

async function resetDatabase(database: DatabaseService): Promise<void> {
  await database.client.$transaction([
    database.client.packaging.deleteMany({
      where: { tenantId: { in: [tenantEs, tenantPt] } },
    }),
    database.client.packagingBatch.deleteMany({
      where: { tenantId: { in: [tenantEs, tenantPt] } },
    }),
    database.client.tenant.deleteMany({
      where: { id: { in: [tenantEs, tenantPt] } },
    }),
  ]);
}

async function seedTenantsAndBatches(
  database: DatabaseService,
): Promise<void> {
  await database.client.tenant.createMany({
    data: [
      { countryCodes: ["ES"], id: tenantEs, name: "Pilot Spain", slug: "pilot-es" },
      { countryCodes: ["PT"], id: tenantPt, name: "Pilot Portugal", slug: "pilot-pt" },
    ],
  });
  await database.client.packagingBatch.createMany({
    data: [
      {
        code: "ES-TEST-001",
        countryCode: "ES",
        currencyCode: "EUR",
        id: batchEs,
        tenantId: tenantEs,
      },
      {
        code: "PT-TEST-001",
        countryCode: "PT",
        currencyCode: "EUR",
        id: batchPt,
        tenantId: tenantPt,
      },
    ],
  });
}
