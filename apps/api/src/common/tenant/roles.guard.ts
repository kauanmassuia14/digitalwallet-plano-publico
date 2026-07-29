import {
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { type TenantMembershipRole } from "@digitalwallet/database";

import { ROLES_KEY } from "./roles.decorator.js";
import type { TenantAwareRequest } from "./tenant-context.js";

@Injectable()
export class RolesGuard implements CanActivate {
  public constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      TenantMembershipRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (requiredRoles === undefined || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantAwareRequest>();
    const user = request.user;
    const tenantId = request.tenantId;

    if (user === undefined || tenantId === undefined) {
      throw new BadRequestException(
        "Authentication context (user and tenant) is required for RBAC validation",
      );
    }

    const membership = user.memberships.find((m) => m.tenantId === tenantId);
    if (membership === undefined) {
      throw new ForbiddenException(
        "User is not a member of the active tenant context",
      );
    }

    const hasRole = requiredRoles.includes(membership.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `User does not have the required role(s): ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}
