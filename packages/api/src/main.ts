import "reflect-metadata";
import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/node";
import { NestFactory } from "@nestjs/core";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { AppModule } from "./app.module";
import { AuthService } from "./auth/auth.service";
import { createContext } from "./trpc/trpc.context";
import { TrpcRouter } from "./trpc/trpc.router";
import { checkRateLimit } from "@missu/utils";
import { recordRequest } from "./metrics/request-metrics";

const SENTRY_DSN = process.env["SENTRY_DSN"];
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env["NODE_ENV"] ?? "development",
    tracesSampleRate: 0.1,
    integrations: [Sentry.expressIntegration()],
  });
}

function structuredLog(level: string, message: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    msg: message,
    ...fields,
  });
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();
  const trpcRouter = app.get(TrpcRouter);
  const authService = app.get(AuthService);

  expressApp.disable("x-powered-by");

  expressApp.use((req: any, res: any, next: any) => {
    req.requestId = req.headers["x-request-id"] ?? randomUUID();
    const start = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - start;
      recordRequest(res.statusCode, durationMs);
      structuredLog("info", "request", {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        durationMs,
      });
    });
    next();
  });

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

  expressApp.use(
    "/trpc",
    createExpressMiddleware({
      router: trpcRouter.appRouter,
      createContext: async ({ req }) => {
        const ip = String(req.headers["x-forwarded-for"] ?? req.ip ?? "unknown").split(",")[0]?.trim() || "unknown";
        const userAgent = String(req.headers["user-agent"] ?? "");
        const token = authService.extractBearerToken(req.headers.authorization);

        if (!token) {
          return createContext({
            userId: null,
            isAdmin: false,
            ip,
            userAgent,
            sessionId: null,
          });
        }

        try {
          const authenticatedUser = await authService.authenticateToken(token);
          return createContext({
            userId: authenticatedUser.userId,
            isAdmin: authenticatedUser.isAdmin,
            ip,
            userAgent,
            sessionId: authenticatedUser.sessionId,
          });
        } catch {
          return createContext({
            userId: null,
            isAdmin: false,
            ip,
            userAgent,
            sessionId: null,
          });
        }
      },
    }),
  );

  if (SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(expressApp);
  }

  const port = process.env["PORT"] || 4000;
  await app.listen(port);
  structuredLog("info", "API server listening", { port: Number(port) });
}

bootstrap().catch((err) => {
  if (SENTRY_DSN) Sentry.captureException(err);
  structuredLog("error", "Bootstrap failed", { error: String(err) });
  process.exit(1);
});
