import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@digitalwallet/database";

import { DatabaseService } from "../common/database/database.service.js";

@ApiTags("system")
@Controller({ path: "health", version: "1" })
export class HealthController {
  public constructor(private readonly database: DatabaseService) {}

  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        service: "digitalwallet-api",
        status: "ok",
      },
    },
  })
  public health(): Readonly<{ service: string; status: string }> {
    return {
      service: "digitalwallet-api",
      status: "ok",
    };
  }

  @Get("ready")
  @ApiOkResponse({
    schema: {
      example: {
        checks: { database: "ok", process: "ok" },
        status: "ready",
      },
    },
  })
  public async readiness(): Promise<Readonly<{
    checks: Readonly<{ database: string; process: string }>;
    status: string;
  }>> {
    await this.database.client.$queryRaw(Prisma.sql`SELECT 1`);

    return {
      checks: { database: "ok", process: "ok" },
      status: "ready",
    };
  }
}
