import "./instrumentation.js";
import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import { configureApplication } from "./configure-application.js";

const logger = new Logger("Bootstrap");

async function bootstrap(): Promise<void> {
  console.log("[bootstrap] Creating NestJS application...");
  const app = await NestFactory.create(AppModule);
  console.log("[bootstrap] NestJS application created — configuring...");
  configureApplication(app);

  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  await app.listen(port, "0.0.0.0");
  logger.log(`DigitalWallet API listening on port ${port}`);
}

void bootstrap().catch((error: unknown) => {
  logger.error(
    "DigitalWallet API failed to start",
    error instanceof Error ? error.stack : String(error),
  );
  process.exitCode = 1;
});
