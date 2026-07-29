import {
  Inject,
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { type Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { randomUUID } from "node:crypto";
import { AuditActorType } from "@digitalwallet/database";

import { DatabaseService } from "../database/database.service.js";
import { AUDIT_KEY, type AuditOptions } from "./audit.decorator.js";
import type { TenantAwareRequest } from "./tenant-context.js";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  public constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const options = this.reflector.getAllAndOverride<AuditOptions | undefined>(
      AUDIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (options === undefined) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<
      TenantAwareRequest & {
        method?: string;
        url?: string;
        params?: Record<string, string>;
        body?: any;
      }
    >();

    return next.handle().pipe(
      tap((responseBody) => {
        // Only log successful actions to audit log
        const user = request.user;
        const tenantId = request.tenantId;

        if (user === undefined || tenantId === undefined) {
          return;
        }

        // Get requestId and correlationId from headers or generate
        const requestId =
          (request.headers["x-request-id"] as string | undefined) ??
          randomUUID();
        const correlationId =
          (request.headers["x-correlation-id"] as string | undefined) ??
          requestId;

        // Try to identify the resourceId from response or request parameters
        const resourceId =
          responseBody?.id ??
          request.params?.id ??
          request.body?.id ??
          "unknown";

        void this.database.client.auditLog
          .create({
            data: {
              tenantId,
              actorType: AuditActorType.USER,
              actorId: user.id,
              action: options.action,
              resourceType: options.resourceType,
              resourceId: String(resourceId),
              requestId,
              correlationId,
              after:
                responseBody !== null && typeof responseBody === "object"
                  ? responseBody
                  : null,
            },
          })
          .catch((err) => {
            console.error("Failed to write audit log:", err);
          });
      }),
    );
  }
}
