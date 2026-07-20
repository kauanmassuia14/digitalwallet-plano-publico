import {
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private redisClient!: Redis;

  public onModuleInit(): void {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:56379";
    this.redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
    });
  }

  public async onApplicationShutdown(): Promise<void> {
    await this.redisClient.quit();
  }

  public get client(): Redis {
    return this.redisClient;
  }
}
