import { createServer } from "node:http";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import Redis from "ioredis";

const service = process.env["SERVICE_NAME"] ?? "payments";
const port = Number(process.env["PORT"] ?? "4105");
const startedAt = new Date().toISOString();
const redisUrl = process.env["REDIS_URL"] ?? "redis://127.0.0.1:6379";

const STRIPE_WEBHOOK_SECRET = process.env["STRIPE_WEBHOOK_SECRET"] ?? "";
const RAZORPAY_WEBHOOK_SECRET = process.env["RAZORPAY_WEBHOOK_SECRET"] ?? "";

const redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });

let webhooksReceived = 0;
let webhooksVerified = 0;
let webhooksFailed = 0;
let purchasesProcessed = 0;
let refundsProcessed = 0;

type WebhookPayload = {
  provider: "stripe" | "razorpay" | "apple_iap" | "google_play";
  eventId: string;
  eventType: string;
  data: Record<string, unknown>;
  signature?: string;
  timestamp?: string;
};

type PurchaseRequest = {
  userId: string;
  coinPackageId: string;
  provider: "stripe" | "razorpay" | "apple_iap" | "google_play";
  providerPaymentId: string;
  amountUsd: number;
  coinsToCredit: number;
  idempotencyKey: string;
};

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

function getRawBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => { raw += chunk; });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function verifyStripeSignature(payload: string, sigHeader: string, secret: string): boolean {
  if (!secret || !sigHeader) return false;
  const parts = sigHeader.split(",").reduce((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k] = v;
    return acc;
  }, {} as Record<string, string>);
  const timestamp = parts["t"];
  const sig = parts["v1"];
  if (!timestamp || !sig) return false;
  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

function verifyRazorpaySignature(payload: string, sigHeader: string, secret: string): boolean {
  if (!secret || !sigHeader) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sigHeader, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

async function checkIdempotency(key: string): Promise<string | null> {
  return redis.get(`idempotency:payment:${key}`);
}

async function setIdempotency(key: string, result: string): Promise<void> {
  await redis.set(`idempotency:payment:${key}`, result, "EX", 86400);
}

async function enqueueWalletCredit(purchase: PurchaseRequest): Promise<{ transactionId: string }> {
  const txnId = randomUUID();
  await redis.lpush("wallet:credit:queue", JSON.stringify({
    transactionId: txnId,
    userId: purchase.userId,
    amount: purchase.coinsToCredit,
    type: "PURCHASE",
    referenceType: "payment",
    referenceId: purchase.providerPaymentId,
    idempotencyKey: purchase.idempotencyKey,
    queuedAt: new Date().toISOString(),
  }));
  return { transactionId: txnId };
}

async function enqueueRefund(data: { userId: string; paymentId: string; amount: number; reason: string }): Promise<{ refundId: string }> {
  const refundId = randomUUID();
  await redis.lpush("wallet:refund:queue", JSON.stringify({
    refundId,
    ...data,
    queuedAt: new Date().toISOString(),
  }));
  refundsProcessed += 1;
  return { refundId };
}

void redis.connect().catch((e) => console.error(`[${service}] Redis connect error`, e));

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  if (url === "/health" && method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      service, status: "ok", startedAt,
      providers: ["stripe", "razorpay", "apple_iap", "google_play"],
      counters: { webhooksReceived, webhooksVerified, webhooksFailed, purchasesProcessed, refundsProcessed },
    }));
    return;
  }

  if (url === "/metrics" && method === "GET") {
    res.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
    res.end([
      `service_uptime_seconds{service="${service}"} ${Math.floor(process.uptime())}`,
      `payment_webhooks_received_total{service="${service}"} ${webhooksReceived}`,
      `payment_webhooks_verified_total{service="${service}"} ${webhooksVerified}`,
      `payment_webhooks_failed_total{service="${service}"} ${webhooksFailed}`,
      `payment_purchases_processed_total{service="${service}"} ${purchasesProcessed}`,
      `payment_refunds_processed_total{service="${service}"} ${refundsProcessed}`,
    ].join("\n") + "\n");
    return;
  }

  if (url === "/webhook/stripe" && method === "POST") {
    void (async () => {
      webhooksReceived += 1;
      const rawBody = await getRawBody(req);
      const sigHeader = req.headers["stripe-signature"] as string ?? "";
      if (!verifyStripeSignature(rawBody, sigHeader, STRIPE_WEBHOOK_SECRET)) {
        webhooksFailed += 1;
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid signature" }));
        return;
      }
      webhooksVerified += 1;
      const event = JSON.parse(rawBody) as { id: string; type: string; data: { object: Record<string, unknown> } };
      const eventKey = `webhook:stripe:${event.id}`;
      const existing = await redis.get(eventKey);
      if (existing) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "already_processed" }));
        return;
      }
      await redis.set(eventKey, "processed", "EX", 604800);
      await redis.lpush("webhook:events:queue", JSON.stringify({
        provider: "stripe", eventId: event.id, eventType: event.type,
        data: event.data.object, receivedAt: new Date().toISOString(),
      }));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ received: true }));
    })().catch((e) => {
      webhooksFailed += 1;
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    });
    return;
  }

  if (url === "/webhook/razorpay" && method === "POST") {
    void (async () => {
      webhooksReceived += 1;
      const rawBody = await getRawBody(req);
      const sigHeader = req.headers["x-razorpay-signature"] as string ?? "";
      if (!verifyRazorpaySignature(rawBody, sigHeader, RAZORPAY_WEBHOOK_SECRET)) {
        webhooksFailed += 1;
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid signature" }));
        return;
      }
      webhooksVerified += 1;
      const event = JSON.parse(rawBody) as { event: string; payload: Record<string, unknown>; };
      const eventId = randomUUID();
      const eventKey = `webhook:razorpay:${eventId}`;
      await redis.set(eventKey, "processed", "EX", 604800);
      await redis.lpush("webhook:events:queue", JSON.stringify({
        provider: "razorpay", eventId, eventType: event.event,
        data: event.payload, receivedAt: new Date().toISOString(),
      }));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ received: true }));
    })().catch((e) => {
      webhooksFailed += 1;
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    });
    return;
  }

  if (url === "/purchase" && method === "POST") {
    void (async () => {
      const body = await parseJsonBody(req) as unknown as PurchaseRequest;
      if (!body.userId || !body.idempotencyKey || !body.provider) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Missing required fields: userId, idempotencyKey, provider" }));
        return;
      }
      const cached = await checkIdempotency(body.idempotencyKey);
      if (cached) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(cached);
        return;
      }
      const result = await enqueueWalletCredit(body);
      purchasesProcessed += 1;
      const response = JSON.stringify({ status: "queued", ...result });
      await setIdempotency(body.idempotencyKey, response);
      res.writeHead(202, { "content-type": "application/json" });
      res.end(response);
    })().catch((e) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    });
    return;
  }

  if (url === "/refund" && method === "POST") {
    void (async () => {
      const body = await parseJsonBody(req) as { userId: string; paymentId: string; amount: number; reason: string };
      if (!body.userId || !body.paymentId) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Missing required fields" }));
        return;
      }
      const result = await enqueueRefund(body);
      res.writeHead(202, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "queued", ...result }));
    })().catch((e) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    });
    return;
  }

  if (url === "/reconcile" && method === "POST") {
    void (async () => {
      const queueLen = await redis.llen("webhook:events:queue");
      const walletQueueLen = await redis.llen("wallet:credit:queue");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        pendingWebhooks: queueLen,
        pendingWalletCredits: walletQueueLen,
        checkedAt: new Date().toISOString(),
      }));
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
