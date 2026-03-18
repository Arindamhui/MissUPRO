import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import Redis from "ioredis";

const service = process.env["SERVICE_NAME"] ?? "moderation";
const port = Number(process.env["PORT"] ?? "4109");
const startedAt = new Date().toISOString();
const redisUrl = process.env["REDIS_URL"] ?? "redis://127.0.0.1:6379";

const redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
let loggedRedisUnavailable = false;

redis.on("error", () => undefined);

let scanned = 0;
let flagged = 0;
let passed = 0;
let strikes = 0;
let reportsReceived = 0;

const PROFANITY_PATTERNS = [
  /\b(fuck|shit|damn|ass|bitch|bastard|dick|cock|pussy|cunt)\b/gi,
];
const SPAM_PATTERNS = [
  /(.)\1{5,}/g,
  /(https?:\/\/\S+\s*){3,}/g,
  /\b(buy now|click here|free money|earn cash)\b/gi,
];
const SEVERE_PATTERNS = [
  /\b(kill|murder|bomb|terrorist|suicide)\b/gi,
];

type ScanResult = {
  id: string;
  contentType: "text" | "image" | "video" | "audio";
  status: "PASSED" | "FLAGGED" | "BLOCKED";
  riskScore: number;
  labels: string[];
  action: "allow" | "flag_for_review" | "auto_block";
};

type Report = {
  id: string;
  reporterUserId: string;
  targetType: "user" | "message" | "stream" | "media";
  targetId: string;
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
};

function scanText(content: string): ScanResult {
  const id = randomUUID();
  const labels: string[] = [];
  let riskScore = 0;

  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(content)) {
      labels.push("profanity");
      riskScore += 30;
    }
    pattern.lastIndex = 0;
  }
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      labels.push("spam");
      riskScore += 20;
    }
    pattern.lastIndex = 0;
  }
  for (const pattern of SEVERE_PATTERNS) {
    if (pattern.test(content)) {
      labels.push("severe_content");
      riskScore += 50;
    }
    pattern.lastIndex = 0;
  }

  if (content.length > 2000) {
    labels.push("excessive_length");
    riskScore += 10;
  }

  let status: ScanResult["status"] = "PASSED";
  let action: ScanResult["action"] = "allow";
  if (riskScore >= 60) {
    status = "BLOCKED";
    action = "auto_block";
    flagged += 1;
  } else if (riskScore >= 30) {
    status = "FLAGGED";
    action = "flag_for_review";
    flagged += 1;
  } else {
    passed += 1;
  }
  scanned += 1;

  return { id, contentType: "text", status, riskScore, labels, action };
}

function scanMedia(mediaType: "image" | "video" | "audio"): ScanResult {
  const id = randomUUID();
  scanned += 1;
  passed += 1;
  return {
    id, contentType: mediaType, status: "PASSED",
    riskScore: 0, labels: [], action: "allow",
  };
}

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

void redis.connect().catch(() => {
  if (loggedRedisUnavailable) {
    return;
  }

  loggedRedisUnavailable = true;
  console.warn(`[${service}] Redis unavailable at ${redisUrl}; continuing in degraded mode.`);
});

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  if (url === "/health" && method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      service, status: "ok", startedAt,
      pipeline: "auto-and-human-review",
      counters: { scanned, flagged, passed, strikes, reportsReceived },
    }));
    return;
  }

  if (url === "/metrics" && method === "GET") {
    res.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
    res.end([
      `service_uptime_seconds{service="${service}"} ${Math.floor(process.uptime())}`,
      `moderation_content_scanned_total{service="${service}"} ${scanned}`,
      `moderation_content_flagged_total{service="${service}"} ${flagged}`,
      `moderation_content_passed_total{service="${service}"} ${passed}`,
      `moderation_strikes_issued_total{service="${service}"} ${strikes}`,
      `moderation_reports_received_total{service="${service}"} ${reportsReceived}`,
    ].join("\n") + "\n");
    return;
  }

  if (url === "/scan/text" && method === "POST") {
    void (async () => {
      const body = await parseJsonBody(req);
      const content = String(body["content"] ?? "");
      if (!content) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "content required" }));
        return;
      }
      const result = scanText(content);
      if (result.status === "FLAGGED" || result.status === "BLOCKED") {
        await redis.lpush("moderation:review:queue", JSON.stringify({
          ...result, content: content.slice(0, 500),
          userId: body["userId"], context: body["context"],
          queuedAt: new Date().toISOString(),
        }));
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
    })().catch((e) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    });
    return;
  }

  if (url === "/scan/media" && method === "POST") {
    void (async () => {
      const body = await parseJsonBody(req);
      const mediaType = (body["mediaType"] as "image" | "video" | "audio") ?? "image";
      const result = scanMedia(mediaType);
      await redis.lpush("moderation:media:queue", JSON.stringify({
        ...result, mediaUrl: body["mediaUrl"], userId: body["userId"],
        queuedAt: new Date().toISOString(),
      }));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
    })().catch((e) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    });
    return;
  }

  if (url === "/report" && method === "POST") {
    void (async () => {
      const body = await parseJsonBody(req);
      if (!body["reporterUserId"] || !body["targetId"] || !body["reason"]) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "reporterUserId, targetId, reason required" }));
        return;
      }
      const report: Report = {
        id: randomUUID(),
        reporterUserId: String(body["reporterUserId"]),
        targetType: (body["targetType"] as Report["targetType"]) ?? "user",
        targetId: String(body["targetId"]),
        reason: String(body["reason"]),
        severity: (body["severity"] as Report["severity"]) ?? "medium",
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      reportsReceived += 1;
      await redis.lpush("moderation:reports:queue", JSON.stringify(report));
      res.writeHead(202, { "content-type": "application/json" });
      res.end(JSON.stringify({ accepted: true, reportId: report.id }));
    })().catch((e) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    });
    return;
  }

  if (url === "/strike" && method === "POST") {
    void (async () => {
      const body = await parseJsonBody(req);
      if (!body["userId"] || !body["reason"]) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "userId, reason required" }));
        return;
      }
      const strikeId = randomUUID();
      const strikeKey = `moderation:strikes:${body["userId"]}`;
      const currentStrikes = await redis.incr(strikeKey);
      await redis.expire(strikeKey, 7776000);
      strikes += 1;
      const action = currentStrikes >= 3 ? "suspend" : currentStrikes >= 5 ? "ban" : "warning";
      await redis.lpush("moderation:strikes:log", JSON.stringify({
        strikeId, userId: body["userId"], reason: body["reason"],
        strikeNumber: currentStrikes, action, issuedAt: new Date().toISOString(),
      }));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ strikeId, strikeNumber: currentStrikes, action }));
    })().catch((e) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    });
    return;
  }

  if (url.startsWith("/review-queue") && method === "GET") {
    void (async () => {
      const parsed = new URL(url, `http://127.0.0.1:${port}`);
      const limit = Math.min(50, Number(parsed.searchParams.get("limit") ?? "20"));
      const items = await redis.lrange("moderation:review:queue", 0, limit - 1);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ items: items.map(i => JSON.parse(i)), total: await redis.llen("moderation:review:queue") }));
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
    await redis.quit().catch(() => {});
    server.close(() => process.exit(0));
  });
}
