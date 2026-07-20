import { Module } from "@nestjs/common";
import { DatabaseModule } from "../common/database/database.module.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import { CashoutAdapter } from "./cashout-adapter.js";
import { RewardsService } from "./rewards.service.js";
import { RewardsController } from "./rewards.controller.js";

@Module({
  imports: [DatabaseModule, LedgerModule],
  controllers: [RewardsController],
  providers: [CashoutAdapter, RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}
