import {
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import {
  createDatabaseClient,
  type DatabaseClient,
} from "@digitalwallet/database";
import { config as loadEnvironment } from "dotenv";
import { fileURLToPath } from "node:url";

loadEnvironment({
  path: fileURLToPath(new URL("../../../../../.env", import.meta.url)),
  quiet: true,
});

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  public readonly client: DatabaseClient;

  public constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (connectionString === undefined || connectionString.trim().length === 0) {
      throw new TypeError("DATABASE_URL is required to start the API");
    }

    this.client = createDatabaseClient({
      connectionString,
      log:
        process.env.DATABASE_LOG_QUERIES === "true"
          ? ["query", "info", "warn", "error"]
          : ["warn", "error"],
    });
  }

  public async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  public async onApplicationShutdown(): Promise<void> {
    await this.client.$disconnect();
  }
}
