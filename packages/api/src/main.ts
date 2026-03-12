import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = process.env["CORS_ORIGINS"] || "http://localhost:3000,http://localhost:3001";
  app.enableCors({
    origin: corsOrigins.split(","),
    credentials: true,
  });

  const port = process.env["PORT"] || 4000;
  await app.listen(port);
  console.log(`🚀 API server running on port ${port}`);
}

bootstrap();
