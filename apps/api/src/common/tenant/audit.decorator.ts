import { SetMetadata } from "@nestjs/common";

export interface AuditOptions {
  action: string;
  resourceType: string;
}

export const AUDIT_KEY = "audit_options";
export const Audit = (options: AuditOptions) => SetMetadata(AUDIT_KEY, options);
