import { describe, expect, it } from "vitest";
import { DomainError, PackagingBatchAggregate } from "../src/index.js";

const createdAt = new Date("2026-07-15T12:00:00.000Z");

describe("PackagingBatchAggregate", () => {
  it("creates a draft packaging batch and validates fields", () => {
    const batch = PackagingBatchAggregate.create({
      code: "BATCH-001",
      countryCode: "ES",
      createdAt,
      currencyCode: "EUR",
      id: "batch-01",
      tenantId: "tenant-es",
    });

    const snapshot = batch.snapshot();
    expect(snapshot).toMatchObject({
      code: "BATCH-001",
      countryCode: "ES",
      currencyCode: "EUR",
      id: "batch-01",
      importJobId: null,
      status: "DRAFT",
      tenantId: "tenant-es",
    });
  });

  it("rejects blank or invalid fields on creation", () => {
    expect(() =>
      PackagingBatchAggregate.create({
        code: "",
        countryCode: "ES",
        createdAt,
        currencyCode: "EUR",
        id: "batch-01",
        tenantId: "tenant-es",
      })
    ).toThrow(DomainError);

    expect(() =>
      PackagingBatchAggregate.create({
        code: "BATCH-001",
        countryCode: "E", // invalid length
        createdAt,
        currencyCode: "EUR",
        id: "batch-01",
        tenantId: "tenant-es",
      })
    ).toThrow(DomainError);

    expect(() =>
      PackagingBatchAggregate.create({
        code: "BATCH-001",
        countryCode: "ES",
        createdAt,
        currencyCode: "EU", // invalid length
        id: "batch-01",
        tenantId: "tenant-es",
      })
    ).toThrow(DomainError);
  });

  it("supports rehydration and transitions", () => {
    const batch = PackagingBatchAggregate.create({
      code: "BATCH-001",
      countryCode: "ES",
      createdAt,
      currencyCode: "EUR",
      id: "batch-01",
      tenantId: "tenant-es",
    });

    const validated = batch.validate(new Date(createdAt.getTime() + 1000));
    expect(validated.snapshot().status).toBe("VALIDATED");

    const imported = validated.import(new Date(createdAt.getTime() + 2000));
    expect(imported.snapshot().status).toBe("IMPORTED");

    const failed = batch.fail(new Date(createdAt.getTime() + 3000));
    expect(failed.snapshot().status).toBe("FAILED");
  });

  it("prevents backdated transitions", () => {
    const batch = PackagingBatchAggregate.create({
      code: "BATCH-001",
      countryCode: "ES",
      createdAt,
      currencyCode: "EUR",
      id: "batch-01",
      tenantId: "tenant-es",
    });

    expect(() =>
      batch.validate(new Date(createdAt.getTime() - 1000))
    ).toThrow(DomainError);
  });
});
