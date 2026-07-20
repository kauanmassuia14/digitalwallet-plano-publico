import {
  RequestMethod,
  ValidationPipe,
  VersioningType,
  type INestApplication,
} from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { ApiExceptionFilter } from "./common/errors/api-exception.filter.js";

export function configureApplication(app: INestApplication): void {
  app.setGlobalPrefix("api", {
    exclude: [{ method: RequestMethod.GET, path: "/" }],
  });
  app.enableVersioning({
    defaultVersion: "1",
    type: VersioningType.URI,
  });
  app.enableShutdownHooks();
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      whitelist: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("DigitalWallet API")
    .setDescription("Versioned contracts for the circular packaging pilot")
    .setVersion("0.1.0")
    .addApiKey(
      {
        description: "Local-only tenant adapter",
        in: "header",
        name: "x-tenant-id",
        type: "apiKey",
      },
      "localTenant",
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document, {
    jsonDocumentUrl: "api/docs/openapi.json",
  });
}
