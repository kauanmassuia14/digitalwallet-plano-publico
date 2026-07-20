import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { DomainError } from "@digitalwallet/domain";

import { DatabaseService } from "../database/database.service.js";
import type { TenantAwareRequest } from "./tenant-context.js";

const TENANT_HEADER = "x-tenant-id";
const USER_HEADER = "x-user-id";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class TenantContextGuard implements CanActivate {
  public constructor(private readonly database: DatabaseService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantAwareRequest>();
    const rawUserId = request.headers[USER_HEADER];
    const rawTenantId = request.headers[TENANT_HEADER];

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
    const user = await this.database.client.user.findUnique({
      where: { id: userId },
      include: { memberships: true },
    });

    if (user === null) {
      throw new DomainError(
        "TENANT_CONTEXT_INVALID",
        "User context was not found in the database",
      );
    }

    request.user = {
      email: user.email,
      id: user.id,
      memberships: user.memberships.map((m) => ({
        role: m.role,
        tenantId: m.tenantId,
      })),
    };

    if (rawTenantId !== undefined && rawTenantId.length > 0) {
      if (Array.isArray(rawTenantId) || !UUID_PATTERN.test(rawTenantId)) {
        throw new DomainError(
          "TENANT_CONTEXT_INVALID",
          `Header ${TENANT_HEADER} must contain one UUID`,
        );
      }

      const tenantId = rawTenantId.toLowerCase();
      const hasMembership = user.memberships.some(
        (m) => m.tenantId === tenantId,
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
        request.tenantId = user.memberships[0].tenantId;
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
}
