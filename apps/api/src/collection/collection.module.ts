import { Module } from "@nestjs/common";
import { CollectionController } from "./collection.controller.js";
import { CollectionQueue } from "./collection-queue.js";
import { CollectionService } from "./collection.service.js";

@Module({
  controllers: [CollectionController],
  providers: [CollectionQueue, CollectionService],
})
export class CollectionModule {}
