import { Module } from "@nestjs/common";
import { DatabaseModule } from "../common/database/database.module.js";
import { KmsService } from "./kms.service.js";
import { LedgerService } from "./ledger.service.js";
import { LedgerController } from "./ledger.controller.js";

@Module({
  imports: [DatabaseModule],
  controllers: [LedgerController],
  providers: [KmsService, LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
