import { Module } from "@nestjs/common";

import { TenantContextGuard } from "../common/tenant/tenant-context.guard.js";
import { BatchImportRepository } from "./batch-import.repository.js";
import { PackagingController } from "./packaging.controller.js";
import { PackagingRepository } from "./packaging.repository.js";
import { PackagingService } from "./packaging.service.js";
import { PrismaBatchImportRepository } from "./prisma-batch-import.repository.js";
import { PrismaPackagingRepository } from "./prisma-packaging.repository.js";

@Module({
  controllers: [PackagingController],
  providers: [
    TenantContextGuard,
    PackagingService,
    {
      provide: PackagingRepository,
      useClass: PrismaPackagingRepository,
    },
    {
      provide: BatchImportRepository,
      useClass: PrismaBatchImportRepository,
    },
  ],
})
export class PackagingModule {}
