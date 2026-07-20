import { Injectable, BadRequestException } from "@nestjs/common";
import { Prisma } from "@digitalwallet/database";
import { DatabaseService } from "../common/database/database.service.js";
import { LedgerService } from "../ledger/ledger.service.js";

export interface KpiFilters {
  tenantId: string;
  countryCode?: string;
  batchId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface KpiResult {
  version: string;
  mintedCount: number;
  collectedCount: number;
  recycledCount: number;
  totalCollectedWeightGrams: number;
  totalEarnedCents: number;
  totalCashedOutCents: number;
  totalReversedCents: number;
  returnRate: number;
  co2SavedKg: number;
  redemptionRate: number;
  activeUsersCount: number;
}

export interface FinancialReconciliationResult {
  tenantId: string;
  exportedAt: Date;
  filters: {
    startDate?: Date;
    endDate?: Date;
  };
  financialTotals: {
    totalEarnedCents: number;
    totalCashedOutCents: number;
    totalReversedCents: number;
    totalCurrentBalanceCents: number;
    discrepancyCents: number;
    isReconciled: boolean;
  };
  ledgerValidation: {
    isValid: boolean;
    error: string | null;
    totalChainEntries: number;
  };
}

@Injectable()
export class KpiService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly ledgerService: LedgerService,
  ) {}

  public async calculateKpis(
    version: string,
    filters: KpiFilters,
  ): Promise<KpiResult> {
    const { tenantId, countryCode, batchId, startDate, endDate } = filters;

    const dateFilter =
      startDate || endDate
        ? {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          }
        : undefined;

    const packagingWhere: Prisma.PackagingWhereInput = {
      tenantId,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
      ...(batchId ? { batchId } : {}),
      ...(countryCode ? { batch: { countryCode } } : {}),
    };

    const mintedCount = await this.database.client.packaging.count({
      where: packagingWhere,
    });

    const collectedCount = await this.database.client.packaging.count({
      where: {
        ...packagingWhere,
        status: { in: ["COLLECTED", "RECYCLED"] },
      },
    });

    const recycledCount = await this.database.client.packaging.count({
      where: {
        ...packagingWhere,
        status: "RECYCLED",
      },
    });

    const collectedEvents = await this.database.client.packagingEvent.findMany({
      where: {
        tenantId,
        type: "COLLECTED",
        ...(dateFilter ? { occurredAt: dateFilter } : {}),
        packaging: {
          ...(batchId ? { batchId } : {}),
          ...(countryCode ? { batch: { countryCode } } : {}),
        },
      },
      select: {
        actualWeightGrams: true,
      },
    });

    const totalCollectedWeightGrams = collectedEvents.reduce((sum, e) => {
      return sum + Number(e.actualWeightGrams || 0);
    }, 0);

    const txWhere: Prisma.RewardTransactionWhereInput = {
      tenantId,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
      ...(batchId || countryCode
        ? {
            packaging: {
              ...(batchId ? { batchId } : {}),
              ...(countryCode ? { batch: { countryCode } } : {}),
            },
          }
        : {}),
    };

    const rewardTransactions =
      await this.database.client.rewardTransaction.findMany({
        where: txWhere,
        select: {
          type: true,
          status: true,
          amountCents: true,
          accountId: true,
        },
      });

    let totalEarnedCents = 0;
    let totalCashedOutCents = 0;
    let totalReversedCents = 0;
    const activeUsersSet = new Set<string>();

    const accountIds = Array.from(
      new Set(rewardTransactions.map((t) => t.accountId)),
    );
    const accounts = await this.database.client.rewardAccount.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, userId: true },
    });
    const accountUserMap = new Map<string, string>(
      accounts.map((a) => [a.id, a.userId]),
    );

    for (const tx of rewardTransactions) {
      const amount = Number(tx.amountCents);
      const userId = accountUserMap.get(tx.accountId);
      if (userId) {
        activeUsersSet.add(userId);
      }

      if (tx.status === "SETTLED") {
        if (tx.type === "EARN") {
          totalEarnedCents += amount;
        } else if (tx.type === "CASHOUT") {
          totalCashedOutCents += amount;
        } else {
          totalReversedCents += amount;
        }
      }
    }

    const activeUsersCount = activeUsersSet.size;

    let returnRate = 0;
    let co2SavedKg = 0;
    let redemptionRate = 0;

    if (version === "v1") {
      returnRate = mintedCount > 0 ? (collectedCount / mintedCount) * 100 : 0;
      co2SavedKg = totalCollectedWeightGrams * 0.0025;
      redemptionRate =
        totalEarnedCents > 0
          ? (totalCashedOutCents / totalEarnedCents) * 100
          : 0;
    } else if (version === "v2") {
      returnRate = mintedCount > 0 ? (recycledCount / mintedCount) * 100 : 0;
      co2SavedKg = totalCollectedWeightGrams * 0.003;
      redemptionRate =
        totalEarnedCents - totalReversedCents > 0
          ? (totalCashedOutCents / (totalEarnedCents - totalReversedCents)) *
            100
          : 0;
    } else {
      throw new BadRequestException(`Unsupported KPI version: ${version}`);
    }

    return {
      version,
      mintedCount,
      collectedCount,
      recycledCount,
      totalCollectedWeightGrams,
      totalEarnedCents,
      totalCashedOutCents,
      totalReversedCents,
      returnRate,
      co2SavedKg,
      redemptionRate,
      activeUsersCount,
    };
  }

  public async getFinancialReconciliation(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FinancialReconciliationResult> {
    const dateFilter =
      startDate || endDate
        ? {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          }
        : undefined;

    const txs = await this.database.client.rewardTransaction.findMany({
      where: {
        tenantId,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      select: {
        type: true,
        status: true,
        amountCents: true,
      },
    });

    let totalEarnedCents = 0;
    let totalCashedOutCents = 0;
    let totalReversedCents = 0;

    for (const tx of txs) {
      const amount = Number(tx.amountCents);
      if (tx.status === "SETTLED") {
        if (tx.type === "EARN") {
          totalEarnedCents += amount;
        } else if (tx.type === "CASHOUT") {
          totalCashedOutCents += amount;
        } else {
          totalReversedCents += amount;
        }
      }
    }

    const accounts = await this.database.client.rewardAccount.findMany({
      where: { tenantId },
      select: { balanceCents: true },
    });

    const totalCurrentBalanceCents = accounts.reduce(
      (sum, a) => sum + Number(a.balanceCents),
      0,
    );
    const discrepancy =
      totalEarnedCents -
      totalReversedCents -
      totalCashedOutCents -
      totalCurrentBalanceCents;

    const totalChainEntries = await this.database.client.auditLedger.count();
    const chainValidation = await this.ledgerService.validateChain();

    return {
      tenantId,
      exportedAt: new Date(),
      filters: {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      },
      financialTotals: {
        totalEarnedCents,
        totalCashedOutCents,
        totalReversedCents,
        totalCurrentBalanceCents,
        discrepancyCents: discrepancy,
        isReconciled: discrepancy === 0,
      },
      ledgerValidation: {
        isValid: chainValidation.isValid,
        error: chainValidation.error || null,
        totalChainEntries,
      },
    };
  }
}
