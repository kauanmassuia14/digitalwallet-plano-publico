import {
  Inject,
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
  HttpStatus,
  ConflictException,
} from "@nestjs/common";
import { type Observable, of, throwError } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { createHash } from "node:crypto";

import { DatabaseService } from "../database/database.service.js";
import type { TenantAwareRequest } from "./tenant-context.js";

const IDEMPOTENCY_HEADER = "x-idempotency-key";
const DEFAULT_TTL_HOURS = 24;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  public constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  public async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<
      TenantAwareRequest & {
        method?: string;
        url?: string;
        body?: any;
      }
    >();
    const key = request.headers[IDEMPOTENCY_HEADER];

    // Only process if header is present and it is a mutating request
    if (
      key === undefined ||
      Array.isArray(key) ||
      key.length === 0 ||
      request.tenantId === undefined ||
      ["GET", "HEAD", "OPTIONS"].includes(request.method ?? "")
    ) {
      return next.handle();
    }

    const tenantId = request.tenantId;
    const bodyStr = JSON.stringify(request.body ?? {});
    const requestHash = createHash("sha256")
      .update(`${request.method}:${request.url}:${bodyStr}`)
      .digest("hex");

    // Check existing record
    const existing = await this.database.client.idempotencyRecord.findUnique({
      where: {
        tenantId_key: {
          tenantId,
          key,
        },
      },
    });

    if (existing !== null) {
      if (existing.status === "IN_PROGRESS") {
        throw new ConflictException(
          "A request with the same idempotency key is already in progress.",
        );
      }

      if (existing.status === "COMPLETED") {
        // Return cached response
        const httpResponse = context.switchToHttp().getResponse();
        httpResponse.status(existing.responseStatus ?? HttpStatus.OK);
        return of(existing.responseBody);
      }

      // If FAILED, we allow re-trying. Clean up the failed record first.
      await this.database.client.idempotencyRecord.delete({
        where: { id: existing.id },
      });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + DEFAULT_TTL_HOURS);

    // Create record with IN_PROGRESS
    const record = await this.database.client.idempotencyRecord.create({
      data: {
        tenantId,
        key,
        requestHash,
        status: "IN_PROGRESS",
        expiresAt,
      },
    });

    return next.handle().pipe(
      map((responseBody) => {
        // Resolve status code
        const httpResponse = context.switchToHttp().getResponse();
        const responseStatus = httpResponse.statusCode ?? HttpStatus.OK;

        // Async update to COMPLETED
        void this.database.client.idempotencyRecord
          .update({
            where: { id: record.id },
            data: {
              status: "COMPLETED",
              responseStatus,
              responseBody: responseBody ?? null,
            },
          })
          .catch((err) => {
            console.error(
              "Failed to update idempotency record to COMPLETED:",
              err,
            );
          });

        return responseBody;
      }),
      catchError((error) => {
        // Async update to FAILED
        void this.database.client.idempotencyRecord
          .update({
            where: { id: record.id },
            data: {
              status: "FAILED",
            },
          })
          .catch((err) => {
            console.error(
              "Failed to update idempotency record to FAILED:",
              err,
            );
          });

        return throwError(() => error);
      }),
    );
  }
}
