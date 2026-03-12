import { Controller, Get } from "@nestjs/common";
import { db } from "@missu/db";
import { sql } from "drizzle-orm";
import { getRedis } from "@missu/utils";
import { HEALTH } from "@missu/config";

@Controller("health")
export class HealthController {
  @Get()
  async liveness() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("ready")
  async readiness() {
    const checks: Record<string, "ok" | "fail"> = {};

    // DB check
    try {
      await Promise.race([
        db.execute(sql`SELECT 1`),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("DB timeout")), HEALTH.DB_TIMEOUT_MS),
        ),
      ]);
      checks["database"] = "ok";
    } catch {
      checks["database"] = "fail";
    }

    // Redis check
    try {
      await Promise.race([
        getRedis().ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Redis timeout")), HEALTH.REDIS_TIMEOUT_MS),
        ),
      ]);
      checks["redis"] = "ok";
    } catch {
      checks["redis"] = "fail";
    }

    const allOk = Object.values(checks).every((v) => v === "ok");
    return { status: allOk ? "ready" : "degraded", checks };
  }
}
