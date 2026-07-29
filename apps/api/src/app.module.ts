import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { DatabaseModule } from "./common/database/database.module.js";
import { RedisModule } from "./common/redis/redis.module.js";
import { AuthModule } from "./common/tenant/auth.module.js";
import { HealthModule } from "./health/health.module.js";
import { PackagingModule } from "./packaging/packaging.module.js";
import { CollectionModule } from "./collection/collection.module.js";
import { LedgerModule } from "./ledger/ledger.module.js";
import { RewardsModule } from "./rewards/rewards.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { ChatModule } from "./chat/chat.module.js";

import { IdempotencyInterceptor } from "./common/tenant/idempotency.interceptor.js";
import { AuditInterceptor } from "./common/tenant/audit.interceptor.js";

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    AuthModule,
    HealthModule,
    PackagingModule,
    CollectionModule,
    LedgerModule,
    RewardsModule,
    DashboardModule,
    ChatModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
