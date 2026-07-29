import { Injectable, BadRequestException, Inject } from "@nestjs/common";
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
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(LedgerService) private readonly ledgerService: LedgerService,
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

  public async getChartData(tenantId: string): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // 1. Fetch Packaging Lifecycle Data
    const packagings = await this.database.client.packaging.findMany({
      where: {
        tenantId,
        mintedAt: { gte: thirtyDaysAgo },
      },
      select: {
        mintedAt: true,
        circulatedAt: true,
        collectedAt: true,
        recycledAt: true,
        materialCode: true,
      },
    });

    // 2. Fetch Financial Data
    const transactions = await this.database.client.rewardTransaction.findMany({
      where: {
        tenantId,
        status: "SETTLED",
        settledAt: { gte: thirtyDaysAgo },
      },
      select: {
        type: true,
        amountCents: true,
        settledAt: true,
        createdAt: true,
      },
    });

    // Generate date map for last 30 days
    const dailyDataMap = new Map<
      string,
      {
        date: string;
        minted: number;
        circulated: number;
        collected: number;
        recycled: number;
        earned: number;
        cashedOut: number;
      }
    >();

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]!;
      dailyDataMap.set(dateStr, {
        date: dateStr,
        minted: 0,
        circulated: 0,
        collected: 0,
        recycled: 0,
        earned: 0,
        cashedOut: 0,
      });
    }

    const formatDate = (date: Date | null): string | null => {
      if (!date) return null;
      return new Date(date).toISOString().split("T")[0] || null;
    };

    // Populate packaging counts
    for (const pkg of packagings) {
      const mintedDate = formatDate(pkg.mintedAt);
      if (mintedDate && dailyDataMap.has(mintedDate)) {
        dailyDataMap.get(mintedDate)!.minted++;
      }
      const circulatedDate = formatDate(pkg.circulatedAt);
      if (circulatedDate && dailyDataMap.has(circulatedDate)) {
        dailyDataMap.get(circulatedDate)!.circulated++;
      }
      const collectedDate = formatDate(pkg.collectedAt);
      if (collectedDate && dailyDataMap.has(collectedDate)) {
        dailyDataMap.get(collectedDate)!.collected++;
      }
      const recycledDate = formatDate(pkg.recycledAt);
      if (recycledDate && dailyDataMap.has(recycledDate)) {
        dailyDataMap.get(recycledDate)!.recycled++;
      }
    }

    // Populate transaction sums
    for (const tx of transactions) {
      const txDate = formatDate(tx.settledAt ?? tx.createdAt);
      if (txDate && dailyDataMap.has(txDate)) {
        const entry = dailyDataMap.get(txDate)!;
        const amount = Number(tx.amountCents);
        if (tx.type === "EARN") {
          entry.earned += amount;
        } else if (tx.type === "CASHOUT") {
          entry.cashedOut += amount;
        }
      }
    }

    const timeline = Array.from(dailyDataMap.values());

    // 3. Material Distribution (over all time)
    const materialCounts = await this.database.client.packaging.groupBy({
      by: ["materialCode"],
      where: { tenantId },
      _count: {
        id: true,
      },
    });

    const materialDistribution = materialCounts.map((mc) => ({
      materialCode: mc.materialCode,
      count: mc._count.id,
    }));

    return {
      timeline,
      materialDistribution,
    };
  }
}
