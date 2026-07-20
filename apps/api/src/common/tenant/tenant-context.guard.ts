import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { DomainError } from "@digitalwallet/domain";

import type { TenantAwareRequest } from "./tenant-context.js";

const TENANT_HEADER = "x-tenant-id";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class TenantContextGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantAwareRequest>();
    const rawTenantId = request.headers[TENANT_HEADER];

    if (rawTenantId === undefined || rawTenantId.length === 0) {
      throw new DomainError(
        "TENANT_CONTEXT_REQUIRED",
        `Header ${TENANT_HEADER} is required`,
      );
    }

    if (Array.isArray(rawTenantId) || !UUID_PATTERN.test(rawTenantId)) {
      throw new DomainError(
        "TENANT_CONTEXT_INVALID",
        `Header ${TENANT_HEADER} must contain one UUID`,
      );
    }

    request.tenantId = rawTenantId.toLowerCase();
    return true;
  }
}
