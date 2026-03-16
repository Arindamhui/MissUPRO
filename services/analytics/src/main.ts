import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import Redis from "ioredis";

const service = process.env["SERVICE_NAME"] ?? "analytics";
const port = Number(process.env["PORT"] ?? "4108");
const startedAt = new Date().toISOString();
const redisUrl = process.env["REDIS_URL"] ?? "redis://127.0.0.1:6379";

const redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });

let eventsIngested = 0;
let eventsFlushed = 0;
let batchesFlushed = 0;

const EVENT_BUFFER_SIZE = Number(process.env["ANALYTICS_BUFFER_SIZE"] ?? "100");
const FLUSH_INTERVAL_MS = Number(process.env["ANALYTICS_FLUSH_INTERVAL_MS"] ?? "5000");

type AnalyticsEvent = {
  id: string;
  eventName: string;
  userId?: string;
  anonymousId?: string;
  sessionId?: string;
  platform?: string;
  appVersion?: string;
  region?: string;
  payload?: Record<string, unknown>;
  receivedAt: string;
};

const eventBuffer: AnalyticsEvent[] = [];

async function flushBuffer() {
  if (eventBuffer.length === 0) return;
  const batch = eventBuffer.splice(0, eventBuffer.length);
  try {
    const pipeline = redis.pipeline();
    for (const event of batch) {
      pipeline.lpush("analytics:events:store", JSON.stringify(event));
    }
    const dayKey = new Date().toISOString().slice(0, 10);
    pipeline.incrby(`analytics:counter:${dayKey}`, batch.length);
    const uniqueUsers = new Set(batch.filter(e => e.userId).map(e => e.userId));
    for (const uid of uniqueUsers) {
      pipeline.sadd(`analytics:dau:${dayKey}`, uid!);
      pipeline.expire(`analytics:dau:${dayKey}`, 172800);
    }
    const eventCounts: Record<string, number> = {};
    for (const event of batch) {
      eventCounts[event.eventName] = (eventCounts[event.eventName] ?? 0) + 1;
    }
    for (const [name, count] of Object.entries(eventCounts)) {
      pipeline.hincrby(`analytics:event_counts:${dayKey}`, name, count);
      pipeline.expire(`analytics:event_counts:${dayKey}`, 604800);
    }
    await pipeline.exec();
    eventsFlushed += batch.length;
    batchesFlushed += 1;
  } catch (e) {
    eventBuffer.unshift(...batch);
    console.error(`[${service}] flush error`, e);
  }
}

const flushTimer = setInterval(() => { void flushBuffer(); }, FLUSH_INTERVAL_MS);

async function parseJsonBody(req: import("node:http").IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => { raw += chunk; });
    req.on("end", () => {
      if (!raw) { resolve({}); return; }
      try { resolve(JSON.parse(raw) as Record<string, unknown>); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

void redis.connect().catch((e) => console.error(`[${service}] Redis connect error`, e));

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  if (url === "/health" && method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      service, status: "ok", startedAt, sink: "analytics_events",
      counters: { eventsIngested, eventsFlushed, batchesFlushed, bufferSize: eventBuffer.length },
    }));
    return;
  }

  if (url === "/metrics" && method === "GET") {
    res.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
    res.end([
      `service_uptime_seconds{service="${service}"} ${Math.floor(process.uptime())}`,
      `analytics_events_ingested_total{service="${service}"} ${eventsIngested}`,
      `analytics_events_flushed_total{service="${service}"} ${eventsFlushed}`,
      `analytics_batches_flushed_total{service="${service}"} ${batchesFlushed}`,
      `analytics_buffer_size{service="${service}"} ${eventBuffer.length}`,
    ].join("\n") + "\n");
    return;
  }

  if (url === "/ingest" && method === "POST") {
    void (async () => {
      const body = await parseJsonBody(req);
      const event: AnalyticsEvent = {
        id: randomUUID(),
        eventName: String(body["eventName"] ?? "unknown"),
        userId: body["userId"] as string | undefined,
        anonymousId: body["anonymousId"] as string | undefined,
        sessionId: body["sessionId"] as string | undefined,
        platform: body["platform"] as string | undefined,
        appVersion: body["appVersion"] as string | undefined,
        region: body["region"] as string | undefined,
        payload: body["payload"] as Record<string, unknown> | undefined,
        receivedAt: new Date().toISOString(),
      };
      eventBuffer.push(event);
      eventsIngested += 1;
      if (eventBuffer.length >= EVENT_BUFFER_SIZE) {
        await flushBuffer();
      }
      res.writeHead(202, { "content-type": "application/json" });
      res.end(JSON.stringify({ accepted: true, eventId: event.id }));
    })().catch((e) => {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ accepted: false, error: String(e) }));
    });
    return;
  }

  if (url === "/ingest/batch" && method === "POST") {
    void (async () => {
      const body = await parseJsonBody(req);
      const events = body["events"] as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(events) || events.length === 0) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "events array required" }));
        return;
      }
      const ids: string[] = [];
      for (const raw of events.slice(0, 500)) {
        const id = randomUUID();
        eventBuffer.push({
          id,
          eventName: String(raw["eventName"] ?? "unknown"),
          userId: raw["userId"] as string | undefined,
          anonymousId: raw["anonymousId"] as string | undefined,
          sessionId: raw["sessionId"] as string | undefined,
          platform: raw["platform"] as string | undefined,
          appVersion: raw["appVersion"] as string | undefined,
          region: raw["region"] as string | undefined,
          payload: raw["payload"] as Record<string, unknown> | undefined,
          receivedAt: new Date().toISOString(),
        });
        ids.push(id);
        eventsIngested += 1;
      }
      if (eventBuffer.length >= EVENT_BUFFER_SIZE) {
        await flushBuffer();
      }
      res.writeHead(202, { "content-type": "application/json" });
      res.end(JSON.stringify({ accepted: true, count: ids.length }));
    })().catch((e) => {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ accepted: false, error: String(e) }));
    });
    return;
  }

  if (url.startsWith("/query/dau") && method === "GET") {
    void (async () => {
      const parsed = new URL(url, `http://127.0.0.1:${port}`);
      const date = parsed.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
      const count = await redis.scard(`analytics:dau:${date}`);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ date, dau: count }));
    })().catch((e) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    });
    return;
  }

  if (url.startsWith("/query/event-counts") && method === "GET") {
    void (async () => {
      const parsed = new URL(url, `http://127.0.0.1:${port}`);
      const date = parsed.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
      const counts = await redis.hgetall(`analytics:event_counts:${date}`);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ date, counts }));
    })().catch((e) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    });
    return;
  }

  if (url === "/flush" && method === "POST") {
    void (async () => {
      await flushBuffer();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ flushed: true, bufferRemaining: eventBuffer.length }));
    })().catch((e) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    });
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, () => {
  console.log(`[${service}] listening on :${port}`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    clearInterval(flushTimer);
    await flushBuffer();
    await redis.quit().catch(() => {});
    server.close(() => process.exit(0));
  });
}
