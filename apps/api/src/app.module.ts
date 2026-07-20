import { Module } from "@nestjs/common";

import { DatabaseModule } from "./common/database/database.module.js";
import { RedisModule } from "./common/redis/redis.module.js";
import { HealthModule } from "./health/health.module.js";
import { PackagingModule } from "./packaging/packaging.module.js";
import { CollectionModule } from "./collection/collection.module.js";

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    HealthModule,
    PackagingModule,
    CollectionModule,
  ],
})
export class AppModule {}


