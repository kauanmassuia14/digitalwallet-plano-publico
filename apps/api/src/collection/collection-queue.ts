import { Injectable } from "@nestjs/common";
import { RedisService } from "../common/redis/redis.service.js";

@Injectable()
export class CollectionQueue {
  public constructor(private readonly redisService: RedisService) {}

  private getQueueKey(tenantId: string): string {
    return `tenant:${tenantId}:collections:queue`;
  }

  public async push(tenantId: string, requestId: string): Promise<number> {
    return this.redisService.client.rpush(this.getQueueKey(tenantId), requestId);
  }

  public async pop(tenantId: string): Promise<string | null> {
    return this.redisService.client.lpop(this.getQueueKey(tenantId));
  }

  public async remove(tenantId: string, requestId: string): Promise<number> {
    return this.redisService.client.lrem(this.getQueueKey(tenantId), 0, requestId);
  }

  public async getLength(tenantId: string): Promise<number> {
    return this.redisService.client.llen(this.getQueueKey(tenantId));
  }
}
