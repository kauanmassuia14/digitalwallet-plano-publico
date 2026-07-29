import { apiFetch } from "./client.js";

export type PackagingStatus =
  "MINTED" | "IN_CIRCULATION" | "COLLECTED" | "RECYCLED";

export interface Packaging {
  id: string;
  tenantId: string;
  batchId: string;
  serial: string;
  materialCode: string;
  status: PackagingStatus;
  expectedWeightGrams: number;
  actualWeightGrams: number | null;
  rewardCents: number;
  unitCostCents: number;
  externalQrHash: string;
  internalQrHash: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  circulatedAt: string | null;
}

export interface PackagingEvent {
  id: string;
  packagingId: string;
  tenantId: string;
  type: string;
  occurredAt: string;
  /** City resolved at scan time — only present for COLLECTED events */
  city?: string;
  countryCode?: string;
  cooperativeId?: string;
  actualWeightGrams?: number;
}

export interface PackagingListParams {
  batchId?: string;
  status?: PackagingStatus;
}

export async function listPackagings(
  params: PackagingListParams = {},
): Promise<Packaging[]> {
  const qs = new URLSearchParams();
  if (params.batchId) qs.set("batchId", params.batchId);
  if (params.status) qs.set("status", params.status);
  const q = qs.toString() ? `?${qs}` : "";
  return apiFetch<Packaging[]>(`/packagings${q}`);
}

export async function getPackaging(id: string): Promise<Packaging> {
  return apiFetch<Packaging>(`/packagings/${id}`);
}

export async function getPackagingEvents(
  id: string,
): Promise<PackagingEvent[]> {
  return apiFetch<PackagingEvent[]>(`/packagings/${id}/events`);
}
