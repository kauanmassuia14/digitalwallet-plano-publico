import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { KpiService } from "./kpi.service.js";
import { TenantContextGuard } from "../common/tenant/tenant-context.guard.js";
import { CurrentTenant } from "../common/tenant/tenant-context.js";

@Controller({ path: "dashboard", version: "1" })
@UseGuards(TenantContextGuard)
export class DashboardController {
  public constructor(private readonly kpiService: KpiService) {}

  @Get("kpis")
  public async getKpis(
    @CurrentTenant() tenantId: string,
    @Query("version") version: string = "v1",
    @Query("countryCode") countryCode?: string,
    @Query("batchId") batchId?: string,
    @Query("startDate") startDateStr?: string,
    @Query("endDate") endDateStr?: string,
  ): Promise<any> {
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    return this.kpiService.calculateKpis(version, {
      tenantId,
      countryCode,
      batchId,
      startDate,
      endDate,
    });
  }

  @Get("reconciliation/export")
  public async exportReconciliation(
    @CurrentTenant() tenantId: string,
    @Query("startDate") startDateStr?: string,
    @Query("endDate") endDateStr?: string,
  ): Promise<any> {
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    return this.kpiService.getFinancialReconciliation(tenantId, startDate, endDate);
  }
}
