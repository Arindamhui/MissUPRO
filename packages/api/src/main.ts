import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
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

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();

    probe.once("error", () => {
      resolve(false);
    });

    probe.once("listening", () => {
      probe.close(() => resolve(true));
    });

    probe.listen(port, "0.0.0.0");
  });
}

async function resolveApiPort() {
  const explicitPort = process.env["PORT"];
  const defaultPort = 4000;

  if (explicitPort) {
    return Number(explicitPort);
  }

  if (process.env["NODE_ENV"] === "production") {
    return defaultPort;
  }

  for (let candidate = defaultPort; candidate < defaultPort + 20; candidate += 1) {
    // In local dev, avoid hard failure when a stale process still owns 4000.
    // We only auto-shift when PORT is not explicitly configured.
    if (await isPortAvailable(candidate)) {
      if (candidate !== defaultPort) {
        structuredLog("warn", "Default API port is busy; using fallback port", {
          requestedPort: defaultPort,
          fallbackPort: candidate,
        });
      }
      return candidate;
    }
  }

  return defaultPort;
}

// In-memory rate limiter fallback (when Redis is unavailable)
const inMemoryBuckets = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of inMemoryBuckets) {
    if (bucket.resetAt < now) {
      inMemoryBuckets.delete(key);
    }
  }
}, 60_000);

function inMemoryRateLimitCheck(key: string, maxRequests: number, windowSeconds: number): boolean {
  const now = Date.now();
  const bucket = inMemoryBuckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    inMemoryBuckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= maxRequests;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
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
    res.setHeader("X-XSS-Protection", "0");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

    const ip = String(req.headers["x-forwarded-for"] ?? req.ip ?? "unknown").split(",")[0]?.trim() || "unknown";
    const key = `ratelimit:api:${ip}`;

    try {
      const limit = await Promise.race([
        checkRateLimit(key, 600, 60),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), 2000)),
      ]);

      res.setHeader("X-RateLimit-Remaining", String(limit.remaining));
      res.setHeader("X-RateLimit-Reset", String(limit.resetAt));

      if (!limit.allowed) {
        res.status(429).json({ error: "rate_limit_exceeded" });
        return;
      }
    } catch {
      // Redis unavailable — fall through with in-memory rate limiting
      if (!inMemoryRateLimitCheck(ip, 600, 60)) {
        res.status(429).json({ error: "rate_limit_exceeded" });
        return;
      }
    }

    next();
  });

  const corsOrigins = process.env["CORS_ORIGINS"] || "http://localhost:3000,http://localhost:3001";
  app.enableCors({
    origin: corsOrigins.split(",").map((o) => o.trim()).filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Request-Id", "X-Device-Id", "Idempotency-Key"],
    maxAge: 86400,
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
            authRole: null,
            platformRole: null,
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
            authRole: authenticatedUser.authRole,
            platformRole: authenticatedUser.platformRole,
            isAdmin: authenticatedUser.isAdmin,
            ip,
            userAgent,
            sessionId: authenticatedUser.sessionId,
          });
        } catch {
          return createContext({
            userId: null,
            authRole: null,
            platformRole: null,
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

  const port = await resolveApiPort();
  await app.listen(port);
  structuredLog("info", "API server listening", { port: Number(port) });
}

bootstrap().catch((err) => {
  if (SENTRY_DSN) Sentry.captureException(err);
  structuredLog("error", "Bootstrap failed", { error: String(err) });
  process.exit(1);
});
