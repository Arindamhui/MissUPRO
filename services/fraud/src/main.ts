import { createServer } from "node:http";

const service = process.env["SERVICE_NAME"] ?? "fraud";
const port = Number(process.env["PORT"] ?? "4106");
const startedAt = new Date().toISOString();
let scored = 0;
let blocked = 0;
let reviewed = 0;

type ScoreInput = {
  userId?: string;
  transactionType?: string;
  amount?: number;
  accountAgeDays?: number;
  priorOpenFlags?: number;
  hourlyTransactionCount?: number;
};

function scoreRisk(input: ScoreInput) {
  const signals: string[] = [];
  let score = 0;

  const amount = Number(input.amount ?? 0);
  const txPerHour = Number(input.hourlyTransactionCount ?? 0);
  const accountAge = Number(input.accountAgeDays ?? 999);
  const priorFlags = Number(input.priorOpenFlags ?? 0);

  if (txPerHour > 30) {
    score += 35;
    signals.push("high_velocity");
  } else if (txPerHour > 15) {
    score += 20;
    signals.push("elevated_velocity");
  }

  if (amount > 500) {
    score += 25;
    signals.push("large_amount");
  }

  if (accountAge < 1) {
    score += 20;
    signals.push("new_account");
  } else if (accountAge < 7) {
    score += 10;
    signals.push("young_account");
  }

  if (priorFlags > 0) {
    score += 20;
    signals.push("existing_flags");
  }

  let action: "allow" | "review" | "block" = "allow";
  if (score >= 70) action = "block";
  else if (score >= 40) action = "review";

  if (action === "block") blocked += 1;
  if (action === "review") reviewed += 1;
  scored += 1;

  return { score, signals, action, threshold: { review: 40, block: 70 } };
}

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

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  if (url === "/health" && method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      service,
      status: "ok",
      startedAt,
      engine: "rule-based-scoring",
      counters: { scored, reviewed, blocked },
    }));
    return;
  }

  if (url === "/metrics" && method === "GET") {
    res.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
    res.end([
      `service_uptime_seconds{service="${service}"} ${Math.floor(process.uptime())}`,
      `fraud_score_requests_total{service="${service}"} ${scored}`,
      `fraud_score_review_total{service="${service}"} ${reviewed}`,
      `fraud_score_block_total{service="${service}"} ${blocked}`,
    ].join("\n") + "\n");
    return;
  }

  if (url === "/score" && method === "POST") {
    void (async () => {
      const payload = await parseJsonBody(req);
      const result = scoreRisk(payload as ScoreInput);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
    })().catch((error) => {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(error) }));
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
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
}
