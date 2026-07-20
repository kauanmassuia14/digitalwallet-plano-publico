import { DomainError } from "./domain-error.js";

export const PACKAGING_STATUSES = [
  "MINTED",
  "IN_CIRCULATION",
  "COLLECTED",
  "RECYCLED",
] as const;

export type PackagingStatus = (typeof PACKAGING_STATUSES)[number];

const ALLOWED_TRANSITIONS: Readonly<
  Record<PackagingStatus, readonly PackagingStatus[]>
> = {
  MINTED: ["IN_CIRCULATION"],
  IN_CIRCULATION: ["COLLECTED"],
  COLLECTED: ["RECYCLED"],
  RECYCLED: [],
};

export interface PackagingSnapshot {
  readonly id: string;
  readonly tenantId: string;
  readonly batchId: string;
  readonly serial: string;
  readonly status: PackagingStatus;
  readonly materialCode: string;
  readonly expectedWeightGrams: number;
  readonly unitCostCents: number;
  readonly rewardCents: number;
  readonly externalQrHash: string;
  readonly internalQrHash: string;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreatePackagingInput {
  readonly id: string;
  readonly tenantId: string;
  readonly batchId: string;
  readonly serial: string;
  readonly materialCode: string;
  readonly expectedWeightGrams: number;
  readonly unitCostCents: number;
  readonly rewardCents: number;
  readonly externalQrHash: string;
  readonly internalQrHash: string;
  readonly mintedAt: Date;
}

export interface CollectPackagingInput {
  readonly actualWeightGrams: number;
  readonly occurredAt: Date;
  readonly tolerancePercent?: number;
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

function requirePositiveNumber(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DomainError(
      "INVALID_ARGUMENT",
      `${field} must be a finite number greater than zero`,
      { field, value },
    );
  }

