import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { DatabaseService } from "../src/common/database/database.service.js";
import { RedisService } from "../src/common/redis/redis.service.js";
import { configureApplication } from "../src/configure-application.js";

const tenantEs = "11111111-1111-4111-8111-111111111111";
const tenantPt = "22222222-2222-4222-8222-222222222222";
const userEs = "55555555-5555-4555-8555-555555555555";
const userPt = "66666666-6666-4666-8666-666666666666";

const condoEs = "33333333-3333-4333-8333-333333333333";
const condoEs2 = "33333333-3333-4333-8333-333333333334";
const condoPt = "33333333-3333-4333-8333-333333333335";

const coopEs = "44444444-4444-4444-8444-444444444444";
const coopPt = "44444444-4444-4444-8444-444444444445";

describe("Collection Matchmaking E2E", () => {
  let app: INestApplication;
  let database: DatabaseService;
  let redis: RedisService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    configureApplication(app);
    await app.init();
    database = app.get(DatabaseService);
    redis = app.get(RedisService);

    // Clean up Redis keys for test tenants
    await redis.client.del(`tenant:${tenantEs}:collections:queue`);
    await redis.client.del(`tenant:${tenantPt}:collections:queue`);

    await resetDatabase(database);
    await seedBaseData(database);
  });

  afterEach(async () => {
    await redis.client.del(`tenant:${tenantEs}:collections:queue`);
    await redis.client.del(`tenant:${tenantPt}:collections:queue`);
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

  it("creates a collection request, pushes it to Redis, and completes the workflow", async () => {
    // 1. Create Collection Request
    const createResponse = await request(httpServer(app))
      .post("/api/v1/collections/requests")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({
        condominiumId: condoEs,
        scheduledFor: new Date().toISOString(),
      })
      .expect(201);

    const requestObj = createResponse.body;
    expect(requestObj.id).toBeDefined();
    expect(requestObj.status).toBe("PENDING");
    expect(requestObj.cooperativeId).toBeNull();
    expect(requestObj.condominiumId).toBe(condoEs);

    // Check Redis Queue length
    const queueLen = await redis.client.llen(
      `tenant:${tenantEs}:collections:queue`,
    );
    expect(queueLen).toBe(1);

    // 2. Match with Cooperative
    const matchResponse = await request(httpServer(app))
      .post("/api/v1/collections/match")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({
        cooperativeId: coopEs,
      })
      .expect(200);

    const matchedRequest = matchResponse.body;
    expect(matchedRequest).not.toBeNull();
    expect(matchedRequest.id).toBe(requestObj.id);
    expect(matchedRequest.status).toBe("ASSIGNED");
    expect(matchedRequest.cooperativeId).toBe(coopEs);

    // Check Redis Queue is now empty
    const queueLenAfter = await redis.client.llen(
      `tenant:${tenantEs}:collections:queue`,
    );
    expect(queueLenAfter).toBe(0);

    // 3. Complete the request
    const completeResponse = await request(httpServer(app))
      .post(`/api/v1/collections/requests/${requestObj.id}/complete`)
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(200);

    const completedRequest = completeResponse.body;
    expect(completedRequest.status).toBe("COMPLETED");
    expect(completedRequest.completedAt).not.toBeNull();
  });

  it("handles FIFO queue matching correctly when multiple requests exist", async () => {
    // 1. Create first request
    const resA = await request(httpServer(app))
      .post("/api/v1/collections/requests")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({ condominiumId: condoEs })
      .expect(201);

    // 2. Create second request
    const resB = await request(httpServer(app))
      .post("/api/v1/collections/requests")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({ condominiumId: condoEs2 })
      .expect(201);

    const queueLen = await redis.client.llen(
      `tenant:${tenantEs}:collections:queue`,
    );
    expect(queueLen).toBe(2);

    // 3. First match should return the first request (FIFO order)
    const match1 = await request(httpServer(app))
      .post("/api/v1/collections/match")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({ cooperativeId: coopEs })
      .expect(200);

    expect(match1.body.id).toBe(resA.body.id);
    expect(match1.body.status).toBe("ASSIGNED");

    // 4. Second match should return the second request
    const match2 = await request(httpServer(app))
      .post("/api/v1/collections/match")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({ cooperativeId: coopEs })
      .expect(200);

    expect(match2.body.id).toBe(resB.body.id);
    expect(match2.body.status).toBe("ASSIGNED");

    // 5. Third match should return null (empty queue)
    const match3 = await request(httpServer(app))
      .post("/api/v1/collections/match")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({ cooperativeId: coopEs })
      .expect(200);

    expect(match3.body).toEqual({});
  });

  it("removes from Redis and transitions to CANCELLED on cancellation", async () => {
    // 1. Create Request
    const res = await request(httpServer(app))
      .post("/api/v1/collections/requests")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({ condominiumId: condoEs })
      .expect(201);

    // 2. Cancel Request
    const cancelRes = await request(httpServer(app))
      .post(`/api/v1/collections/requests/${res.body.id}/cancel`)
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .expect(200);

    expect(cancelRes.body.status).toBe("CANCELLED");

    // Queue length should be 0 (removed from Redis)
    const queueLen = await redis.client.llen(
      `tenant:${tenantEs}:collections:queue`,
    );
    expect(queueLen).toBe(0);

    // Match should return null
    const matchRes = await request(httpServer(app))
      .post("/api/v1/collections/match")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({ cooperativeId: coopEs })
      .expect(200);

    expect(matchRes.body).toEqual({});
  });

  it("enforces strict tenant isolation", async () => {
    // 1. PT user tries to request collection for ES condominium -> fails with 404
    await request(httpServer(app))
      .post("/api/v1/collections/requests")
      .set("x-user-id", userPt)
      .set("x-tenant-id", tenantPt)
      .send({ condominiumId: condoEs })
      .expect(404);

    // 2. Create valid ES request and valid PT request
    const esReq = await request(httpServer(app))
      .post("/api/v1/collections/requests")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({ condominiumId: condoEs })
      .expect(201);

    const ptReq = await request(httpServer(app))
      .post("/api/v1/collections/requests")
      .set("x-user-id", userPt)
      .set("x-tenant-id", tenantPt)
      .send({ condominiumId: condoPt })
      .expect(201);

    // 3. PT cooperative match should only return PT request
    const matchPt = await request(httpServer(app))
      .post("/api/v1/collections/match")
      .set("x-user-id", userPt)
      .set("x-tenant-id", tenantPt)
      .send({ cooperativeId: coopPt })
      .expect(200);

    expect(matchPt.body.id).toBe(ptReq.body.id);
    expect(matchPt.body.tenantId).toBe(tenantPt);

    // 4. ES cooperative match should only return ES request
    const matchEs = await request(httpServer(app))
      .post("/api/v1/collections/match")
      .set("x-user-id", userEs)
      .set("x-tenant-id", tenantEs)
      .send({ cooperativeId: coopEs })
      .expect(200);

    expect(matchEs.body.id).toBe(esReq.body.id);
    expect(matchEs.body.tenantId).toBe(tenantEs);
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
      {
        countryCodes: ["ES"],
        id: tenantEs,
        name: "Pilot Spain",
        slug: "pilot-es",
      },
      {
        countryCodes: ["PT"],
        id: tenantPt,
        name: "Pilot Portugal",
        slug: "pilot-pt",
      },
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
      {
        address: "Calle Mayor 1",
        id: condoEs,
        name: "Condominium ES 1",
        slug: "condo-es-1",
        tenantId: tenantEs,
      },
      {
        address: "Calle Mayor 2",
        id: condoEs2,
        name: "Condominium ES 2",
        slug: "condo-es-2",
        tenantId: tenantEs,
      },
      {
        address: "Av da Liberdade 10",
        id: condoPt,
        name: "Condominium PT",
        slug: "condo-pt",
        tenantId: tenantPt,
      },
    ],
  });

  await database.client.cooperative.createMany({
    data: [
      { id: coopEs, name: "Coop ES", slug: "coop-es", tenantId: tenantEs },
      { id: coopPt, name: "Coop PT", slug: "coop-pt", tenantId: tenantPt },
    ],
  });
}
