import { DomainError } from "./domain-error.js";

export const IMPORT_JOB_STATUSES = [
  "UPLOADED",
  "VALIDATING",
  "READY",
  "COMMITTED",
  "REJECTED",
  "EXPIRED",
] as const;

export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

export interface ImportJobSnapshot {
  readonly id: string;
  readonly tenantId: string;
  readonly createdByUserId: string;
  readonly contractVersion: string;
  readonly sourceEventId: string;
  readonly originalFileName: string;
  readonly objectKey: string;
  readonly fileHash: string;
  readonly status: ImportJobStatus;
  readonly totalRows: number;
  readonly acceptedRows: number;
  readonly rejectedRows: number;
  readonly errorReportKey: string | null;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateImportJobInput {
  readonly id: string;
  readonly tenantId: string;
  readonly createdByUserId: string;
  readonly contractVersion: string;
  readonly sourceEventId: string;
  readonly originalFileName: string;
  readonly objectKey: string;
  readonly fileHash: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

function requireNonBlank(value: string, field: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new DomainError("INVALID_ARGUMENT", `${field} must not be blank`, {
      field,
    });
  }

  return normalized;
}

function requireNonNegativeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError(
      "INVALID_ARGUMENT",
      `${field} must be a non-negative safe integer`,
      { field, value },
    );
  }

  return value;
}

function requireValidDate(value: Date, field: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new DomainError("INVALID_ARGUMENT", `${field} must be a valid date`, {
      field,
    });
  }

  return new Date(value);
}

export class ImportJobAggregate {
  private constructor(private readonly state: ImportJobSnapshot) {}

  public static create(input: CreateImportJobInput): ImportJobAggregate {
    const createdAt = requireValidDate(input.createdAt, "createdAt");
    const expiresAt = requireValidDate(input.expiresAt, "expiresAt");

    if (expiresAt <= createdAt) {
      throw new DomainError(
        "INVALID_ARGUMENT",
        "expiresAt must be after createdAt",
        { createdAt, expiresAt },
      );
    }

    return new ImportJobAggregate({
      acceptedRows: 0,
      contractVersion: requireNonBlank(
        input.contractVersion,
        "contractVersion",
      ),
      createdAt,
      createdByUserId: requireNonBlank(
        input.createdByUserId,
        "createdByUserId",
      ),
      errorReportKey: null,
      expiresAt,
      fileHash: requireNonBlank(input.fileHash, "fileHash"),
      id: requireNonBlank(input.id, "id"),
      objectKey: requireNonBlank(input.objectKey, "objectKey"),
      originalFileName: requireNonBlank(
        input.originalFileName,
        "originalFileName",
      ),
      rejectedRows: 0,
      sourceEventId: requireNonBlank(input.sourceEventId, "sourceEventId"),
      status: "UPLOADED",
      tenantId: requireNonBlank(input.tenantId, "tenantId"),
      totalRows: 0,
      updatedAt: createdAt,
    });
  }

  public static rehydrate(snapshot: ImportJobSnapshot): ImportJobAggregate {
    if (!IMPORT_JOB_STATUSES.includes(snapshot.status)) {
      throw new DomainError("INVALID_ARGUMENT", "status is not supported", {
        status: snapshot.status,
      });
    }

    const createdAt = requireValidDate(snapshot.createdAt, "createdAt");
    const updatedAt = requireValidDate(snapshot.updatedAt, "updatedAt");
    const expiresAt = requireValidDate(snapshot.expiresAt, "expiresAt");

    if (updatedAt < createdAt) {
      throw new DomainError(
        "OCCURRED_AT_BEFORE_CURRENT_STATE",
        "updatedAt must not be before createdAt",
      );
    }

    return new ImportJobAggregate({
      acceptedRows: requireNonNegativeInteger(
        snapshot.acceptedRows,
        "acceptedRows",
      ),
      contractVersion: requireNonBlank(
        snapshot.contractVersion,
        "contractVersion",
      ),
      createdAt,
      createdByUserId: requireNonBlank(
        snapshot.createdByUserId,
        "createdByUserId",
      ),
      errorReportKey: snapshot.errorReportKey
        ? requireNonBlank(snapshot.errorReportKey, "errorReportKey")
        : null,
      expiresAt,
      fileHash: requireNonBlank(snapshot.fileHash, "fileHash"),
      id: requireNonBlank(snapshot.id, "id"),
      objectKey: requireNonBlank(snapshot.objectKey, "objectKey"),
      originalFileName: requireNonBlank(
        snapshot.originalFileName,
        "originalFileName",
      ),
      rejectedRows: requireNonNegativeInteger(
        snapshot.rejectedRows,
        "rejectedRows",
      ),
      sourceEventId: requireNonBlank(snapshot.sourceEventId, "sourceEventId"),
      status: snapshot.status,
      tenantId: requireNonBlank(snapshot.tenantId, "tenantId"),
      totalRows: requireNonNegativeInteger(snapshot.totalRows, "totalRows"),
      updatedAt,
    });
  }

  public snapshot(): ImportJobSnapshot {
    return {
      ...this.state,
      createdAt: new Date(this.state.createdAt),
      expiresAt: new Date(this.state.expiresAt),
      updatedAt: new Date(this.state.updatedAt),
    };
  }

  public startValidating(occurredAt: Date): ImportJobAggregate {
    return this.transitionTo("VALIDATING", occurredAt);
  }

  public ready(
    metrics: { totalRows: number; acceptedRows: number; rejectedRows: number },
    occurredAt: Date,
  ): ImportJobAggregate {
    const next = this.transitionTo("READY", occurredAt);
    return new ImportJobAggregate({
      ...next.state,
      acceptedRows: requireNonNegativeInteger(
        metrics.acceptedRows,
        "acceptedRows",
      ),
      rejectedRows: requireNonNegativeInteger(
        metrics.rejectedRows,
        "rejectedRows",
      ),
      totalRows: requireNonNegativeInteger(metrics.totalRows, "totalRows"),
    });
  }

  public commit(occurredAt: Date): ImportJobAggregate {
    return this.transitionTo("COMMITTED", occurredAt);
  }

  public reject(
    errorReportKey: string | null,
    occurredAt: Date,
  ): ImportJobAggregate {
    const next = this.transitionTo("REJECTED", occurredAt);
    return new ImportJobAggregate({
      ...next.state,
      errorReportKey,
    });
  }

  public expire(occurredAt: Date): ImportJobAggregate {
    return this.transitionTo("EXPIRED", occurredAt);
  }

  private transitionTo(
    nextStatus: ImportJobStatus,
    occurredAtValue: Date,
  ): ImportJobAggregate {
    const occurredAt = requireValidDate(occurredAtValue, "occurredAt");

    if (occurredAt < this.state.updatedAt) {
      throw new DomainError(
        "OCCURRED_AT_BEFORE_CURRENT_STATE",
        "Transition timestamp must not be before the current state timestamp",
        {
          currentUpdatedAt: this.state.updatedAt.toISOString(),
          occurredAt: occurredAt.toISOString(),
        },
      );
    }

    return new ImportJobAggregate({
      ...this.state,
      status: nextStatus,
      updatedAt: occurredAt,
    });
  }
}
