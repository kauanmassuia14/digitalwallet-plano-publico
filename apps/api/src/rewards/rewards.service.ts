import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../common/database/database.service.js";
import { CashoutAdapter } from "./cashout-adapter.js";
import { LedgerService } from "../ledger/ledger.service.js";
import type { RewardTransaction, RewardAccount } from "@digitalwallet/database";

@Injectable()
export class RewardsService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly cashoutAdapter: CashoutAdapter,
    private readonly ledgerService: LedgerService,
  ) {}

  public async getAccount(
    tenantId: string,
    userId: string,
  ): Promise<RewardAccount> {
    let account = await this.database.client.rewardAccount.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!account) {
      account = await this.database.client.rewardAccount.create({
        data: { tenantId, userId, balanceCents: 0n, version: 0 },
      });
    }
    return account;
  }

  public async getTransactions(
    tenantId: string,
    accountId: string,
  ): Promise<RewardTransaction[]> {
    return this.database.client.rewardTransaction.findMany({
      where: { tenantId, accountId },
      orderBy: { createdAt: "desc" },
    });
  }

  public async earn(
    tenantId: string,
    userId: string,
    packagingId: string,
    amountCents: number,
    idempotencyKey: string,
  ): Promise<RewardTransaction> {
    return this.database.client.$transaction(async (tx) => {
      // 1. Check idempotency
      const existing = await tx.rewardTransaction.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
      });
      if (existing) {
        return existing;
      }

      // 2. Ensure package was not credited already (W07.2 - Guarantee one credit per packaging under concurrency)
      const existingForPackage = await tx.rewardTransaction.findUnique({
        where: { packagingId },
      });
      if (existingForPackage) {
        throw new BadRequestException(
          "Packaging already credited with rewards",
        );
      }

      // 3. Get and Lock account
      let account = await tx.rewardAccount.findUnique({
        where: { tenantId_userId: { tenantId, userId } },
      });
      if (!account) {
        account = await tx.rewardAccount.create({
          data: { tenantId, userId, balanceCents: 0n, version: 0 },
        });
      }

      await tx.$queryRaw`
        SELECT id FROM "RewardAccount"
        WHERE id = ${account.id}::uuid
        FOR UPDATE
      `;

      const newBalance = account.balanceCents + BigInt(amountCents);

      await tx.rewardAccount.update({
        where: { id: account.id },
        data: {
          balanceCents: newBalance,
          version: { increment: 1 },
        },
      });

      const transaction = await tx.rewardTransaction.create({
        data: {
          tenantId,
          accountId: account.id,
          packagingId,
          type: "EARN",
          status: "SETTLED",
          amountCents: BigInt(amountCents),
          idempotencyKey,
          settledAt: new Date(),
        },
      });

      // W07.1: Write to AuditLedger in the same transaction
      await this.ledgerService.appendEntry({
        eventType: "REWARD_EARNED",
        transactionId: transaction.id,
        tenantId,
        userId,
        packagingId,
        amountCents,
        newBalance: newBalance.toString(),
      });

      return transaction;
    });
  }

  public async cashout(
    tenantId: string,
    userId: string,
    amountCents: number,
    destinationKey: string,
    idempotencyKey: string,
  ): Promise<RewardTransaction> {
    const initialAccount = await this.getAccount(tenantId, userId);
    if (initialAccount.balanceCents < BigInt(amountCents)) {
      throw new BadRequestException("Insufficient funds");
    }

    const transaction = await this.database.client.$transaction(async (tx) => {
      const existing = await tx.rewardTransaction.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
      });
      if (existing) {
        return existing;
      }

      await tx.$queryRaw`
        SELECT id FROM "RewardAccount"
        WHERE id = ${initialAccount.id}::uuid
        FOR UPDATE
      `;

      const account = await tx.rewardAccount.findUnique({
        where: { id: initialAccount.id },
      });

      if (!account || account.balanceCents < BigInt(amountCents)) {
        throw new BadRequestException("Insufficient funds");
      }

      const newBalance = account.balanceCents - BigInt(amountCents);

      await tx.rewardAccount.update({
        where: { id: account.id },
        data: {
          balanceCents: newBalance,
          version: { increment: 1 },
        },
      });

      const rewardTx = await tx.rewardTransaction.create({
        data: {
          tenantId,
          accountId: account.id,
          type: "CASHOUT",
          status: "PENDING",
          amountCents: BigInt(amountCents),
          idempotencyKey,
        },
      });

      await this.ledgerService.appendEntry({
        eventType: "REWARD_CASHOUT_INITIATED",
        transactionId: rewardTx.id,
        tenantId,
        userId,
        amountCents,
        newBalance: newBalance.toString(),
      });

      return rewardTx;
    });

    const adapterResult = await this.cashoutAdapter.processCashout(
      amountCents,
      destinationKey,
    );

    if (adapterResult.success) {
      return this.settleCashout(
        tenantId,
        transaction.id,
        adapterResult.providerReference!,
      );
    } else {
      return this.failCashout(
        tenantId,
        transaction.id,
        adapterResult.failureCode!,
      );
    }
  }

  private async settleCashout(
    tenantId: string,
    transactionId: string,
    providerReference: string,
  ): Promise<RewardTransaction> {
    return this.database.client.$transaction(async (tx) => {
      const rewardTx = await tx.rewardTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!rewardTx || rewardTx.status !== "PENDING") {
        throw new BadRequestException(
          "Transaction not found or not in PENDING state",
        );
      }

      const updated = await tx.rewardTransaction.update({
        where: { id: transactionId },
        data: {
          status: "SETTLED",
          providerReference,
          settledAt: new Date(),
        },
      });

      await this.ledgerService.appendEntry({
        eventType: "REWARD_CASHOUT_SETTLED",
        transactionId: updated.id,
        tenantId,
        providerReference,
      });

      return updated;
    });
  }

  private async failCashout(
    tenantId: string,
    transactionId: string,
    failureCode: string,
  ): Promise<RewardTransaction> {
    return this.database.client.$transaction(async (tx) => {
      const rewardTx = await tx.rewardTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!rewardTx || rewardTx.status !== "PENDING") {
        throw new BadRequestException(
          "Transaction not found or not in PENDING state",
        );
      }

      const account = await tx.rewardAccount.findUnique({
        where: { id: rewardTx.accountId },
      });
      if (account) {
        await tx.$queryRaw`
          SELECT id FROM "RewardAccount"
          WHERE id = ${account.id}::uuid
          FOR UPDATE
        `;

        const newBalance = account.balanceCents + rewardTx.amountCents;

        await tx.rewardAccount.update({
          where: { id: account.id },
          data: {
            balanceCents: newBalance,
            version: { increment: 1 },
          },
        });
      }

      const updated = await tx.rewardTransaction.update({
        where: { id: transactionId },
        data: {
          status: "FAILED",
          failureCode,
          failedAt: new Date(),
        },
      });

      await this.ledgerService.appendEntry({
        eventType: "REWARD_CASHOUT_FAILED",
        transactionId: updated.id,
        tenantId,
        failureCode,
        refundedAmountCents: updated.amountCents.toString(),
      });

      return updated;
    });
  }

  public async reverse(
    tenantId: string,
    originalTransactionId: string,
    idempotencyKey: string,
  ): Promise<RewardTransaction> {
    return this.database.client.$transaction(async (tx) => {
      const existing = await tx.rewardTransaction.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
      });
      if (existing) {
        return existing;
      }

      const originalTx = await tx.rewardTransaction.findUnique({
        where: { id: originalTransactionId },
      });
      if (!originalTx) {
        throw new NotFoundException("Original transaction not found");
      }
      if (originalTx.type !== "EARN" || originalTx.status !== "SETTLED") {
        throw new BadRequestException(
          "Only settled EARN transactions can be reversed",
        );
      }

      const alreadyReversed = await tx.rewardTransaction.findUnique({
        where: { reversalOfId: originalTransactionId },
      });
      if (alreadyReversed) {
        throw new BadRequestException("Transaction already reversed");
      }

      const account = await tx.rewardAccount.findUnique({
        where: { id: originalTx.accountId },
      });
      if (!account) {
        throw new NotFoundException("Account not found");
      }

      await tx.$queryRaw`
        SELECT id FROM "RewardAccount"
        WHERE id = ${account.id}::uuid
        FOR UPDATE
      `;

      const newBalance = account.balanceCents - originalTx.amountCents;

      await tx.rewardAccount.update({
        where: { id: account.id },
        data: {
          balanceCents: newBalance,
          version: { increment: 1 },
        },
      });

      const reversalTx = await tx.rewardTransaction.create({
        data: {
          tenantId,
          accountId: account.id,
          reversalOfId: originalTransactionId,
          type: "REVERSAL",
          status: "SETTLED",
          amountCents: originalTx.amountCents,
          idempotencyKey,
          settledAt: new Date(),
        },
      });

      await this.ledgerService.appendEntry({
        eventType: "REWARD_REVERSED",
        transactionId: reversalTx.id,
        originalTransactionId,
        tenantId,
        reversalAmountCents: originalTx.amountCents.toString(),
        newBalance: newBalance.toString(),
      });

      return reversalTx;
    });
  }
}