  return value;
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

function requireSha256Hash(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();

  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new DomainError(
      "INVALID_ARGUMENT",
      `${field} must be a SHA-256 hex digest`,
      { field },
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

export function weightDeviationPercent(
  expectedWeightGrams: number,
  actualWeightGrams: number,
): number {
  const expected = requirePositiveNumber(
    expectedWeightGrams,
    "expectedWeightGrams",
  );
  const actual = requirePositiveNumber(actualWeightGrams, "actualWeightGrams");

  return (Math.abs(actual - expected) / expected) * 100;
}

export function isWeightWithinTolerance(
  expectedWeightGrams: number,
  actualWeightGrams: number,
  tolerancePercent = 5,
): boolean {
  const tolerance = requirePositiveNumber(tolerancePercent, "tolerancePercent");
  const deviation = weightDeviationPercent(
    expectedWeightGrams,
    actualWeightGrams,
  );

  return deviation <= tolerance + Number.EPSILON;
}

export class PackagingAggregate {
  private constructor(private readonly state: PackagingSnapshot) {}

  public static create(input: CreatePackagingInput): PackagingAggregate {
    const mintedAt = requireValidDate(input.mintedAt, "mintedAt");
    const externalQrHash = requireSha256Hash(
      input.externalQrHash,
      "externalQrHash",
    );
    const internalQrHash = requireSha256Hash(
      input.internalQrHash,
      "internalQrHash",
    );

    if (externalQrHash === internalQrHash) {
      throw new DomainError(
        "INVALID_ARGUMENT",
        "External and internal QR hashes must be different",
        { fields: ["externalQrHash", "internalQrHash"] },
      );
    }

    return new PackagingAggregate({
      id: requireNonBlank(input.id, "id"),
      tenantId: requireNonBlank(input.tenantId, "tenantId"),
      batchId: requireNonBlank(input.batchId, "batchId"),
      serial: requireNonBlank(input.serial, "serial"),
      status: "MINTED",
      materialCode: requireNonBlank(input.materialCode, "materialCode"),
      expectedWeightGrams: requirePositiveNumber(
        input.expectedWeightGrams,
        "expectedWeightGrams",
      ),
      unitCostCents: requireNonNegativeInteger(
        input.unitCostCents,
        "unitCostCents",
      ),
      rewardCents: requireNonNegativeInteger(input.rewardCents, "rewardCents"),
      externalQrHash,
      internalQrHash,
      version: 0,
      createdAt: mintedAt,
      updatedAt: mintedAt,
    });
  }

  public static rehydrate(snapshot: PackagingSnapshot): PackagingAggregate {
    if (!PACKAGING_STATUSES.includes(snapshot.status)) {
      throw new DomainError("INVALID_ARGUMENT", "status is not supported", {
        status: snapshot.status,
      });
    }

    const version = requireNonNegativeInteger(snapshot.version, "version");
    const createdAt = requireValidDate(snapshot.createdAt, "createdAt");
    const updatedAt = requireValidDate(snapshot.updatedAt, "updatedAt");
    const externalQrHash = requireSha256Hash(
      snapshot.externalQrHash,
      "externalQrHash",
    );
    const internalQrHash = requireSha256Hash(
      snapshot.internalQrHash,
      "internalQrHash",
    );

    if (updatedAt < createdAt) {
      throw new DomainError(
        "OCCURRED_AT_BEFORE_CURRENT_STATE",
        "updatedAt must not be before createdAt",
      );
    }

    if (externalQrHash === internalQrHash) {
      throw new DomainError(
        "INVALID_ARGUMENT",
        "External and internal QR hashes must be different",
        { fields: ["externalQrHash", "internalQrHash"] },
      );
    }

    return new PackagingAggregate({
      id: requireNonBlank(snapshot.id, "id"),
      tenantId: requireNonBlank(snapshot.tenantId, "tenantId"),
      batchId: requireNonBlank(snapshot.batchId, "batchId"),
      serial: requireNonBlank(snapshot.serial, "serial"),
      status: snapshot.status,
      materialCode: requireNonBlank(snapshot.materialCode, "materialCode"),
      expectedWeightGrams: requirePositiveNumber(
        snapshot.expectedWeightGrams,
        "expectedWeightGrams",
      ),
      unitCostCents: requireNonNegativeInteger(
        snapshot.unitCostCents,
        "unitCostCents",
      ),
      rewardCents: requireNonNegativeInteger(
        snapshot.rewardCents,
        "rewardCents",
      ),
      externalQrHash,
      internalQrHash,
      version,
      createdAt,
      updatedAt,
    });
  }

  public snapshot(): PackagingSnapshot {
    return {
      ...this.state,
      createdAt: new Date(this.state.createdAt),
      updatedAt: new Date(this.state.updatedAt),
    };
  }

  public allowedNextStatuses(): readonly PackagingStatus[] {
    return ALLOWED_TRANSITIONS[this.state.status];
  }

  public circulate(occurredAt: Date): PackagingAggregate {
    return this.transitionTo("IN_CIRCULATION", occurredAt);
  }

  public collect(input: CollectPackagingInput): PackagingAggregate {
    const tolerancePercent = input.tolerancePercent ?? 5;
    const deviationPercent = weightDeviationPercent(
      this.state.expectedWeightGrams,
      input.actualWeightGrams,
    );

    if (
      !isWeightWithinTolerance(
        this.state.expectedWeightGrams,
        input.actualWeightGrams,
        tolerancePercent,
      )
    ) {
      throw new DomainError(
        "WEIGHT_OUT_OF_TOLERANCE",
        "Measured weight is outside the accepted tolerance",
        {
          actualWeightGrams: input.actualWeightGrams,
          deviationPercent,
          expectedWeightGrams: this.state.expectedWeightGrams,
          tolerancePercent,
        },
      );
    }

    return this.transitionTo("COLLECTED", input.occurredAt);
  }

  public recycle(occurredAt: Date): PackagingAggregate {
    return this.transitionTo("RECYCLED", occurredAt);
  }

  private transitionTo(
    nextStatus: PackagingStatus,
    occurredAtValue: Date,
  ): PackagingAggregate {
    const occurredAt = requireValidDate(occurredAtValue, "occurredAt");
    const allowedStatuses = ALLOWED_TRANSITIONS[this.state.status];

    if (!allowedStatuses.includes(nextStatus)) {
      throw new DomainError(
        "INVALID_TRANSITION",
        `Cannot transition packaging from ${this.state.status} to ${nextStatus}`,
        {
          currentStatus: this.state.status,
          nextStatus,
        },
      );
    }

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

    return new PackagingAggregate({
      ...this.state,
      status: nextStatus,
      updatedAt: occurredAt,
      version: this.state.version + 1,
    });
  }
}
