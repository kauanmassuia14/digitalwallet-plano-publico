import { Module } from "@nestjs/common";
import { DatabaseModule } from "../common/database/database.module.js";
import { KmsService } from "./kms.service.js";
import { LedgerService } from "./ledger.service.js";
import { AuditLogService } from "./audit-log.service.js";
import { ReconciliationService } from "./reconciliation.service.js";
import { LedgerController } from "./ledger.controller.js";

@Module({
  imports: [DatabaseModule],
  controllers: [LedgerController],
  providers: [
    KmsService,
    LedgerService,
    AuditLogService,
    ReconciliationService,
  ],
  exports: [LedgerService, AuditLogService, ReconciliationService],
})
export class LedgerModule {}
