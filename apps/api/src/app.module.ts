import { Module } from "@nestjs/common";

import { DatabaseModule } from "./common/database/database.module.js";
import { HealthModule } from "./health/health.module.js";
import { PackagingModule } from "./packaging/packaging.module.js";

@Module({
  imports: [DatabaseModule, HealthModule, PackagingModule],
})
export class AppModule {}
