import { apiFetch } from "./client.js";

export interface KpiFilters {
  countryCode?: string;
  batchId?: string;
  startDate?: string;
  endDate?: string;
  version?: string;
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

export interface ReconciliationResult {
  tenantId: string;
  exportedAt: string;
  filters: { startDate?: string; endDate?: string };
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

export async function getKpis(filters: KpiFilters = {}): Promise<KpiResult> {
  const qs = new URLSearchParams({ version: filters.version ?? "v1" });
  if (filters.countryCode) qs.set("countryCode", filters.countryCode);
  if (filters.batchId) qs.set("batchId", filters.batchId);
  if (filters.startDate) qs.set("startDate", filters.startDate);
  if (filters.endDate) qs.set("endDate", filters.endDate);
  return apiFetch<KpiResult>(`/dashboard/kpis?${qs}`);
}

export async function getReconciliation(): Promise<ReconciliationResult> {
  return apiFetch<ReconciliationResult>("/dashboard/reconciliation/export");
}

export interface ChartTimelineEntry {
  date: string;
  minted: number;
  circulated: number;
  collected: number;
  recycled: number;
  earned: number;
  cashedOut: number;
}

export interface MaterialDistributionEntry {
  materialCode: string;
  count: number;
}

export interface ChartDataResult {
  timeline: ChartTimelineEntry[];
  materialDistribution: MaterialDistributionEntry[];
}

export async function getChartData(): Promise<ChartDataResult> {
  return apiFetch<ChartDataResult>("/dashboard/charts");
}
