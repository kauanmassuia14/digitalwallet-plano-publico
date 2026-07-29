import {
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DomainError } from "@digitalwallet/domain";

import { DatabaseService } from "../database/database.service.js";
import { AuthTokenService } from "./auth-token.service.js";
import type { TenantAwareRequest } from "./tenant-context.js";
import { IS_PUBLIC_KEY } from "./public.decorator.js";

const TENANT_HEADER = "x-tenant-id";
const USER_HEADER = "x-user-id";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class TenantContextGuard implements CanActivate {
  private activeProvisioningPromise: Promise<void> | null = null;

  public constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthTokenService)
    private readonly authTokenService: AuthTokenService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantAwareRequest>();
    const authHeader = request.headers["authorization"];
    const rawUserId = request.headers[USER_HEADER];
    const rawTenantIdHeader = request.headers[TENANT_HEADER];
    const rawTenantId = Array.isArray(rawTenantIdHeader)
      ? rawTenantIdHeader[0]
      : rawTenantIdHeader;

    let user: any = null;

    if (
      authHeader !== undefined &&
      typeof authHeader === "string" &&
      authHeader.toLowerCase().startsWith("bearer ")
    ) {
      const token = authHeader.substring(7);
      const claims = await this.authTokenService.verifyToken(token);

      user = await this.database.client.user.findUnique({
        where: { externalSubject: claims.sub },
        include: { memberships: true },
      });

      if (user === null) {
        throw new DomainError(
          "TENANT_CONTEXT_INVALID",
          "User context was not found in the database",
        );
      }

      request.user = {
        email: user.email || claims.email || null,
        id: user.id,
        memberships: user.memberships.map((m: any) => ({
          role: m.role,
          tenantId: m.tenantId,
        })),
      };
    } else {
      const isTestOrDev =
        process.env.NODE_ENV === "test" ||
        process.env.NODE_ENV === "development";
      if (!isTestOrDev) {
        throw new DomainError(
          "TENANT_CONTEXT_REQUIRED",
          "Authorization header is required for identity context",
        );
      }

      if (rawUserId === undefined || rawUserId.length === 0) {
        throw new DomainError(
          "TENANT_CONTEXT_REQUIRED",
          `Header ${USER_HEADER} is required for identity context`,
        );
      }

      if (Array.isArray(rawUserId) || !UUID_PATTERN.test(rawUserId)) {
        throw new DomainError(
          "TENANT_CONTEXT_INVALID",
          `Header ${USER_HEADER} must contain one UUID`,
        );
      }

      const userId = rawUserId.toLowerCase();
      user = await this.database.client.user.findUnique({
        where: { id: userId },
        include: { memberships: true },
      });

      if (user === null && process.env.NODE_ENV === "development") {
        await this.provisionDevContext(userId, rawTenantId);
        user = await this.database.client.user.findUnique({
          where: { id: userId },
          include: { memberships: true },
        });
      }

      if (user === null) {
        throw new DomainError(
          "TENANT_CONTEXT_INVALID",
          "User context was not found in the database",
        );
      }

      request.user = {
        email: user.email,
        id: user.id,
        memberships: user.memberships.map((m: any) => ({
          role: m.role,
          tenantId: m.tenantId,
        })),
      };
    }

    if (rawTenantId !== undefined && rawTenantId.length > 0) {
      if (Array.isArray(rawTenantId) || !UUID_PATTERN.test(rawTenantId)) {
        throw new DomainError(
          "TENANT_CONTEXT_INVALID",
          `Header ${TENANT_HEADER} must contain one UUID`,
        );
      }

      const tenantId = rawTenantId.toLowerCase();
      const hasMembership = user.memberships.some(
        (m: any) => m.tenantId === tenantId,
      );

      if (!hasMembership) {
        throw new DomainError(
          "TENANT_CONTEXT_INVALID",
          "User does not belong to the requested tenant context",
        );
      }

      request.tenantId = tenantId;
    } else {
      if (user.memberships.length === 1) {
        request.tenantId = user.memberships[0]!.tenantId;
      } else if (user.memberships.length > 1) {
        throw new DomainError(
          "TENANT_CONTEXT_REQUIRED",
          `Header ${TENANT_HEADER} is required because user has multiple tenant memberships`,
        );
      } else {
        throw new DomainError(
          "TENANT_CONTEXT_REQUIRED",
          `Header ${TENANT_HEADER} is required because user has no tenant memberships`,
        );
      }
    }

    return true;
  }

  private async provisionDevContext(
    userId: string,
    rawTenantId: string | undefined,
  ): Promise<void> {
    if (this.activeProvisioningPromise) {
      await this.activeProvisioningPromise;
      return;
    }

    const run = async () => {
      const tId =
        rawTenantId &&
        typeof rawTenantId === "string" &&
        UUID_PATTERN.test(rawTenantId)
          ? rawTenantId.toLowerCase()
          : "11111111-1111-4111-8111-111111111111";

      const tenantExists = await this.database.client.tenant.findUnique({
        where: { id: tId },
      });
      if (!tenantExists) {
        try {
          await this.database.client.tenant.create({
            data: {
              id: tId,
              name:
                tId === "11111111-1111-4111-8111-111111111111"
                  ? "Pilot Spain"
                  : `Dev Tenant ${tId.substring(0, 8)}`,
              slug:
                tId === "11111111-1111-4111-8111-111111111111"
                  ? "pilot-es"
                  : `dev-tenant-${tId.substring(0, 8)}`,
              countryCodes: ["ES"],
            },
          });
        } catch {
          // Ignore concurrent creation
        }
      }

      const userExists = await this.database.client.user.findUnique({
        where: { id: userId },
      });
      if (!userExists) {
        try {
          await this.database.client.user.create({
            data: {
              id: userId,
              email:
                userId === "b2a647d9-291a-4d2c-80a9-17382dcf1a1e"
                  ? "fabrica@empresa.com"
                  : "dev-user@example.com",
              externalSubject: `auth0|${userId}`,
            },
          });
        } catch {
          // Ignore concurrent creation
        }
      }

      const membershipExists =
        await this.database.client.tenantMembership.findUnique({
          where: {
            tenantId_userId: {
              tenantId: tId,
              userId: userId,
            },
          },
        });
      if (!membershipExists) {
        try {
          await this.database.client.tenantMembership.create({
            data: {
              tenantId: tId,
              userId: userId,
              role: "ADMIN",
            },
          });
        } catch {
          // Ignore concurrent creation
        }
      }
    };

    this.activeProvisioningPromise = run();
    try {
      await this.activeProvisioningPromise;
    } finally {
      this.activeProvisioningPromise = null;
    }
  }
}
