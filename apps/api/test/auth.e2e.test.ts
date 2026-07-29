import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as jose from "jose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";

import { AppModule } from "../src/app.module.js";
import { DatabaseService } from "../src/common/database/database.service.js";
import { configureApplication } from "../src/configure-application.js";
import { TenantContextGuard } from "../src/common/tenant/tenant-context.guard.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const externalSubject = "auth0|some-test-user";
const userEmail = "testuser@example.com";
const testSecret = "local-test-secret-must-be-long-enough-32bytes";

@Controller("test-auth")
@UseGuards(TenantContextGuard)
class TestAuthController {
  @Post("secure")
  @HttpCode(HttpStatus.OK)
  public secureEndpoint() {
    return { success: true };
  }
}

describe("JWT Authentication & Tenancy E2E", () => {
  let app: INestApplication;
  let database: DatabaseService;

  const generateToken = async (
    sub: string,
    email: string,
    secretStr: string,
    expiresIn = "1h",
  ): Promise<string> => {
    const secret = new TextEncoder().encode(secretStr);
    return new jose.SignJWT({ email })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secret);
  };

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestAuthController],
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

  it("authenticates successfully with a valid signed JWT", async () => {
    const token = await generateToken(externalSubject, userEmail, testSecret);

    const res = await request(app.getHttpServer())
      .post("/api/v1/test-auth/secure")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", tenantId)
      .expect(HttpStatus.OK);

    expect(res.body).toEqual({ success: true });
  });

  it("rejects when JWT signature is invalid", async () => {
    const token = await generateToken(
      externalSubject,
      userEmail,
      "wrong-secret-longer-than-32-characters-12345",
    );

    const res = await request(app.getHttpServer())
      .post("/api/v1/test-auth/secure")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", tenantId)
      .expect(HttpStatus.UNAUTHORIZED);

    expect(res.body.error?.message).toContain("Invalid token");
  });

  it("rejects when JWT is expired", async () => {
    const token = await generateToken(
      externalSubject,
      userEmail,
      testSecret,
      "-1s",
    );

    const res = await request(app.getHttpServer())
      .post("/api/v1/test-auth/secure")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", tenantId)
      .expect(HttpStatus.UNAUTHORIZED);

    expect(res.body.error?.message).toContain("timestamp check failed");
  });

  it("rejects when user does not exist in local database", async () => {
    const token = await generateToken(
      "auth0|non-existent-user",
      "random@example.com",
      testSecret,
    );

    const res = await request(app.getHttpServer())
      .post("/api/v1/test-auth/secure")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", tenantId)
      .expect(HttpStatus.BAD_REQUEST);

    expect(res.body.error?.message).toContain("User context was not found");
  });

  it("rejects legacy headers in non-dev/non-test environment when Authorization header is missing", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";

      const res = await request(app.getHttpServer())
        .post("/api/v1/test-auth/secure")
        .set("x-user-id", userId)
        .set("x-tenant-id", tenantId)
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.error?.message).toContain(
        "Authorization header is required",
      );
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});

async function resetDatabase(database: DatabaseService): Promise<void> {
  await database.client.$transaction([
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
      name: "Test Tenant Auth",
      slug: "test-tenant-auth",
    },
  });

  await database.client.user.create({
    data: {
      id: userId,
      email: userEmail,
      externalSubject,
    },
  });

  await database.client.tenantMembership.create({
    data: {
      tenantId,
      userId,
      role: "ADMIN",
    },
  });
}
