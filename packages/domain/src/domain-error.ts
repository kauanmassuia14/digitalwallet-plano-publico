export type DomainErrorCode =
  | "BATCH_CODE_ALREADY_EXISTS"
  | "INVALID_ARGUMENT"
  | "INVALID_TRANSITION"
  | "OCCURRED_AT_BEFORE_CURRENT_STATE"
  | "OPTIMISTIC_LOCK_CONFLICT"
  | "PACKAGING_SCOPE_INVALID"
  | "PACKAGING_NOT_FOUND"
  | "PACKAGING_SERIAL_ALREADY_EXISTS"
  | "QR_HASH_ALREADY_EXISTS"
  | "TENANT_CONTEXT_INVALID"
  | "TENANT_CONTEXT_REQUIRED"
  | "WEIGHT_OUT_OF_TOLERANCE";

export class DomainError extends Error {
  public constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly metadata: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "DomainError";
  }
}
