import { createServer } from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

const service = process.env["SERVICE_NAME"] ?? "presence";
const port = Number(process.env["PORT"] ?? "4103");
const startedAt = new Date().toISOString();
const redisUrl = process.env["REDIS_URL"];
const ttlSeconds = Number(process.env["PRESENCE_TTL_SECONDS"] ?? "90");
const inMemoryPresence = new Map<string, string>();

let connectedSockets = 0;

const httpServer = createServer(async (req, res) => {
  const url = req.url ?? "/";

  if (url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ service, status: "ok", startedAt, source: dataRedis ? "redis-presence" : "in-memory-presence" }));
    return;
  }

  if (url === "/metrics") {
    res.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
    res.end(
      `service_uptime_seconds{service="${service}"} ${Math.floor(process.uptime())}\n` +
      `service_connected_sockets{service="${service}"} ${connectedSockets}\n`,
    );
    return;
  }

  if (url.startsWith("/status/")) {
    const userId = url.replace("/status/", "").trim();
    const status = userId
      ? dataRedis
        ? await dataRedis.get(`presence:${userId}`)
        : inMemoryPresence.get(userId) ?? null
      : null;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ userId, status: status ?? "offline" }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const io = new Server(httpServer, {
  cors: { origin: "*", credentials: true },
  transports: ["websocket", "polling"],
});

const dataRedis = redisUrl ? new Redis(redisUrl) : null;
const pubClient = dataRedis?.duplicate() ?? null;
const subClient = dataRedis?.duplicate() ?? null;

dataRedis?.on("error", () => undefined);
pubClient?.on("error", () => undefined);
subClient?.on("error", () => undefined);

if (pubClient && subClient) {
  io.adapter(createAdapter(pubClient, subClient));
} else {
  console.warn(`[${service}] REDIS_URL not set; using in-memory presence state for local dev.`);
}

const setOnline = async (userId: string) => {
  if (dataRedis) {
    await dataRedis.set(`presence:${userId}`, "online", "EX", ttlSeconds);
  } else {
    inMemoryPresence.set(userId, "online");
  }
  io.emit("presence.status_changed", { userId, status: "online" });
};

const setOffline = async (userId: string) => {
  if (dataRedis) {
    await dataRedis.set(`presence:${userId}`, "offline", "EX", 15);
  } else {
    inMemoryPresence.set(userId, "offline");
  }
  io.emit("presence.status_changed", { userId, status: "offline" });
};

io.on("connection", async (socket) => {
  connectedSockets += 1;
  const userId = String(socket.handshake.auth?.userId ?? "");
  if (!userId) {
    socket.disconnect(true);
    return;
  }

  socket.join(`user:${userId}`);
  await setOnline(userId);

  socket.on("presence.heartbeat", async () => {
    if (dataRedis) {
      await dataRedis.set(`presence:${userId}`, "online", "EX", ttlSeconds);
      return;
    }

    inMemoryPresence.set(userId, "online");
  });

  socket.on("presence.subscribe", (payload: { userIds: string[] }) => {
    if (!Array.isArray(payload?.userIds)) return;
    for (const targetId of payload.userIds) {
      socket.join(`presence:${targetId}`);
    }
  });

  socket.on("disconnect", async () => {
    connectedSockets = Math.max(0, connectedSockets - 1);
    await setOffline(userId);
  });
});

httpServer.listen(port, () => {
  console.log(`[${service}] listening on :${port}`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    await new Promise<void>((resolve) => io.close(() => resolve()));
    await Promise.allSettled([
      pubClient ? pubClient.quit() : Promise.resolve("skipped"),
      subClient ? subClient.quit() : Promise.resolve("skipped"),
      dataRedis ? dataRedis.quit() : Promise.resolve("skipped"),
    ]);
    httpServer.close(() => process.exit(0));
  });
}
