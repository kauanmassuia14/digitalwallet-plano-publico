import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export interface TenantAwareRequest {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
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
