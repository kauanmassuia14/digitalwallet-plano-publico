import { Injectable, Inject } from "@nestjs/common";
import { DatabaseService } from "../common/database/database.service.js";
import { LedgerService } from "./ledger.service.js";

export interface ReconciliationReport {
  reconciledCount: number;
  discrepancyCount: number;
  discrepancies: Array<{
    requestId: string;
    reason: string;
    details?: any;
  }>;
}

@Injectable()
export class ReconciliationService {
  public constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(LedgerService) private readonly ledgerService: LedgerService,
  ) {}

  public async reconcileTenantCollections(
    tenantId: string,
  ): Promise<ReconciliationReport> {
    const completedRequests =
      await this.database.client.collectionRequest.findMany({
        where: { tenantId, status: "COMPLETED" },
      });

    const ledgerEntries = await this.database.client.auditLedger.findMany({
      orderBy: { createdAt: "asc" },
    });

    const reconciledDiscrepancies: ReconciliationReport["discrepancies"] = [];
    let reconciledCount = 0;

    for (const request of completedRequests) {
      const matchingEntry = ledgerEntries.find((entry) => {
        const payload = entry.payload as any;
        return (
          payload &&
          payload.eventType === "COLLECTION_COMPLETED" &&
          payload.requestId === request.id
        );
      });

      if (!matchingEntry) {
        reconciledDiscrepancies.push({
          requestId: request.id,
          reason:
            "No corresponding AuditLedger entry found for completion event",
        });
        continue;
      }

      const recalculatedHash = this.ledgerService.calculateRowHash(
        matchingEntry.prevHash,
        matchingEntry.payload,
      );

      if (matchingEntry.rowHash !== recalculatedHash) {
        reconciledDiscrepancies.push({
          requestId: request.id,
          reason: "AuditLedger rowHash mismatch (data was modified)",
          details: {
            expected: matchingEntry.rowHash,
            recalculated: recalculatedHash,
          },
        });
        continue;
      }

      const payload = matchingEntry.payload as any;
      if (
        payload.condominiumId !== request.condominiumId ||
        payload.cooperativeId !== request.cooperativeId
      ) {
        reconciledDiscrepancies.push({
          requestId: request.id,
          reason:
            "Discrepancy in collection participants between request and ledger",
          details: { request, ledger: payload },
        });
        continue;
      }

      reconciledCount++;
    }

    return {
      reconciledCount,
      discrepancyCount: reconciledDiscrepancies.length,
      discrepancies: reconciledDiscrepancies,
    };
  }
}
