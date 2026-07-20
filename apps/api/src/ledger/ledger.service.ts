import { Injectable } from "@nestjs/common";
import * as crypto from "node:crypto";
import { DatabaseService } from "../common/database/database.service.js";
import { KmsService } from "./kms.service.js";

const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

@Injectable()
export class LedgerService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly kmsService: KmsService,
  ) {}

  public calculateRowHash(prevHash: string, payload: any): string {
    const serializedPayload = this.canonicalStringify(payload);
    return crypto
      .createHash("sha256")
      .update(prevHash + serializedPayload)
      .digest("hex");
  }

  private canonicalStringify(obj: any): string {
    if (obj === null || obj === undefined) {
      return "null";
    }
    if (obj instanceof Date) {
      return JSON.stringify(obj.toISOString());
    }
    if (typeof obj === "bigint") {
      return obj.toString();
    }
    if (typeof obj !== "object") {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return "[" + obj.map((el) => this.canonicalStringify(el)).join(",") + "]";
    }
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(
      (key) => `${JSON.stringify(key)}:${this.canonicalStringify(obj[key])}`,
    );
    return "{" + pairs.join(",") + "}";
  }

  public async appendEntry(payload: any): Promise<any> {
    return this.database.client.$transaction(async (tx) => {
      const lastEntry = await tx.auditLedger.findFirst({
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
      });

      const prevHash = lastEntry ? lastEntry.rowHash : GENESIS_HASH;
      const rowHash = this.calculateRowHash(prevHash, payload);
      const signature = this.kmsService.sign(rowHash);

      return tx.auditLedger.create({
        data: {
          prevHash,
          rowHash,
          payload: payload as any,
          signature,
        },
      });
    });
  }

  public async validateChain(): Promise<{ isValid: boolean; error?: string }> {
    const entries = await this.database.client.auditLedger.findMany({
      orderBy: { createdAt: "asc" },
    });

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      if (entry.prevHash !== expectedPrevHash) {
        return {
          isValid: false,
          error: `Chain broken at entry ${entry.id}: expected prevHash '${expectedPrevHash}' but got '${entry.prevHash}'`,
        };
      }

      const calculatedHash = this.calculateRowHash(entry.prevHash, entry.payload);
      if (entry.rowHash !== calculatedHash) {
        return {
          isValid: false,
          error: `Hash mismatch at entry ${entry.id}: recalculated '${calculatedHash}' but record has '${entry.rowHash}'`,
        };
      }

      const isSignatureValid = this.kmsService.verify(entry.rowHash, entry.signature);
      if (!isSignatureValid) {
        return {
          isValid: false,
          error: `Invalid signature at entry ${entry.id}`,
        };
      }

      expectedPrevHash = entry.rowHash;
    }

    return { isValid: true };
  }
}
