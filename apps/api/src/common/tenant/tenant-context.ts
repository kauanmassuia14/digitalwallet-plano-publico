import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import { TenantMembershipRole } from "@digitalwallet/database";

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string | null;
  readonly memberships: ReadonlyArray<{
    readonly tenantId: string;
    readonly role: TenantMembershipRole;
  }>;
}

export interface TenantAwareRequest {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  user?: AuthenticatedUser;
  tenantId?: string;
}

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<TenantAwareRequest>();

    if (request.tenantId === undefined) {
      throw new Error("TenantContextGuard must run before CurrentTenant");
    }

    return request.tenantId;
  },
);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<TenantAwareRequest>();

    if (request.user === undefined) {
      throw new Error("TenantContextGuard must run before CurrentUser");
    }

    return request.user;
  },
);
