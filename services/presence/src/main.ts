import { createServer } from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

const service = process.env["SERVICE_NAME"] ?? "presence";
const port = Number(process.env["PORT"] ?? "4103");
const startedAt = new Date().toISOString();
const redisUrl = process.env["REDIS_URL"] ?? "redis://127.0.0.1:6379";
const ttlSeconds = Number(process.env["PRESENCE_TTL_SECONDS"] ?? "90");

let connectedSockets = 0;

const httpServer = createServer(async (req, res) => {
  const url = req.url ?? "/";

  if (url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ service, status: "ok", startedAt, source: "redis-presence" }));
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
    const status = userId ? await dataRedis.get(`presence:${userId}`) : null;
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

const dataRedis = new Redis(redisUrl);
const pubClient = dataRedis.duplicate();
const subClient = dataRedis.duplicate();

io.adapter(createAdapter(pubClient, subClient));

const setOnline = async (userId: string) => {
  await dataRedis.set(`presence:${userId}`, "online", "EX", ttlSeconds);
  io.emit("presence.status_changed", { userId, status: "online" });
};

const setOffline = async (userId: string) => {
  await dataRedis.set(`presence:${userId}`, "offline", "EX", 15);
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
    await dataRedis.set(`presence:${userId}`, "online", "EX", ttlSeconds);
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
    await pubClient.quit();
    await subClient.quit();
    await dataRedis.quit();
    httpServer.close(() => process.exit(0));
  });
}
