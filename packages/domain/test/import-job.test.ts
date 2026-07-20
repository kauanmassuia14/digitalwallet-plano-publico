import { describe, expect, it } from "vitest";
import { DomainError, ImportJobAggregate } from "../src/index.js";

const createdAt = new Date("2026-07-15T12:00:00.000Z");
const expiresAt = new Date("2026-07-16T12:00:00.000Z");

describe("ImportJobAggregate", () => {
  it("creates an upload import job", () => {
    const job = ImportJobAggregate.create({
      contractVersion: "v1",
      createdAt,
      createdByUserId: "user-01",
      expiresAt,
      fileHash: "hash-01",
      id: "job-01",
      objectKey: "uploads/file.csv",
      originalFileName: "file.csv",
      sourceEventId: "evt-01",
      tenantId: "tenant-es",
    });

    const snapshot = job.snapshot();
    expect(snapshot).toMatchObject({
      acceptedRows: 0,
      contractVersion: "v1",
      createdByUserId: "user-01",
      errorReportKey: null,
      fileHash: "hash-01",
      id: "job-01",
      objectKey: "uploads/file.csv",
      originalFileName: "file.csv",
      rejectedRows: 0,
      sourceEventId: "evt-01",
      status: "UPLOADED",
      tenantId: "tenant-es",
      totalRows: 0,
    });
  });

  it("handles valid transitions and counts updates", () => {
    const job = ImportJobAggregate.create({
      contractVersion: "v1",
      createdAt,
      createdByUserId: "user-01",
      expiresAt,
      fileHash: "hash-01",
      id: "job-01",
      objectKey: "uploads/file.csv",
      originalFileName: "file.csv",
      sourceEventId: "evt-01",
      tenantId: "tenant-es",
    });

    const validating = job.startValidating(new Date(createdAt.getTime() + 1000));
    expect(validating.snapshot().status).toBe("VALIDATING");

    const ready = validating.ready(
      { acceptedRows: 100, rejectedRows: 5, totalRows: 105 },
      new Date(createdAt.getTime() + 2000),
    );
    expect(ready.snapshot()).toMatchObject({
      acceptedRows: 100,
      rejectedRows: 5,
      status: "READY",
      totalRows: 105,
    });

    const committed = ready.commit(new Date(createdAt.getTime() + 3000));
    expect(committed.snapshot().status).toBe("COMMITTED");

    const rejected = ready.reject("reports/err.json", new Date(createdAt.getTime() + 4000));
    expect(rejected.snapshot()).toMatchObject({
      errorReportKey: "reports/err.json",
      status: "REJECTED",
    });
  });

  it("validates expiration time constraints", () => {
    expect(() =>
      ImportJobAggregate.create({
        contractVersion: "v1",
        createdAt,
        createdByUserId: "user-01",
        expiresAt: new Date(createdAt.getTime() - 100), // invalid expiration before creation
        fileHash: "hash-01",
        id: "job-01",
        objectKey: "uploads/file.csv",
        originalFileName: "file.csv",
        sourceEventId: "evt-01",
        tenantId: "tenant-es",
      })
    ).toThrow(DomainError);
  });
});
