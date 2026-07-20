import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { LedgerService } from "./ledger.service.js";
import { KmsService } from "./kms.service.js";
import { AuditLogService } from "./audit-log.service.js";
import { ReconciliationService, ReconciliationReport } from "./reconciliation.service.js";
import { TenantContextGuard } from "../common/tenant/tenant-context.guard.js";
import { CurrentTenant } from "../common/tenant/tenant-context.js";

@Controller({ path: "ledger", version: "1" })
export class LedgerController {
  public constructor(
    private readonly ledgerService: LedgerService,
    private readonly kmsService: KmsService,
    private readonly auditLogService: AuditLogService,
    private readonly reconciliationService: ReconciliationService,
  ) {}

  @Get("public-key")
  public getPublicKey(): { publicKey: string } {
    return { publicKey: this.kmsService.getPublicKey() };
  }

  @Get("validate")
  public async validateChain(): Promise<{ isValid: boolean; error?: string }> {
    return this.ledgerService.validateChain();
  }

  @Get("audit-logs")
  @UseGuards(TenantContextGuard)
  public async getAuditLogs(@CurrentTenant() tenantId: string): Promise<any[]> {
    return this.auditLogService.getLogs(tenantId);
  }

  @Post("reconcile")
  @UseGuards(TenantContextGuard)
  public async reconcile(@CurrentTenant() tenantId: string): Promise<ReconciliationReport> {
    return this.reconciliationService.reconcileTenantCollections(tenantId);
  }
}
