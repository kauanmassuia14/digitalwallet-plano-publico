import { describe, expect, it } from "vitest";

import {
  DomainError,
  isWeightWithinTolerance,
  PackagingAggregate,
  weightDeviationPercent,
} from "../src/index.js";

const mintedAt = new Date("2026-07-15T12:00:00.000Z");

function createPackaging(): PackagingAggregate {
  return PackagingAggregate.create({
    batchId: "batch-01",
    expectedWeightGrams: 500,
    externalQrHash: "a".repeat(64),
    id: "packaging-01",
    internalQrHash: "b".repeat(64),
    materialCode: "PET",
    mintedAt,
    rewardCents: 75,
    serial: "00001234",
    tenantId: "tenant-es",
    unitCostCents: 62,
  });
}

describe("PackagingAggregate", () => {
  it("creates a minted packaging while preserving serial formatting", () => {
    const snapshot = createPackaging().snapshot();

    expect(snapshot).toMatchObject({
      rewardCents: 75,
      serial: "00001234",
      status: "MINTED",
      unitCostCents: 62,
      version: 0,
    });
    expect(snapshot.createdAt).toEqual(mintedAt);
  });

  it("follows the only supported lifecycle in order", () => {
    const circulating = createPackaging().circulate(
      new Date("2026-07-15T12:01:00.000Z"),
    );
    const collected = circulating.collect({
      actualWeightGrams: 475,
      occurredAt: new Date("2026-07-15T12:02:00.000Z"),
    });
    const recycled = collected.recycle(new Date("2026-07-15T12:03:00.000Z"));

    expect(recycled.snapshot()).toMatchObject({
      status: "RECYCLED",
      version: 3,
    });
    expect(recycled.allowedNextStatuses()).toEqual([]);
  });

  it("accepts the inclusive five-percent weight boundary", () => {
    const circulating = createPackaging().circulate(mintedAt);

    expect(
      circulating
        .collect({
          actualWeightGrams: 525,
          occurredAt: mintedAt,
        })
        .snapshot().status,
    ).toBe("COLLECTED");
    expect(isWeightWithinTolerance(500, 475)).toBe(true);
  });

  it("rejects a measured weight outside tolerance with evidence", () => {
    const circulating = createPackaging().circulate(mintedAt);

    expect(() =>
      circulating.collect({
        actualWeightGrams: 526,
        occurredAt: mintedAt,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({
        code: "WEIGHT_OUT_OF_TOLERANCE",
        metadata: expect.objectContaining({
          actualWeightGrams: 526,
          expectedWeightGrams: 500,
          tolerancePercent: 5,
        }) as Readonly<Record<string, unknown>>,
      }),
    );
  });

  it("rejects skipped and repeated state transitions", () => {
    expect(() => createPackaging().recycle(mintedAt)).toThrowError(
      expect.objectContaining<Partial<DomainError>>({
        code: "INVALID_TRANSITION",
      }),
    );

    const circulating = createPackaging().circulate(mintedAt);
    expect(() => circulating.circulate(mintedAt)).toThrowError(
      expect.objectContaining<Partial<DomainError>>({
        code: "INVALID_TRANSITION",
      }),
    );
  });

  it("rejects transitions timestamped before the current state", () => {
    const circulating = createPackaging().circulate(
      new Date("2026-07-15T12:05:00.000Z"),
    );

    expect(() =>
      circulating.collect({
        actualWeightGrams: 500,
        occurredAt: new Date("2026-07-15T12:04:59.999Z"),
      }),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({
        code: "OCCURRED_AT_BEFORE_CURRENT_STATE",
      }),
    );
  });

  it("does not leak mutable Date references from its snapshot", () => {
    const packaging = createPackaging();
    const firstSnapshot = packaging.snapshot();
    firstSnapshot.updatedAt.setUTCFullYear(2035);

    expect(packaging.snapshot().updatedAt).toEqual(mintedAt);
  });

  it.each([
    ["id", { id: "   " }],
    ["tenantId", { tenantId: "" }],
    ["expectedWeightGrams", { expectedWeightGrams: 0 }],
    ["unitCostCents", { unitCostCents: -1 }],
    ["rewardCents", { rewardCents: 1.5 }],
    ["externalQrHash", { externalQrHash: "not-a-hash" }],
  ])("rejects invalid %s input", (_field, override) => {
    expect(() =>
      PackagingAggregate.create({
        batchId: "batch-01",
        expectedWeightGrams: 500,
        externalQrHash: "a".repeat(64),
        id: "packaging-01",
        internalQrHash: "b".repeat(64),
        materialCode: "PET",
        mintedAt,
        rewardCents: 75,
        serial: "serial-01",
        tenantId: "tenant-es",
        unitCostCents: 62,
        ...override,
      }),
    ).toThrowError(DomainError);
  });

  it("requires different SHA-256 digests for the two QR surfaces", () => {
    expect(() =>
      PackagingAggregate.create({
        batchId: "batch-01",
        expectedWeightGrams: 500,
        externalQrHash: "A".repeat(64),
        id: "packaging-01",
        internalQrHash: "a".repeat(64),
        materialCode: "PET",
        mintedAt,
        rewardCents: 75,
        serial: "serial-01",
        tenantId: "tenant-es",
        unitCostCents: 62,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<DomainError>>({
        code: "INVALID_ARGUMENT",
        message: "External and internal QR hashes must be different",
      }),
    );
  });
});

describe("weight helpers", () => {
  it("calculates absolute deviation as a percentage", () => {
    expect(weightDeviationPercent(500, 450)).toBe(10);
    expect(weightDeviationPercent(500, 550)).toBe(10);
  });

  it("rejects non-positive weights and tolerance", () => {
    expect(() => weightDeviationPercent(0, 500)).toThrowError(DomainError);
    expect(() => isWeightWithinTolerance(500, 500, 0)).toThrowError(
      DomainError,
    );
  });
});
