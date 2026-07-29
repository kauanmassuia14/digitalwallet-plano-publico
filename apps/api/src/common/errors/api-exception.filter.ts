import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from "@nestjs/common";
import { DomainError, type DomainErrorCode } from "@digitalwallet/domain";
import { randomUUID } from "node:crypto";

interface HttpRequestLike {
  readonly method?: string;
  readonly url?: string;
}

interface HttpResponseLike {
  status(statusCode: number): HttpResponseLike;
  json(body: unknown): void;
}

interface ErrorPayload {
  readonly code: string;
  readonly details?: unknown;
  readonly message: string;
}

const DOMAIN_STATUS: Readonly<Partial<Record<DomainErrorCode, number>>> = {
  INVALID_ARGUMENT: HttpStatus.UNPROCESSABLE_ENTITY,
  INVALID_TRANSITION: HttpStatus.CONFLICT,
  OCCURRED_AT_BEFORE_CURRENT_STATE: HttpStatus.UNPROCESSABLE_ENTITY,
  OPTIMISTIC_LOCK_CONFLICT: HttpStatus.CONFLICT,
  PACKAGING_SCOPE_INVALID: HttpStatus.UNPROCESSABLE_ENTITY,
  PACKAGING_NOT_FOUND: HttpStatus.NOT_FOUND,
  PACKAGING_SERIAL_ALREADY_EXISTS: HttpStatus.CONFLICT,
  QR_HASH_ALREADY_EXISTS: HttpStatus.CONFLICT,
  TENANT_CONTEXT_INVALID: HttpStatus.BAD_REQUEST,
  TENANT_CONTEXT_REQUIRED: HttpStatus.BAD_REQUEST,
  WEIGHT_OUT_OF_TOLERANCE: HttpStatus.UNPROCESSABLE_ENTITY,
};

function payloadFromHttpException(exception: HttpException): ErrorPayload {
  const response = exception.getResponse();

  if (typeof response === "string") {
    return {
      code: `HTTP_${exception.getStatus()}`,
      message: response,
    };
  }

  const record = response as Readonly<Record<string, unknown>>;
  const rawMessage = record.message;
  const message = Array.isArray(rawMessage)
    ? rawMessage.map(String).join("; ")
    : typeof rawMessage === "string"
      ? rawMessage
      : exception.message;

  return {
    code:
      typeof record.code === "string"
        ? record.code
        : `HTTP_${exception.getStatus()}`,
    details: Array.isArray(rawMessage)
      ? { validationErrors: rawMessage }
      : record,
    message,
  };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponseLike>();
    const request = context.getRequest<HttpRequestLike>();
    const errorId = randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: ErrorPayload = {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    };

    if (exception instanceof DomainError) {
      status = DOMAIN_STATUS[exception.code] ?? HttpStatus.BAD_REQUEST;
      payload = {
        code: exception.code,
        details: exception.metadata,
        message: exception.message,
      };
      if (process.env.NODE_ENV === "development") {
        this.logger.warn(
          `DomainError in development: ${exception.code} - ${exception.message}`,
          exception.stack,
        );
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      payload = payloadFromHttpException(exception);
      if (process.env.NODE_ENV === "development") {
        this.logger.warn(`HttpException in development: ${exception.message}`);
      }
    } else {
      this.logger.error(
        `Unhandled error ${errorId} for ${request.method ?? "UNKNOWN"} ${request.url ?? "UNKNOWN"}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      error: {
        ...payload,
        id: errorId,
      },
      path: request.url ?? null,
      timestamp: new Date().toISOString(),
    });
  }
}
