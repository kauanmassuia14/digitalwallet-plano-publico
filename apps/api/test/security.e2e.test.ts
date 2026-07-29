import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { TenantMembershipRole } from "@digitalwallet/database";

import { AppModule } from "../src/app.module.js";
import { DatabaseService } from "../src/common/database/database.service.js";
import { configureApplication } from "../src/configure-application.js";
import { Roles } from "../src/common/tenant/roles.decorator.js";
import { Audit } from "../src/common/tenant/audit.decorator.js";
import { TenantContextGuard } from "../src/common/tenant/tenant-context.guard.js";
import { RolesGuard } from "../src/common/tenant/roles.guard.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const adminUser = "22222222-2222-4222-8222-222222222222";
const operatorUser = "33333333-3333-4333-8333-333333333333";
const otherUser = "44444444-4444-4444-8444-444444444444";

@Controller("test-security")
@UseGuards(TenantContextGuard, RolesGuard)
class TestSecurityController {
  private callCount = 0;

  @Post("admin-only")
  @Roles(TenantMembershipRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  public adminOnly() {
    return { ok: true };
  }

  @Post("operator-only")
  @Roles(TenantMembershipRole.OPERATOR)
  @HttpCode(HttpStatus.OK)
  public operatorOnly() {
    return { ok: true };
  }

  @Post("audit-me")
  @Audit({ action: "TEST_ACTION", resourceType: "TEST_RESOURCE" })
  @HttpCode(HttpStatus.OK)
  public auditMe(@Body() body: { id: string }) {
    return { id: body.id, status: "created" };
  }

  @Post("idempotent")
  @HttpCode(HttpStatus.OK)
  public idempotent(@Body() body: { count: number }) {
    this.callCount += 1;
    return { result: body.count + 10, calls: this.callCount };
  }
}

describe("Security Controls E2E (RBAC, Idempotency, Audit)", () => {
  let app: INestApplication;
  let database: DatabaseService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestSecurityController],
    }).compile();

    app = testingModule.createNestApplication();
    configureApplication(app);
    await app.init();

    database = app.get(DatabaseService);
    await resetDatabase(database);
    await seedDatabase(database);
  });

  afterEach(async () => {
    await resetDatabase(database);
    await app.close();
  });

  describe("RBAC (RolesGuard)", () => {
    it("allows ADMIN user to access admin-only resource", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/test-security/admin-only")
        .set("x-user-id", adminUser)
        .set("x-tenant-id", tenantId)
        .expect(HttpStatus.OK);

      expect(res.body).toEqual({ ok: true });
    });

    it("rejects OPERATOR user from accessing admin-only resource", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/test-security/admin-only")
        .set("x-user-id", operatorUser)
        .set("x-tenant-id", tenantId)
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.error?.message).toContain("required role");
    });

    it("allows OPERATOR user to access operator-only resource", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/test-security/operator-only")
        .set("x-user-id", operatorUser)
        .set("x-tenant-id", tenantId)
        .expect(HttpStatus.OK);

      expect(res.body).toEqual({ ok: true });
    });

    it("rejects user who does not belong to the active tenant", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/test-security/admin-only")
        .set("x-user-id", otherUser)
        .set("x-tenant-id", tenantId)
        .expect(HttpStatus.BAD_REQUEST); // Tenant guard checks membership

      expect(res.body.error?.message).toContain(
        "belong to the requested tenant",
      );
    });
  });

  describe("Idempotency (IdempotencyInterceptor)", () => {
    it("returns cached response and avoids multiple invocations on duplicate key", async () => {
      const idempotencyKey = "idemp-key-test-123";

      // First request
      const res1 = await request(app.getHttpServer())
        .post("/api/v1/test-security/idempotent")
        .set("x-user-id", adminUser)
        .set("x-tenant-id", tenantId)
        .set("x-idempotency-key", idempotencyKey)
        .send({ count: 5 })
        .expect(HttpStatus.OK);

      expect(res1.body).toEqual({ result: 15, calls: 1 });

      // Second request with same key
      const res2 = await request(app.getHttpServer())
        .post("/api/v1/test-security/idempotent")
        .set("x-user-id", adminUser)
        .set("x-tenant-id", tenantId)
        .set("x-idempotency-key", idempotencyKey)
        .send({ count: 5 })
        .expect(HttpStatus.OK);

      // result and calls should be cached from first execution
      expect(res2.body).toEqual({ result: 15, calls: 1 });
    });
  });

  describe("Audit Log (AuditInterceptor)", () => {
    it("creates an audit log entry on successful audited request", async () => {
      const resourceId = "resource-uuid-456";

      await request(app.getHttpServer())
        .post("/api/v1/test-security/audit-me")
        .set("x-user-id", adminUser)
        .set("x-tenant-id", tenantId)
        .send({ id: resourceId })
        .expect(HttpStatus.OK);

      // Verify log was persisted
      const logs = await database.client.auditLog.findMany({
        where: { tenantId, action: "TEST_ACTION" },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]?.actorId).toBe(adminUser);
      expect(logs[0]?.resourceType).toBe("TEST_RESOURCE");
      expect(logs[0]?.resourceId).toBe(resourceId);
      expect(logs[0]?.after).toEqual({ id: resourceId, status: "created" });
    });
  });
});

async function resetDatabase(database: DatabaseService): Promise<void> {
  await database.client.$transaction([
    database.client.idempotencyRecord.deleteMany(),
    database.client.auditLog.deleteMany(),
    database.client.collectionRequest.deleteMany(),
    database.client.condominium.deleteMany(),
    database.client.cooperative.deleteMany(),
    database.client.tenantMembership.deleteMany(),
    database.client.user.deleteMany(),
    database.client.tenant.deleteMany(),
  ]);
}

async function seedDatabase(database: DatabaseService): Promise<void> {
  await database.client.tenant.create({
    data: {
      id: tenantId,
      name: "Test Tenant",
      slug: "test-tenant",
    },
  });

  await database.client.user.createMany({
    data: [
      {
        id: adminUser,
        email: "admin@test.com",
        externalSubject: "auth0|admin",
      },
      {
        id: operatorUser,
        email: "operator@test.com",
        externalSubject: "auth0|operator",
      },
      {
        id: otherUser,
        email: "other@test.com",
        externalSubject: "auth0|other",
      },
    ],
  });

  await database.client.tenantMembership.createMany({
    data: [
      { tenantId, userId: adminUser, role: "ADMIN" },
      { tenantId, userId: operatorUser, role: "OPERATOR" },
    ],
  });
}
