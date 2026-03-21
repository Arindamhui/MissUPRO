import { NextResponse } from "next/server";
import { pool } from "@missu/db";
import { getRedis } from "@missu/cache";
import { logger } from "@missu/logger";

interface ComponentHealth {
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs: number;
  message?: string;
}

async function checkDb(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      return { status: "healthy", latencyMs: Date.now() - start };
    } finally {
      client.release();
    }
  } catch (error) {
    return { status: "unhealthy", latencyMs: Date.now() - start, message: (error as Error).message };
  }
}

async function checkRedis(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const client = getRedis();
    if (!client) {
      return { status: "degraded", latencyMs: 0, message: "redis_not_configured" };
    }
    if (client.status === "wait") {
      await client.connect();
    }
    await client.ping();
    return { status: "healthy", latencyMs: Date.now() - start };
  } catch {
    return { status: "degraded", latencyMs: Date.now() - start, message: "redis_unreachable" };
  }
}

export async function GET() {
  const start = Date.now();

  const [dbHealth, redisHealth] = await Promise.all([
    checkDb(),
    checkRedis(),
  ]);

  const overallStatus = dbHealth.status === "unhealthy"
    ? "unhealthy"
    : (dbHealth.status === "degraded" || redisHealth.status === "unhealthy")
      ? "degraded"
      : "healthy";

  const body = {
    status: overallStatus,
    version: process.env.APP_VERSION ?? "dev",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    components: {
      database: dbHealth,
      redis: redisHealth,
    },
    totalLatencyMs: Date.now() - start,
  };

  const httpStatus = overallStatus === "unhealthy" ? 503 : 200;

  logger.debug("health_check", { status: overallStatus, totalMs: body.totalLatencyMs });

  return NextResponse.json(body, { status: httpStatus });
}
