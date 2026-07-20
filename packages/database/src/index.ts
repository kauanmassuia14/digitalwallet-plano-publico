import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "../generated/prisma/client.js";

export { Prisma };
export {
  AuditActorType,
  IdempotencyStatus,
  ImportJobStatus,
  OutboxStatus,
  PackagingBatchStatus,
  PackagingEventType,
  PackagingStatus,
  RewardTransactionType,
  TenantMembershipRole,
  TransactionStatus,
} from "../generated/prisma/enums.js";
export type {
  AuditLog,
  IdempotencyRecord,
  ImportJob,
  OutboxEvent,
  Packaging,
  PackagingBatch,
  PackagingEvent,
  RewardAccount,
  RewardTransaction,
  Tenant,
  TenantMembership,
  User,
} from "../generated/prisma/client.js";

export type DatabaseClient = PrismaClient;
export type DatabaseTransaction = Omit<
  DatabaseClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export interface CreateDatabaseClientOptions {
  readonly connectionString: string;
  readonly log?: Prisma.LogLevel[];
}

export function createDatabaseClient(
  options: CreateDatabaseClientOptions,
): DatabaseClient {
  if (options.connectionString.trim().length === 0) {
    throw new TypeError("Database connection string must not be blank");
  }

  const adapter = new PrismaPg({
    connectionString: options.connectionString,
  });

  return new PrismaClient({
    adapter,
    ...(options.log === undefined ? {} : { log: options.log }),
  });
}
