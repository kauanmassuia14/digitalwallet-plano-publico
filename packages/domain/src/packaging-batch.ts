import { DomainError } from "./domain-error.js";

export const PACKAGING_BATCH_STATUSES = [
  "DRAFT",
  "VALIDATED",
  "IMPORTED",
  "FAILED",
] as const;

export type PackagingBatchStatus = (typeof PACKAGING_BATCH_STATUSES)[number];

export interface PackagingBatchSnapshot {
  readonly id: string;
  readonly tenantId: string;
  readonly importJobId: string | null;
  readonly code: string;
  readonly countryCode: string;
  readonly currencyCode: string;
  readonly status: PackagingBatchStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreatePackagingBatchInput {
  readonly id: string;
  readonly tenantId: string;
  readonly importJobId?: string | null;
  readonly code: string;
  readonly countryCode: string;
  readonly currencyCode: string;
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

function requireExactLength(
  value: string,
  length: number,
  field: string,
): string {
  const normalized = value.trim().toUpperCase();

  if (normalized.length !== length) {
    throw new DomainError(
      "INVALID_ARGUMENT",
      `${field} must be exactly ${length} characters long`,
      { field, value },
    );
  }

  return normalized;
}

function requireValidDate(value: Date, field: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new DomainError("INVALID_ARGUMENT", `${field} must be a valid date`, {
      field,
    });
  }

  return new Date(value);
}

export class PackagingBatchAggregate {
  private constructor(private readonly state: PackagingBatchSnapshot) {}

  public static create(
    input: CreatePackagingBatchInput,
  ): PackagingBatchAggregate {
    const createdAt = requireValidDate(input.createdAt, "createdAt");
    const code = requireNonBlank(input.code, "code");
    const countryCode = requireExactLength(input.countryCode, 2, "countryCode");
    const currencyCode = requireExactLength(
      input.currencyCode,
      3,
      "currencyCode",
    );

    return new PackagingBatchAggregate({
      code,
      countryCode,
      createdAt,
      currencyCode,
      id: requireNonBlank(input.id, "id"),
      importJobId: input.importJobId ?? null,
      status: "DRAFT",
      tenantId: requireNonBlank(input.tenantId, "tenantId"),
      updatedAt: createdAt,
    });
  }

  public static rehydrate(
    snapshot: PackagingBatchSnapshot,
  ): PackagingBatchAggregate {
    if (!PACKAGING_BATCH_STATUSES.includes(snapshot.status)) {
      throw new DomainError("INVALID_ARGUMENT", "status is not supported", {
        status: snapshot.status,
      });
    }

    const createdAt = requireValidDate(snapshot.createdAt, "createdAt");
    const updatedAt = requireValidDate(snapshot.updatedAt, "updatedAt");

    if (updatedAt < createdAt) {
      throw new DomainError(
        "OCCURRED_AT_BEFORE_CURRENT_STATE",
        "updatedAt must not be before createdAt",
      );
    }

    return new PackagingBatchAggregate({
      code: requireNonBlank(snapshot.code, "code"),
      countryCode: requireExactLength(snapshot.countryCode, 2, "countryCode"),
      createdAt,
      currencyCode: requireExactLength(
        snapshot.currencyCode,
        3,
        "currencyCode",
      ),
      id: requireNonBlank(snapshot.id, "id"),
      importJobId: snapshot.importJobId,
      status: snapshot.status,
      tenantId: requireNonBlank(snapshot.tenantId, "tenantId"),
      updatedAt,
    });
  }

  public snapshot(): PackagingBatchSnapshot {
    return {
      ...this.state,
      createdAt: new Date(this.state.createdAt),
      updatedAt: new Date(this.state.updatedAt),
    };
  }

  public validate(occurredAt: Date): PackagingBatchAggregate {
    return this.transitionTo("VALIDATED", occurredAt);
  }

  public import(occurredAt: Date): PackagingBatchAggregate {
    return this.transitionTo("IMPORTED", occurredAt);
  }

  public fail(occurredAt: Date): PackagingBatchAggregate {
    return this.transitionTo("FAILED", occurredAt);
  }

  private transitionTo(
    nextStatus: PackagingBatchStatus,
    occurredAtValue: Date,
  ): PackagingBatchAggregate {
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

    return new PackagingBatchAggregate({
      ...this.state,
      status: nextStatus,
      updatedAt: occurredAt,
    });
  }
}
