import { createServer } from "node:http";
import Redis from "ioredis";

const service = process.env["SERVICE_NAME"] ?? "notifications";
const port = Number(process.env["PORT"] ?? "4104");
const startedAt = new Date().toISOString();
const queueKey = process.env["NOTIFICATION_QUEUE_KEY"] ?? "notifications:dispatch:queue";
const dlqKey = process.env["NOTIFICATION_DLQ_KEY"] ?? "notifications:dispatch:dlq";

const redis = new Redis(process.env["REDIS_URL"] ?? "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});
const redisBlocking = new Redis(process.env["REDIS_URL"] ?? "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});
const inMemoryQueue: string[] = [];
const inMemoryDlq: string[] = [];

let processed = 0;
let succeeded = 0;
let failed = 0;
let retried = 0;
let running = true;
let redisReady = false;
let loggedRedisUnavailable = false;

redis.on("ready", () => {
  redisReady = true;
  loggedRedisUnavailable = false;
});
redis.on("close", () => {
  redisReady = false;
});
redis.on("error", () => undefined);
redisBlocking.on("close", () => {
  redisReady = false;
});
redisBlocking.on("error", () => undefined);

type DispatchJob = {
  notificationId?: string;
  userId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channel?: "PUSH" | "IN_APP" | "EMAIL";
  platform?: string;
  token?: string;
  attempt?: number;
  queuedAt?: string;
};

async function parseJsonBody(req: import("node:http").IncomingMessage) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

async function dispatch(job: DispatchJob) {
  // Provider-specific delivery integrations can be plugged in here.
  if (job.channel === "PUSH" && !job.token) {
    throw new Error("Missing push token");
  }
  if (job.token && job.token.startsWith("invalid:")) {
    throw new Error("Token marked invalid");
  }
  return { deliveredAt: new Date().toISOString() };
}

function logRedisUnavailable() {
  if (loggedRedisUnavailable) {
    return;
  }

  loggedRedisUnavailable = true;
  console.warn(`[${service}] Redis unavailable; using in-memory queues for local dev.`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getQueueLength(): Promise<number> {
  if (!redisReady) {
    return inMemoryQueue.length;
  }

  return redis.llen(queueKey);
}

async function getDlqLength(): Promise<number> {
  if (!redisReady) {
    return inMemoryDlq.length;
  }

  return redis.llen(dlqKey);
}

async function pushQueue(payload: string): Promise<void> {
  if (!redisReady) {
    inMemoryQueue.unshift(payload);
    return;
  }

  await redis.lpush(queueKey, payload);
}

async function pushDlq(payload: string): Promise<void> {
  if (!redisReady) {
    inMemoryDlq.unshift(payload);
    return;
  }

  await redis.lpush(dlqKey, payload);
}

async function popDlq(): Promise<string | null> {
  if (!redisReady) {
    return inMemoryDlq.pop() ?? null;
  }

  return redis.rpop(dlqKey);
}

async function popQueue(): Promise<string | null> {
  if (!redisReady) {
    return inMemoryQueue.pop() ?? null;
  }

  const result = await redisBlocking.brpop(queueKey, 5);
  return result?.[1] ?? null;
}

async function ensureRedisConnections(): Promise<boolean> {
  if (redisReady) {
    return true;
  }

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    if (redisBlocking.status !== "ready") {
      await redisBlocking.connect();
    }
    redisReady = true;
    loggedRedisUnavailable = false;
    return true;
  } catch {
    redisReady = false;
    logRedisUnavailable();
    return false;
  }
}

async function handleJob(raw: string) {
  processed += 1;
  let job: DispatchJob;
  try {
    job = JSON.parse(raw) as DispatchJob;
  } catch {
    failed += 1;
    await pushDlq(raw);
    return;
  }

  const attempt = job.attempt ?? 1;
  try {
    await dispatch(job);
    succeeded += 1;
  } catch (error) {
    if (attempt < 3) {
      retried += 1;
      await pushQueue(JSON.stringify({ ...job, attempt: attempt + 1, lastError: String(error) }));
      return;
    }
    failed += 1;
    await pushDlq(JSON.stringify({ ...job, attempt, lastError: String(error), failedAt: new Date().toISOString() }));
  }
}

async function startWorkerLoop() {
  while (running) {
    if (!(await ensureRedisConnections()) && inMemoryQueue.length === 0) {
      await sleep(1_000);
      continue;
    }

    try {
      const payload = await popQueue();
      if (!payload) {
        await sleep(redisReady ? 0 : 250);
        continue;
      }
      await handleJob(payload);
    } catch (error) {
      redisReady = false;
      console.error(`[${service}] worker loop error`, error);
      await sleep(500);
    }
  }
}

void startWorkerLoop().catch((error) => {
  redisReady = false;
  console.error(`[${service}] worker bootstrap error`, error);
});

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  if (url === "/health" && method === "GET") {
    void (async () => {
      const [queued, deadLetter] = await Promise.all([getQueueLength(), getDlqLength()]);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        service,
        status: redisReady ? "ok" : "degraded",
        startedAt,
        queue: { queued, deadLetter },
        counters: { processed, succeeded, failed, retried },
        channels: ["push", "in_app", "email"],
      }));
    })().catch(() => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ service, status: "degraded" }));
    });
    return;
  }

  if (url === "/metrics" && method === "GET") {
    void (async () => {
      const [queued, deadLetter] = await Promise.all([getQueueLength(), getDlqLength()]);
      res.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
      res.end([
        `service_uptime_seconds{service="${service}"} ${Math.floor(process.uptime())}`,
        `notification_jobs_processed_total{service="${service}"} ${processed}`,
        `notification_jobs_succeeded_total{service="${service}"} ${succeeded}`,
        `notification_jobs_failed_total{service="${service}"} ${failed}`,
        `notification_jobs_retried_total{service="${service}"} ${retried}`,
        `notification_queue_depth{service="${service}",queue="dispatch"} ${queued}`,
        `notification_queue_depth{service="${service}",queue="dlq"} ${deadLetter}`,
      ].join("\n") + "\n");
    })().catch(() => {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end("notification_metrics_error 1\n");
    });
    return;
  }

  if (url === "/dispatch" && method === "POST") {
    void (async () => {
      const body = await parseJsonBody(req);
      const job = {
        ...body,
        attempt: 1,
        queuedAt: new Date().toISOString(),
      } as DispatchJob;
      await pushQueue(JSON.stringify(job));
      res.writeHead(202, { "content-type": "application/json" });
      res.end(JSON.stringify({ accepted: true }));
    })().catch((error) => {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ accepted: false, error: String(error) }));
    });
    return;
  }

  if (url.startsWith("/retry-dlq") && method === "POST") {
    void (async () => {
      const parsed = new URL(url, `http://127.0.0.1:${port}`);
      const limit = Math.max(1, Math.min(500, Number(parsed.searchParams.get("limit") ?? "100")));
      let moved = 0;
      for (let i = 0; i < limit; i++) {
        const payload = await popDlq();
        if (!payload) break;
        await pushQueue(payload);
        moved += 1;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ moved }));
    })().catch((error) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ moved: 0, error: String(error) }));
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
    running = false;
    server.close(async () => {
      await Promise.allSettled([
        redis.status === "ready" ? redis.quit() : Promise.resolve("skipped"),
        redisBlocking.status === "ready" ? redisBlocking.quit() : Promise.resolve("skipped"),
      ]);
      process.exit(0);
    });
  });
}
