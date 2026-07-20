import { Controller, Get, Query } from "@nestjs/common";
import { LedgerService } from "./ledger.service.js";
import { KmsService } from "./kms.service.js";

@Controller({ path: "ledger", version: "1" })
export class LedgerController {
  public constructor(
    private readonly ledgerService: LedgerService,
    private readonly kmsService: KmsService,
  ) {}

  @Get("public-key")
  public getPublicKey(): { publicKey: string } {
    return { publicKey: this.kmsService.getPublicKey() };
  }

  @Get("validate")
  public async validateChain(): Promise<{ isValid: boolean; error?: string }> {
    return this.ledgerService.validateChain();
  }
}
