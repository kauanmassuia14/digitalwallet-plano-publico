import { apiFetch } from "./client.js";

export type ImportJobStatus =
  "PENDING" | "VALIDATING" | "READY" | "COMMITTED" | "REJECTED";

export interface ImportJob {
  id: string;
  tenantId: string;
  status: ImportJobStatus;
  contractVersion: string;
  sourceEventId: string;
  fileHash: string;
  objectKey: string;
  originalFileName: string;
  acceptedRows: number;
  rejectedRows: number;
  totalRows: number;
  errorReportKey: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface PackagingBatch {
  id: string;
  tenantId: string;
  importJobId: string;
  code: string;
  countryCode: string;
  currencyCode: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function listImportJobs(): Promise<ImportJob[]> {
  return apiFetch<ImportJob[]>("/imports");
}

export async function getImportJob(jobId: string): Promise<ImportJob> {
  return apiFetch<ImportJob>(`/imports/${jobId}`);
}

export async function commitImportJob(jobId: string): Promise<ImportJob> {
  return apiFetch<ImportJob>(`/imports/${jobId}/commit`, { method: "POST" });
}
