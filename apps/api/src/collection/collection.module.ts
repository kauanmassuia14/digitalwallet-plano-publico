import { Module } from "@nestjs/common";
import { CollectionController } from "./collection.controller.js";
import { CollectionQueue } from "./collection-queue.js";
import { CollectionService } from "./collection.service.js";
import { DatabaseModule } from "../common/database/database.module.js";
import { LedgerModule } from "../ledger/ledger.module.js";

@Module({
  imports: [DatabaseModule, LedgerModule],
  controllers: [CollectionController],
  providers: [CollectionQueue, CollectionService],
})
export class CollectionModule {}
