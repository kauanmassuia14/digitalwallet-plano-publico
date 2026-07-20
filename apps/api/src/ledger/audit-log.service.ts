import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../common/database/database.service.js";
import { EncryptionHelper } from "./encryption-helper.js";

export interface CreateAuditLogParams {
  tenantId: string;
  actorType: "USER" | "SYSTEM" | "DEVICE";
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  requestId: string;
  correlationId: string;
  before?: any;
  after?: any;
}

@Injectable()
export class AuditLogService {
  private readonly encryptionHelper = new EncryptionHelper();

  public constructor(private readonly database: DatabaseService) {}

  public async createLog(params: CreateAuditLogParams): Promise<any> {
    const encryptedBefore = params.before
      ? this.encryptionHelper.encrypt(params.before)
      : null;
    const encryptedAfter = params.after
      ? this.encryptionHelper.encrypt(params.after)
      : null;

    return this.database.client.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorType: params.actorType,
        actorId: params.actorId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        requestId: params.requestId,
        correlationId: params.correlationId,
        before: encryptedBefore,
        after: encryptedAfter,
      },
    });
  }

  public async getLogs(tenantId: string): Promise<any[]> {
    const logs = await this.database.client.auditLog.findMany({
      where: { tenantId },
      orderBy: { occurredAt: "desc" },
    });

    return logs.map((log) => ({
      ...log,
      before: log.before ? this.encryptionHelper.decrypt(log.before) : null,
      after: log.after ? this.encryptionHelper.decrypt(log.after) : null,
    }));
  }
}
