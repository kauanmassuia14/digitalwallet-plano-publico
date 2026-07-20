import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { RewardsService } from "./rewards.service.js";
import { TenantContextGuard } from "../common/tenant/tenant-context.guard.js";
import { CurrentTenant, CurrentUser, AuthenticatedUser } from "../common/tenant/tenant-context.js";
import { EarnDto } from "./dto/earn.dto.js";
import { CashoutDto } from "./dto/cashout.dto.js";
import { ReverseDto } from "./dto/reverse.dto.js";

// Helper to format BigInt
function formatTransaction(tx: any): any {
  return {
    id: tx.id,
    tenantId: tx.tenantId,
    accountId: tx.accountId,
    packagingId: tx.packagingId,
    reversalOfId: tx.reversalOfId,
    type: tx.type,
    status: tx.status,
    amountCents: Number(tx.amountCents),
    idempotencyKey: tx.idempotencyKey,
    externalReference: tx.externalReference,
    providerReference: tx.providerReference,
    chainTransactionHash: tx.chainTransactionHash,
    settledAt: tx.settledAt,
    failedAt: tx.failedAt,
    failureCode: tx.failureCode,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  };
}

@Controller({ path: "rewards", version: "1" })
@UseGuards(TenantContextGuard)
export class RewardsController {
  public constructor(private readonly rewardsService: RewardsService) {}

  @Get("balance")
  public async getBalance(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<any> {
    const account = await this.rewardsService.getAccount(tenantId, user.id);
    return {
      accountId: account.id,
      tenantId: account.tenantId,
      userId: account.userId,
      balanceCents: Number(account.balanceCents),
      version: account.version,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  @Get("transactions")
  public async getTransactions(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<any[]> {
    const account = await this.rewardsService.getAccount(tenantId, user.id);
    const txs = await this.rewardsService.getTransactions(tenantId, account.id);
    return txs.map(formatTransaction);
  }

  @Post("earn")
  public async earn(
    @CurrentTenant() tenantId: string,
    @Body() body: EarnDto,
  ): Promise<any> {
    const tx = await this.rewardsService.earn(
      tenantId,
      body.userId,
      body.packagingId,
      body.amountCents,
      body.idempotencyKey,
    );
    return formatTransaction(tx);
  }

  @Post("cashout")
  public async cashout(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CashoutDto,
  ): Promise<any> {
    const tx = await this.rewardsService.cashout(
      tenantId,
      user.id,
      body.amountCents,
      body.destinationKey,
      body.idempotencyKey,
    );
    return formatTransaction(tx);
  }

  @Post("reverse")
  public async reverse(
    @CurrentTenant() tenantId: string,
    @Body() body: ReverseDto,
  ): Promise<any> {
    const tx = await this.rewardsService.reverse(
      tenantId,
      body.originalTransactionId,
      body.idempotencyKey,
    );
    return formatTransaction(tx);
  }
}
