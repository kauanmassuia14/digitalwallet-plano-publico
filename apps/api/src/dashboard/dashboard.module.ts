import { Module } from "@nestjs/common";
import { DatabaseModule } from "../common/database/database.module.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import { KpiService } from "./kpi.service.js";
import { DashboardController } from "./dashboard.controller.js";

@Module({
  imports: [DatabaseModule, LedgerModule],
  controllers: [DashboardController],
  providers: [KpiService],
  exports: [KpiService],
})
export class DashboardModule {}
