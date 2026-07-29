import { Global, Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthTokenService } from "./auth-token.service.js";
import { TenantContextGuard } from "./tenant-context.guard.js";
import { RolesGuard } from "./roles.guard.js";

@Global()
@Module({
  providers: [AuthTokenService, TenantContextGuard, RolesGuard, Reflector],
  exports: [AuthTokenService, TenantContextGuard, RolesGuard],
})
export class AuthModule {}
