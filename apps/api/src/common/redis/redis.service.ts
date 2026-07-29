import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private redisClient!: Redis;

  public onModuleInit(): void {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:56379";
    this.redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      connectTimeout: 5_000,
      retryStrategy: (times: number) => {
        if (times > 3) {
          this.logger.error(
            `Redis: failed to connect after ${times} attempts — giving up`,
          );
          return null; // stop retrying
        }
        return Math.min(times * 500, 2_000);
      },
      lazyConnect: false,
    });

    this.redisClient.on("error", (err: Error) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });

    this.redisClient.on("connect", () => {
      this.logger.log("Redis connected");
    });
  }

  public async onApplicationShutdown(): Promise<void> {
    await this.redisClient.quit();
  }

  public get client(): Redis {
    return this.redisClient;
  }
}
