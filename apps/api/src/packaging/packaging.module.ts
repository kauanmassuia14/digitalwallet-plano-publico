import { Module } from "@nestjs/common";

import { BatchImportRepository } from "./batch-import.repository.js";
import { ImportController } from "./import.controller.js";
import { ImportService } from "./import.service.js";
import { PackagingController } from "./packaging.controller.js";
import { PackagingRepository } from "./packaging.repository.js";
import { PackagingService } from "./packaging.service.js";
import { PrismaBatchImportRepository } from "./prisma-batch-import.repository.js";
import { PrismaPackagingRepository } from "./prisma-packaging.repository.js";

@Module({
  controllers: [PackagingController, ImportController],
  providers: [
    PackagingService,
    ImportService,
    {
      provide: PackagingRepository,
      useClass: PrismaPackagingRepository,
    },
    {
      provide: BatchImportRepository,
      useClass: PrismaBatchImportRepository,
    },
  ],
  exports: [PackagingService],
})
export class PackagingModule {}
