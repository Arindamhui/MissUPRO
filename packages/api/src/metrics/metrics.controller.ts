import { Controller, Get, Header } from "@nestjs/common";
import { db } from "@missu/db";
import { sql } from "drizzle-orm";
import { getRedis } from "@missu/utils";
import { getRequestMetrics } from "./request-metrics";

@Controller("metrics")
export class MetricsController {
  @Get()
  @Header("content-type", "text/plain; version=0.0.4")
  async getMetrics() {
    const uptime = Math.floor(process.uptime());
    const mem = process.memoryUsage();

    let dbUp = 1;
    let redisUp = 1;

    try {
      await db.execute(sql`SELECT 1`);
    } catch {
      dbUp = 0;
    }

    try {
      await getRedis().ping();
    } catch {
      redisUp = 0;
    }

    const reqMetrics = getRequestMetrics();

    return [
      `api_uptime_seconds ${uptime}`,
      `api_memory_rss_bytes ${mem.rss}`,
      `api_memory_heap_used_bytes ${mem.heapUsed}`,
      `api_db_up ${dbUp}`,
      `api_redis_up ${redisUp}`,
      `api_http_requests_total ${reqMetrics.requestsTotal}`,
      `api_http_requests_errors_total ${reqMetrics.requestsErrorsTotal}`,
      `api_http_request_duration_seconds_sum ${(reqMetrics.requestDurationSumMs / 1000).toFixed(4)}`,
      `api_http_request_duration_seconds_count ${reqMetrics.requestDurationCount}`,
    ].join("\n") + "\n";
  }
}
