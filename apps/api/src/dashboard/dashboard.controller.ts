import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import {
  KpiService,
  KpiResult,
  FinancialReconciliationResult,
} from "./kpi.service.js";
import { TenantContextGuard } from "../common/tenant/tenant-context.guard.js";
import { CurrentTenant } from "../common/tenant/tenant-context.js";

@Controller({ path: "dashboard", version: "1" })
@UseGuards(TenantContextGuard)
export class DashboardController {
  public constructor(
    @Inject(KpiService) private readonly kpiService: KpiService,
  ) {}

  @Get("kpis")
  public async getKpis(
    @CurrentTenant() tenantId: string,
    @Query("version") version: string = "v1",
    @Query("countryCode") countryCode?: string,
    @Query("batchId") batchId?: string,
    @Query("startDate") startDateStr?: string,
    @Query("endDate") endDateStr?: string,
  ): Promise<KpiResult> {
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    return this.kpiService.calculateKpis(version, {
      tenantId,
      ...(countryCode ? { countryCode } : {}),
      ...(batchId ? { batchId } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    });
  }

  @Get("reconciliation/export")
  public async exportReconciliation(
    @CurrentTenant() tenantId: string,
    @Query("startDate") startDateStr?: string,
    @Query("endDate") endDateStr?: string,
  ): Promise<FinancialReconciliationResult> {
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    return this.kpiService.getFinancialReconciliation(
      tenantId,
      startDate,
      endDate,
    );
  }

  @Get("charts")
  public async getChartData(@CurrentTenant() tenantId: string): Promise<any> {
    return this.kpiService.getChartData(tenantId);
  }
}
