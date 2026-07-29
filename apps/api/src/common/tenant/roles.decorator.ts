import { SetMetadata } from "@nestjs/common";
import { type TenantMembershipRole } from "@digitalwallet/database";

export const ROLES_KEY = "roles";
export const Roles = (...roles: TenantMembershipRole[]) =>
  SetMetadata(ROLES_KEY, roles);
