import { Module } from "@nestjs/common";

import { DatabaseModule } from "./common/database/database.module.js";
import { RedisModule } from "./common/redis/redis.module.js";
import { HealthModule } from "./health/health.module.js";
import { PackagingModule } from "./packaging/packaging.module.js";
import { CollectionModule } from "./collection/collection.module.js";
import { LedgerModule } from "./ledger/ledger.module.js";
import { RewardsModule } from "./rewards/rewards.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    HealthModule,
    PackagingModule,
    CollectionModule,
    LedgerModule,
    RewardsModule,
    DashboardModule,
  ],
})
export class AppModule {}


