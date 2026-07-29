import { Module } from "@nestjs/common";
import { CollectionController } from "./collection.controller.js";
import { CollectionQueue } from "./collection-queue.js";
import { CollectionService } from "./collection.service.js";
import { DatabaseModule } from "../common/database/database.module.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import { PackagingModule } from "../packaging/packaging.module.js";
import { RewardsModule } from "../rewards/rewards.module.js";

@Module({
  imports: [DatabaseModule, LedgerModule, PackagingModule, RewardsModule],
  controllers: [CollectionController],
  providers: [CollectionQueue, CollectionService],
})
export class CollectionModule {}
