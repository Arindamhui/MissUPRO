import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { checkRateLimit } from "@missu/utils";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.disable("x-powered-by");

  expressApp.use(async (req: any, res: any, next: any) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(self)");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; base-uri 'self'");

    const ip = String(req.headers["x-forwarded-for"] ?? req.ip ?? "unknown").split(",")[0]?.trim() || "unknown";
    const key = `ratelimit:api:${ip}`;
    const limit = await checkRateLimit(key, 600, 60);

    res.setHeader("X-RateLimit-Remaining", String(limit.remaining));
    res.setHeader("X-RateLimit-Reset", String(limit.resetAt));

    if (!limit.allowed) {
      res.status(429).json({ error: "rate_limit_exceeded" });
      return;
    }

    next();
  });

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
